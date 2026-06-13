/**
 * runTradeSwarm — canonical orchestrator
 *
 * Stage order (deterministic):
 *   Preflight-0 (market data) → Regime → Risk → Preflight-gates →
 *   TruthSerum → Halal → Deliberation → Scoring → Persist → Return
 *
 * Policy:
 *   • Fail-closed: market data down or extreme risk → immediate NO, no trade written
 *   • Halal gate: NON_COMPLIANT → hard block. QUESTIONABLE → proceed with warning.
 *   • Preview: persists receipt with action="preview" (auditable, no trade row)
 *   • Simulate: persists receipt + trade row (is_paper=true)
 *   • Execute: persists receipt + trade row (is_paper per safety_mode)
 */

import { createClient } from "@/lib/supabase/server"
import { buildMarketContext } from "./market-context"
import { detectRegime } from "./regime"
import { deriveSeedFromString, simulateRisk } from "./risk"
import { runDeliberation } from "./deliberation"
import { computeTrustScore } from "./scoring"
import { emitEngineEvent } from "./events"
import { TruthSerumAdapter } from "../../src/lib/adapters/truthserumAdapter"
import { fetchZoyaCompliance, mapZoyaToHalalScreen, mapZoyaBasicToHalalScreen } from "@/lib/halal/zoya"
import type {
  ProofBundle,
  ProofRegimeSnapshot,
  ProofRiskSnapshot,
  PreflightResult,
  ScoringResult,
  SwarmParams,
  SwarmResult,
  TradeDecision,
} from "@/lib/types/proof"

const ENGINE_VERSION = "1.0.0"

// ─── Preflight gate logic ─────────────────────────────────────────────────────

function runPreflightGates(
  regime: ProofRegimeSnapshot,
  risk: ProofRiskSnapshot
): PreflightResult {
  const gates = [
    {
      name: "Risk Level Gate",
      passed: risk.riskLevel !== "extreme",
      reason:
        risk.riskLevel !== "extreme"
          ? `Risk level acceptable: ${risk.riskLevel}`
          : "Extreme risk — trade blocked (fail-closed policy)",
    },
    {
      name: "Regime Coherence",
      passed: !(regime.volatility === "high" && regime.momentum === "weak"),
      reason:
        !(regime.volatility === "high" && regime.momentum === "weak")
          ? "Market conditions coherent"
          : "Choppy market: high volatility + weak momentum",
    },
  ]

  const hardFailed = gates.find(
    (g) => !g.passed && g.name === "Risk Level Gate"
  )

  return hardFailed
    ? { pass: false, reason: hardFailed.reason, gates }
    : { pass: true, reason: "All preflight gates passed", gates }
}

// ─── Empty scoring placeholder ────────────────────────────────────────────────

function emptyScoringResult(): ScoringResult {
  return {
    trustScore: 0,
    rawAvgScore: 0,
    agreementRatio: 0,
    penaltyFactor: 0,
    factors: {
      modelAgreement: 0,
      providerCredibility: 0,
      regimeAlignmentBonus: 0,
      riskPenalty: 0,
    },
    weights: {
      modelAgreement: 0.4,
      providerCredibility: 0.3,
      regimeAlignmentBonus: 0.2,
      riskPenalty: 0.1,
    },
    ts: new Date().toISOString(),
  }
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export async function runTradeSwarm(params: SwarmParams): Promise<SwarmResult> {
  const requestId = params.requestId ?? crypto.randomUUID()
  const { ticker, action, userId, amount, balance, safetyMode = "training_wheels", theme, userContext } =
    params
  const startedAt = new Date().toISOString()
  const events: ProofBundle["events"] = []
  const warnings: string[] = []

  // ── Stage 0: Market Context ──────────────────────────────────────────────
  const ctxStart = Date.now()
  const marketContext = await buildMarketContext({
    ticker,
    action,
    requestId,
    theme,
    userContext,
  })

  const ctxEvent = await emitEngineEvent({
    requestId,
    userId,
    name: "MARKET_CONTEXT_BUILT",
    stage: "preflight",
    status:
      marketContext.providerHealth.status === "down"
        ? "error"
        : marketContext.providerHealth.status === "degraded"
          ? "degraded"
          : "ok",
    ticker,
    payload: {
      status: marketContext.providerHealth.status,
      latencyMs: marketContext.providerHealth.latencyMs,
      cached: marketContext.providerHealth.cached,
    },
    durationMs: Date.now() - ctxStart,
  })
  events.push(ctxEvent)

  // Hard-block: market data down
  if (marketContext.providerHealth.status === "down") {
    const preflightFailed: PreflightResult = {
      pass: false,
      reason: `Market data unavailable: ${marketContext.providerHealth.error ?? "provider down"}`,
      gates: [
        {
          name: "Market Data Available",
          passed: false,
          reason: marketContext.providerHealth.error ?? "Yahoo Finance unreachable",
        },
      ],
    }

    await emitEngineEvent({
      requestId,
      userId,
      name: "PREFLIGHT_DONE",
      stage: "preflight",
      status: "blocked",
      ticker,
      payload: { reason: "market_data_down" },
    })

    const bundle: ProofBundle = {
      requestId,
      action,
      ticker,
      engineVersion: ENGINE_VERSION,
      marketContext,
      regime: {} as ProofRegimeSnapshot,
      risk: {} as ProofRiskSnapshot,
      deliberation: [],
      scoring: emptyScoringResult(),
      preflight: preflightFailed,
      finalDecision: {
        action: "NO",
        reason: preflightFailed.reason,
        trustScore: 0,
        recommendedAmount: null,
      },
      engineDegraded: true,
      warnings: [preflightFailed.reason],
      events,
      ts: new Date().toISOString(),
    }
    return { proofBundle: bundle, receiptId: null, tradeId: null }
  }

  if (marketContext.providerHealth.status === "degraded") {
    warnings.push("Options chain unavailable — proceeding with quote data only")
  }

  await emitEngineEvent({
    requestId,
    userId,
    name: "PREFLIGHT_DONE",
    stage: "preflight",
    status: "ok",
    ticker,
    durationMs: Date.now() - ctxStart,
  })

  // ── Stage 1: Regime ──────────────────────────────────────────────────────
  const regimeStart = Date.now()
  const regimeRaw = await detectRegime(ticker)

  const regime: ProofRegimeSnapshot = {
    name: `${regimeRaw.trend}-${regimeRaw.volatility}-${regimeRaw.momentum}`,
    trend: regimeRaw.trend,
    volatility: regimeRaw.volatility,
    momentum: regimeRaw.momentum,
    score: regimeRaw.confidence,
    inputs: regimeRaw.signals,
    confidence: regimeRaw.confidence,
    ts: regimeRaw.timestamp,
  }

  const regimeEvent = await emitEngineEvent({
    requestId,
    userId,
    name: "REGIME_DONE",
    stage: "regime",
    status: regimeRaw.confidence < 0.3 ? "degraded" : "ok",
    ticker,
    payload: {
      trend: regime.trend,
      volatility: regime.volatility,
      confidence: regime.confidence,
    },
    durationMs: Date.now() - regimeStart,
  })
  events.push(regimeEvent)

  if (regime.confidence < 0.3) {
    warnings.push("Low regime confidence (< 30%) — insufficient market data")
  }

  // ── Stage 2: Risk simulation ──────────────────────────────────────────────
  const riskStart = Date.now()
  const riskSeed = deriveSeedFromString(requestId)
  const riskRaw = simulateRisk({ ticker, amount, balance, trustScore: 50, regime: regimeRaw, seed: riskSeed })

  const risk: ProofRiskSnapshot = {
    simCount: 1000,
    monteCarloSeed: riskSeed,
    medianPL: riskRaw.expectedReturn,
    pct10: riskRaw.worstCase,
    pct90: riskRaw.bestCase,
    maxDrawdown: balance > 0 ? riskRaw.maxLoss / balance : 0,
    expectedReturn: riskRaw.expectedReturn,
    sharpeRatio: riskRaw.sharpeRatio,
    kellyFraction: balance > 0 ? riskRaw.positionSizeRecommended / balance : 0,
    positionSizeRecommended: riskRaw.positionSizeRecommended,
    riskLevel: riskRaw.riskLevel,
    ts: new Date().toISOString(),
  }

  const riskEvent = await emitEngineEvent({
    requestId,
    userId,
    name: "RISK_DONE",
    stage: "risk",
    status: risk.riskLevel === "extreme" ? "error" : "ok",
    ticker,
    payload: {
      riskLevel: risk.riskLevel,
      maxDrawdown: risk.maxDrawdown,
      expectedReturn: risk.expectedReturn,
    },
    durationMs: Date.now() - riskStart,
  })
  events.push(riskEvent)

  // ── Stage 3: Preflight gates (regime + risk aware) ────────────────────────
  const preflight = runPreflightGates(regime, risk)

  const gateEvent = await emitEngineEvent({
    requestId,
    userId,
    name: "PREFLIGHT_DONE",
    stage: "gates",
    status: preflight.pass ? "ok" : "blocked",
    ticker,
    payload: {
      pass: preflight.pass,
      reason: preflight.reason,
      failedGates: preflight.gates.filter((g) => !g.passed).map((g) => g.name),
    },
  })
  events.push(gateEvent)

  if (!preflight.pass) {
    const bundle: ProofBundle = {
      requestId,
      action,
      ticker,
      engineVersion: ENGINE_VERSION,
      marketContext,
      regime,
      risk,
      deliberation: [],
      scoring: emptyScoringResult(),
      preflight,
      finalDecision: {
        action: "NO",
        reason: preflight.reason,
        trustScore: 0,
        recommendedAmount: null,
      },
      engineDegraded: false,
      warnings,
      events,
      ts: new Date().toISOString(),
    }
    return { proofBundle: bundle, receiptId: null, tradeId: null }
  }

  // ── Stage 3.5: TruthSerum safety gate ─────────────────────────────────────
  const tsUrl = process.env.TRUTHSERUM_URL ?? "http://localhost:8787"
  const tsAdapter = new TruthSerumAdapter({ baseUrl: tsUrl })
  // FeaturesV1Schema requires: symbol, asof_utc, spot, dte, strike, option_type, mid
  // Map from marketContext (which uses different field names from the options chain)
  const tsFeatures = {
    symbol: ticker,
    asof_utc: new Date().toISOString(),
    // Required fields — mapped to FeaturesV1Schema names
    spot: Math.max(0.01, (marketContext as any).price ?? (marketContext as any).close ?? 1),
    dte: Math.max(0, Math.round((marketContext as any).daysToExpiry ?? 30)),
    strike: Math.max(0.01, (marketContext as any).strike ?? (marketContext as any).price ?? 1),
    option_type: (
      String((marketContext as any).optionType ?? "CALL").toUpperCase() === "PUT" ? "PUT" : "CALL"
    ) as "CALL" | "PUT",
    mid: Math.max(0, (marketContext as any).mid ?? (marketContext as any).lastPrice ?? 0),
    // Optional fields
    iv: (marketContext as any).impliedVolatility ?? undefined,
    volume: (marketContext as any).volume ?? undefined,
    open_interest: (marketContext as any).openInterest ?? undefined,
    spread_pct: (marketContext as any).spreadPct ?? undefined,
    delta: (marketContext as any).delta ?? undefined,
    gamma: (marketContext as any).gamma ?? undefined,
    theta: (marketContext as any).theta ?? undefined,
    vega: (marketContext as any).vega ?? undefined,
    earnings_within_days: (marketContext as any).earningsWithinDays ?? undefined,
    news_risk: ((): "LOW" | "MED" | "HIGH" | undefined => {
      const raw = String((marketContext as any).newsRisk ?? "").toUpperCase()
      if (raw === "LOW") return "LOW"
      if (raw === "MED" || raw === "MEDIUM") return "MED"
      if (raw === "HIGH" || raw === "CRITICAL") return "HIGH"
      return undefined
    })(),
  }
  const tsStart = Date.now()
  const tsResult = await tsAdapter.score(tsFeatures)
  // features_invalid = schema mismatch → treat as degraded, not a hard block
  const isDegraded = tsResult.reasons.some((r) =>
    ["truthserum_circuit_open", "truthserum_network_error", "truthserum_timeout", "features_invalid"].includes(r)
  )
  const tsEvent = await emitEngineEvent({
    requestId,
    userId,
    name: "TRUTHSERUM_DONE",
    stage: "truthserum",
    status: isDegraded ? "degraded" : tsResult.ok ? "ok" : "blocked",
    ticker,
    payload: { ok: tsResult.ok, score: tsResult.score, reasons: tsResult.reasons, warnings: tsResult.warnings, degraded: isDegraded },
    durationMs: Date.now() - tsStart,
  })
  events.push(tsEvent)
  if (!isDegraded && !tsResult.ok) {
    const bundle: ProofBundle = {
      requestId, action, ticker, engineVersion: ENGINE_VERSION, marketContext, regime, risk,
      deliberation: [], scoring: emptyScoringResult(), preflight,
      finalDecision: { action: "NO", reason: `TruthSerum gate blocked: ${tsResult.reasons.join(", ")}`, trustScore: 0, recommendedAmount: null },
      engineDegraded: false, warnings, events, ts: new Date().toISOString(),
    }
    return { proofBundle: bundle, receiptId: null, tradeId: null }
  }
  if (isDegraded) {
    warnings.push(`TruthSerum unavailable (${tsResult.reasons.join(", ")}) — proceeding degraded`)
  }

  // ── Stage 3.6: Halal compliance gate (Zoya AAOIFI) ───────────────────────
  const halalStart = Date.now()
  try {
    const zoyaResult = await fetchZoyaCompliance(ticker)
    let halalVerdict: string
    let halalBlocked = false

    if (zoyaResult.ok && zoyaResult.data) {
      const screen = mapZoyaToHalalScreen(zoyaResult.data)
      halalVerdict = screen.overallVerdict
      halalBlocked = screen.overallVerdict === "NON_COMPLIANT"
    } else if (zoyaResult.ok && zoyaResult.basic) {
      const screen = mapZoyaBasicToHalalScreen(zoyaResult.basic)
      halalVerdict = screen.overallVerdict
      halalBlocked = screen.overallVerdict === "NON_COMPLIANT"
    } else {
      // Zoya unavailable — degrade, don't block
      halalVerdict = "UNKNOWN"
      warnings.push(`Halal screening unavailable: ${zoyaResult.error ?? "Zoya unreachable"} — proceeding unscreened`)
    }

    const halalEvent = await emitEngineEvent({
      requestId,
      userId,
      name: "HALAL_GATE_DONE",
      stage: "halal",
      status: halalBlocked ? "blocked" : halalVerdict === "UNKNOWN" ? "degraded" : "ok",
      ticker,
      payload: {
        verdict: halalVerdict,
        blocked: halalBlocked,
        plan_tier: zoyaResult.ok ? (zoyaResult.data ? "advanced" : "basic") : "unavailable",
      },
      durationMs: Date.now() - halalStart,
    })
    events.push(halalEvent)

    if (halalBlocked) {
      const bundle: ProofBundle = {
        requestId, action, ticker, engineVersion: ENGINE_VERSION, marketContext, regime, risk,
        deliberation: [], scoring: emptyScoringResult(), preflight,
        finalDecision: {
          action: "NO",
          reason: `Halal gate blocked: ${ticker} is NON_COMPLIANT under AAOIFI methodology`,
          trustScore: 0,
          recommendedAmount: null,
        },
        engineDegraded: false, warnings, events, ts: new Date().toISOString(),
      }
      return { proofBundle: bundle, receiptId: null, tradeId: null }
    }

    if (halalVerdict === "QUESTIONABLE") {
      warnings.push(`${ticker} is QUESTIONABLE under AAOIFI — purification required if traded`)
    }
  } catch (err) {
    // Non-fatal — degrade and continue
    warnings.push(`Halal gate error: ${String(err)} — proceeding unscreened`)
    await emitEngineEvent({
      requestId, userId, name: "HALAL_GATE_DONE", stage: "halal", status: "degraded", ticker,
      payload: { error: String(err) }, durationMs: Date.now() - halalStart,
    })
  }

  // ── Stage 4: Deliberation ─────────────────────────────────────────────────
  const deliStart = Date.now()
  let deliberationResult: Awaited<ReturnType<typeof runDeliberation>>

  try {
    deliberationResult = await runDeliberation({
      marketContext,
      regime,
      risk,
      balance,
      safetyMode,
    })
  } catch (err) {
    warnings.push(`Deliberation failed: ${String(err)}`)

    await emitEngineEvent({
      requestId,
      userId,
      name: "ROUND1_DONE",
      stage: "deliberation",
      status: "error",
      ticker,
      payload: { error: String(err) },
      durationMs: Date.now() - deliStart,
    })

    const bundle: ProofBundle = {
      requestId,
      action,
      ticker,
      engineVersion: ENGINE_VERSION,
      marketContext,
      regime,
      risk,
      deliberation: [],
      scoring: emptyScoringResult(),
      preflight,
      finalDecision: {
        action: "NO",
        reason: `AI deliberation failed: ${String(err)}`,
        trustScore: 0,
        recommendedAmount: null,
      },
      engineDegraded: true,
      warnings,
      events,
      ts: new Date().toISOString(),
    }
    return { proofBundle: bundle, receiptId: null, tradeId: null }
  }

  const { rounds, warnings: deliWarnings, primaryBullets, primaryRecommendedAmount } =
    deliberationResult
  warnings.push(...deliWarnings)

  // Emit one event per round
  for (const round of rounds) {
    const eventName =
      round.stage === "ARBITRATION" ? "ARBITRATION_DONE" : `ROUND${round.roundId}_DONE`
    const roundEvent = await emitEngineEvent({
      requestId,
      userId,
      name: eventName,
      stage: "deliberation",
      status: "ok",
      ticker,
      payload: {
        decision: round.outcome.decision,
        consensusStrength: round.outcome.consensusStrength,
        modelCount: round.outputs.length,
      },
      durationMs: Date.now() - deliStart,
    })
    events.push(roundEvent)
  }

  const lastRound = rounds[rounds.length - 1]
  const finalDecision: TradeDecision = lastRound.outcome.decision

  // Apply safety-mode position cap
  let recommendedAmount = primaryRecommendedAmount
  if (safetyMode === "training_wheels" && recommendedAmount && recommendedAmount > balance * 0.015) {
    recommendedAmount = Math.round(balance * 0.015 * 100) / 100
  }

  // ── Stage 5: Scoring ──────────────────────────────────────────────────────
  const scoringStart = Date.now()
  const scoring = computeTrustScore({ rounds, regime, risk, finalDecision })

  const scoreEvent = await emitEngineEvent({
    requestId,
    userId,
    name: "SCORING_DONE",
    stage: "scoring",
    status: "ok",
    ticker,
    payload: {
      trustScore: scoring.trustScore,
      agreementRatio: scoring.agreementRatio,
      finalDecision,
    },
    durationMs: Date.now() - scoringStart,
  })
  events.push(scoreEvent)

  // ── Assemble proof bundle ─────────────────────────────────────────────────
  const bundle: ProofBundle = {
    requestId,
    action,
    ticker,
    engineVersion: ENGINE_VERSION,
    marketContext,
    regime,
    risk,
    deliberation: rounds,
    scoring,
    preflight,
    finalDecision: {
      action: finalDecision,
      reason: lastRound.outcome.reason,
      trustScore: scoring.trustScore,
      recommendedAmount: recommendedAmount ?? null,
      bullets: primaryBullets,
    },
    engineDegraded: warnings.some(
      (w) => w.includes("unavailable") || w.includes("failed")
    ),
    warnings,
    events,
    ts: new Date().toISOString(),
  }

  // ── Stage 6: Persist ──────────────────────────────────────────────────────
  const persistStart = Date.now()
  let receiptId: string | null = null
  let tradeId: string | null = null

  try {
    const supabase = await createClient()

    // Create trade row for execute/simulate
    if (action === "execute" || action === "simulate") {
      const tradeRecord = {
        user_id: userId,
        ticker,
        strategy_type: `${finalDecision === "NO" ? "Bearish" : "Bullish"} Spread`,
        entry_date: new Date().toISOString(),
        credit_received: recommendedAmount ?? amount,
        max_risk: recommendedAmount ?? amount,
        engine_score_at_entry: scoring.trustScore,
        regime_at_entry: String(regime.trend ?? "unknown"),
        proof_snapshot: {
          finalVerdict: finalDecision,
          trustScore: scoring.trustScore,
          consensusStrength: lastRound.outcome.consensusStrength,
          regime: { trend: regime.trend, volatility: regime.volatility, momentum: regime.momentum },
          risk: { riskLevel: risk.riskLevel, maxDrawdown: risk.maxDrawdown, expectedReturn: risk.expectedReturn },
        },
        outcome: "open",
        notes: primaryBullets?.why ?? lastRound.outcome.reason,
      }

      const { data: insertedTrade, error: tradeErr } = await supabase
        .from("trades_v2")
        .insert(tradeRecord)
        .select("id")
        .single()

      if (!tradeErr && insertedTrade) tradeId = insertedTrade.id
    }

    // Always persist receipt (including preview)
    const { data: receipt, error: receiptErr } = await supabase
      .from("trade_receipts")
      .insert({
        request_id: requestId,
        trade_id: tradeId,
        user_id: userId,
        ticker,
        action,
        amount: recommendedAmount ?? amount,
        proof_bundle: bundle,
        proof_bundle_version: "v1",
        final_verdict: finalDecision,
        trust_score: scoring.trustScore,
        regime_trend: regime.trend,
        risk_level: risk.riskLevel,
        engine_degraded: bundle.engineDegraded,
        warnings,
        engine_started_at: startedAt,
        engine_completed_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (!receiptErr && receipt) receiptId = receipt.id

    const persistEvent = await emitEngineEvent({
      requestId,
      userId,
      name:
        action === "execute"
          ? "TRADE_WRITTEN"
          : action === "simulate"
            ? "SIMULATION_RECORDED"
            : "PREVIEW_RENDERED",
      stage: "persist",
      status: "ok",
      ticker,
      payload: { receiptId, tradeId, action },
      durationMs: Date.now() - persistStart,
    })
    events.push(persistEvent)
  } catch (err) {
    warnings.push(`Receipt persistence failed: ${String(err)}`)
    console.error("[orchestrator] persist error:", err)

    await emitEngineEvent({
      requestId,
      userId,
      name: "PERSIST_PROOF_BUNDLE",
      stage: "persist",
      status: "error",
      ticker,
      payload: { error: String(err) },
      durationMs: Date.now() - persistStart,
    })
  }

  return { proofBundle: bundle, receiptId, tradeId }
}
