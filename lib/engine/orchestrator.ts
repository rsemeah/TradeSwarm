/**
 * runTradeSwarm — canonical orchestrator
 *
 * Stage order (deterministic):
 *   Preflight-0 (market data) → Regime → Risk → Preflight-gates →
 *   Deliberation → Scoring → Persist → Return
 *
 * Policy:
 *   • Fail-closed: market data down or extreme risk → immediate NO, no trade written
 *   • Preview: persists receipt with action="preview" (auditable, no trade row)
 *   • Simulate: persists receipt + trade row (is_paper=true)
 *   • Execute: persists receipt + trade row (is_paper per safety_mode)
 */

import { createClient } from "@/lib/supabase/server"
import { buildMarketContext } from "./market-context"
import { detectRegime } from "./regime"
import { simulateRisk } from "./risk"
import { runDeliberation } from "./deliberation"
import { computeTrustScore } from "./scoring"
import { emitEngineEvent } from "./events"
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
  const riskRaw = simulateRisk({ ticker, amount, balance, trustScore: 50, regime: regimeRaw })

  const risk: ProofRiskSnapshot = {
    simCount: 1000,
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
      recommendedAmount,
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
        strategy: `${finalDecision === "NO" ? "Bearish" : "Bullish"} Spread`,
        action,
        amount: recommendedAmount ?? amount,
        trust_score: scoring.trustScore,
        status: finalDecision,
        is_paper: safetyMode === "training_wheels" || action === "simulate",
        reasoning: primaryBullets?.why ?? lastRound.outcome.reason,
        ai_consensus: {
          finalVerdict: finalDecision,
          trustScore: scoring.trustScore,
          consensusStrength: lastRound.outcome.consensusStrength,
        },
        regime_data: {
          trend: regime.trend,
          volatility: regime.volatility,
          momentum: regime.momentum,
        },
        risk_data: {
          riskLevel: risk.riskLevel,
          maxDrawdown: risk.maxDrawdown,
          expectedReturn: risk.expectedReturn,
        },
      }

      const { data: insertedTrade, error: tradeErr } = await supabase
        .from("trades")
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
