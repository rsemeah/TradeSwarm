import { createClient } from "@/lib/supabase/server"
import { BrokerRouter } from "@/lib/broker/brokerRouter"
import { computeCapitalSize, type CapitalPolicy, type ConfidenceTier } from "@/lib/capital/sizing"
import { evaluateCapitalGate } from "@/lib/capital/policyGate"
import { hashDeterministic } from "@/lib/engine/determinism"
import { runTradeSwarm } from "@/lib/engine/orchestrator"
import { evaluateSafety } from "@/lib/engine/safety"
import { buildMarketSnapshot } from "@/lib/market/snapshot"
import { shouldAllowExecute } from "@/lib/risk/executionGuard"
import type { ProofBundle } from "@/lib/types/proof"
import type { CanonicalProofBundle, ModelRound, SafetyDecision } from "@/lib/types/proof-bundle"

export type CanonicalMode = "preview" | "simulate" | "execute"

interface CanonicalTradeInput {
  mode: CanonicalMode
  ticker: string
  userId: string
  amount: number
  balance: number
  safetyMode: string
  theme?: string
  userContext?: string
}

interface CanonicalTradeResult {
  proofBundle: CanonicalProofBundle
  legacyProofBundle: ProofBundle
  receiptId: string | null
  tradeId: string | null
  blocked: boolean
}

interface PersistedMarketSnapshot {
  snapshotId: string | null
  contentHash: string
}

interface CapitalPolicyRow {
  confidence_tiers?: Record<string, number>
  kelly_fraction_cap?: number
  hard_cap_dollars?: number
  drift_warn_throttle?: number
  drawdown_brake_floor?: number
  daily_loss_limit_total?: number
  max_trades_per_day?: number
  feed_staleness_max_sec?: number
  kill_switch_active?: boolean
}


interface NormalizedCapitalPolicy extends CapitalPolicy {
  drift_warn_throttle: number
  drawdown_brake_floor: number
  daily_loss_limit_total: number
  max_trades_per_day: number
  feed_staleness_max_sec: number
  kill_switch_active: boolean
}
function buildModelRounds(bundle: ProofBundle): ModelRound[] {
  return bundle.deliberation.map((round) => ({
    round_id: String(round.roundId),
    stage: round.stage,
    providers: round.outputs.map((output) => ({
      provider: output.provider,
      model_version: output.modelVersion,
      decision: output.decision,
      confidence: output.confidence,
      reasoning: output.reasoning,
    })),
    outcome: {
      decision: round.outcome.decision,
      reason: round.outcome.reason,
      consensus_strength: round.outcome.consensusStrength,
    },
    ts: round.ts,
  }))
}

function deriveSafetyDecision(bundle: ProofBundle, amount: number, balance: number, mode: CanonicalMode): SafetyDecision {
  const safety = evaluateSafety({
    bankroll: balance,
    proposedNotional: bundle.finalDecision.recommendedAmount ?? amount,
    spreadPct: 0,
    optionVolume24h: 1_000,
    optionOpenInterest: 1_000,
    underlyingVolume24h: bundle.marketContext.quote?.volume ?? 0,
    estimatedSlippagePct: 0,
    isInEarningsBlackout: false,
    truthSerumAvailable: !bundle.engineDegraded,
    mode,
  })

  const hardBlock =
    !bundle.preflight.pass ||
    bundle.finalDecision.action === "NO" ||
    !safety.allowed ||
    (mode === "execute" && bundle.regime.volatility === "high" && bundle.regime.momentum === "weak") ||
    (mode === "execute" && (bundle.risk.positionSizeRecommended ?? 0) > safety.maxSizeHint)

  return {
    safety_status: hardBlock ? "BLOCKED" : "ALLOWED",
    reason_code: hardBlock
      ? !bundle.preflight.pass
        ? "PREFLIGHT_BLOCKED"
        : !safety.allowed
          ? "SAFETY_THRESHOLD_FAILED"
          : mode === "execute" && bundle.regime.volatility === "high" && bundle.regime.momentum === "weak"
            ? "REGIME_DISALLOWS_EXECUTE"
            : mode === "execute" && (bundle.risk.positionSizeRecommended ?? 0) > safety.maxSizeHint
              ? "RISK_CAP_EXCEEDED"
              : "FINAL_DECISION_BLOCKED"
      : null,
    reasons: hardBlock ? [...bundle.preflight.gates.filter((g) => !g.passed).map((g) => g.reason), ...safety.reasons] : [],
    max_size_hint: safety.maxSizeHint,
  }
}

function buildCanonicalProofBundle(bundle: ProofBundle, input: CanonicalTradeInput): CanonicalProofBundle {
  const modelRounds = buildModelRounds(bundle)
  const firstOutput = modelRounds[0]?.providers[0]
  const safetyDecision = deriveSafetyDecision(bundle, input.amount, input.balance, input.mode)

  const normalizedInputSnapshot = {
    ticker: input.ticker,
    requested_amount: input.amount,
    balance: input.balance,
    safety_mode: input.safetyMode,
    theme: input.theme,
    user_context: input.userContext,
  }

  const normalizedMarketSnapshot = {
    quote: bundle.marketContext.quote,
    chain: bundle.marketContext.chain,
    provider_health: bundle.marketContext.providerHealth,
    as_of: bundle.marketContext.ts,
    source: "orchestrator.marketContext",
    latency_ms: undefined,
  }

  const marketSnapshotHash = hashDeterministic(normalizedMarketSnapshot)
  const configHash = hashDeterministic({
    execution_mode: input.mode,
    safety_mode: input.safetyMode,
    theme: input.theme,
  })
  const randomSeed = Number.isFinite(bundle.risk.monteCarloSeed) ? bundle.risk.monteCarloSeed : null
  const determinismHash = hashDeterministic({
    input_snapshot: normalizedInputSnapshot,
    market_snapshot_hash: marketSnapshotHash,
    engine_version: bundle.engineVersion,
    config_hash: configHash,
    random_seed: randomSeed,
  })

  return {
    version: "v2",
    model_provider: firstOutput?.provider ?? "unknown",
    model_version: firstOutput?.model_version ?? "unknown",
    regime_snapshot: bundle.regime as unknown as Record<string, unknown>,
    risk_snapshot: bundle.risk as unknown as Record<string, unknown>,
    safety_decision: safetyDecision,
    model_rounds: modelRounds,
    consensus_score: modelRounds[modelRounds.length - 1]?.outcome.consensus_strength ?? 0,
    trust_score: bundle.finalDecision.trustScore,
    execution_mode: input.mode,
    timestamp: bundle.ts,
    input_snapshot: normalizedInputSnapshot,
    market_snapshot: normalizedMarketSnapshot,
    metadata: {
      request_id: bundle.requestId,
      engine_version: bundle.engineVersion,
      warnings: bundle.warnings,
      safety_status: safetyDecision.safety_status,
      reason_code: safetyDecision.reason_code,
      determinism: {
        market_snapshot_ref: null,
        market_snapshot_hash: marketSnapshotHash,
        engine_version: bundle.engineVersion,
        config_hash: configHash,
        determinism_hash: determinismHash,
        random_seed: randomSeed,
        monte_carlo_seed: randomSeed,
      },
    },
  }
}

function deriveDriftState(canonicalBundle: CanonicalProofBundle): "OK" | "WARN" | "ALERT" {
  const warnings = canonicalBundle.metadata?.warnings ?? []
  const warningBlob = warnings.join(" ").toLowerCase()
  if (warningBlob.includes("drift_alert") || warningBlob.includes("drift alert")) return "ALERT"
  if (warningBlob.includes("drift_warn") || warningBlob.includes("drift warn")) return "WARN"
  return "OK"
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeCapitalPolicy(row: CapitalPolicyRow | null | undefined): NormalizedCapitalPolicy {
  return {
    confidence_tiers: {
      high: toNumber(row?.confidence_tiers?.high, 1),
      medium: toNumber(row?.confidence_tiers?.medium, 0.7),
      low: toNumber(row?.confidence_tiers?.low, 0.4),
    },
    kelly_fraction_cap: toNumber(row?.kelly_fraction_cap, 0.25),
    hard_cap_dollars: toNumber(row?.hard_cap_dollars, 500),
    drift_warn_throttle: toNumber(row?.drift_warn_throttle, 0.6),
    drawdown_brake_floor: toNumber(row?.drawdown_brake_floor, 0),
    daily_loss_limit_total: toNumber(row?.daily_loss_limit_total, 500),
    max_trades_per_day: toNumber(row?.max_trades_per_day, 10),
    feed_staleness_max_sec: toNumber(row?.feed_staleness_max_sec, 120),
    kill_switch_active: Boolean(row?.kill_switch_active),
  }
}

function confidenceTierFromTrust(trustScore: number): ConfidenceTier {
  if (trustScore >= 85) return "high"
  if (trustScore >= 65) return "medium"
  return "low"
}

async function logGovernanceEvent(reason: string, metrics: Record<string, unknown>): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from("model_governance_log").insert({
      previous_version: null,
      new_version: null,
      change_summary: `execution_guard_blocked:${reason}`,
      triggered_by: "execution_guard",
      metrics_snapshot: metrics,
    })
  } catch (error) {
    console.warn("Failed to write governance log", error)
  }
}

async function persistMarketSnapshot(canonicalBundle: CanonicalProofBundle): Promise<PersistedMarketSnapshot> {
  const supabase = await createClient()
  const built = buildMarketSnapshot(
    String(canonicalBundle.market_snapshot.source ?? "unknown"),
    canonicalBundle.market_snapshot.as_of,
    1,
    canonicalBundle.market_snapshot as unknown as Record<string, unknown>,
  )

  const payload = {
    snapshot_hash: built.snapshotHash,
    provider: built.provider,
    schema_version: built.schemaVersion,
    as_of: built.asOf,
    payload: built.payload,
  }

  const { data, error } = await supabase
    .from("market_snapshots")
    .upsert(payload, { onConflict: "snapshot_hash", ignoreDuplicates: false })
    .select("id")
    .single()

  if (error) {
    return { snapshotId: null, contentHash: built.snapshotHash }
  }

  return { snapshotId: data.id as string, contentHash: built.snapshotHash }
}

async function applyCapitalAndExecutionGuards(input: CanonicalTradeInput, canonicalBundle: CanonicalProofBundle): Promise<{ blocked: boolean; reason?: string }> {
  if (input.mode !== "execute") return { blocked: false }

  const supabase = await createClient()
  const [policyResult, tradesTodayResult] = await Promise.all([
    supabase
      .from("capital_policy")
      .select("confidence_tiers,kelly_fraction_cap,hard_cap_dollars,drift_warn_throttle,drawdown_brake_floor,daily_loss_limit_total,max_trades_per_day,feed_staleness_max_sec,kill_switch_active")
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.userId)
      .gte("created_at", `${new Date().toISOString().slice(0, 10)}T00:00:00`),
  ])

  const policy = normalizeCapitalPolicy(policyResult.data)
  const driftState = deriveDriftState(canonicalBundle)
  const feedAgeSec = Math.max(0, Math.floor((Date.now() - Date.parse(canonicalBundle.market_snapshot.as_of)) / 1000))

  const capitalGate = evaluateCapitalGate({
    driftState,
    drawdownBrake: policy.drawdown_brake_floor,
    driftWarnThrottle: policy.drift_warn_throttle,
  })

  if (!capitalGate.allowed) {
    await logGovernanceEvent(capitalGate.reason ?? "capital_gate_blocked", { driftState, feedAgeSec })
    return { blocked: true, reason: capitalGate.reason }
  }

  const brokerMode = process.env.BROKER_MODE === "live" ? "live" : "paper"
  const brokerRouter = new BrokerRouter()
  const brokerHealth = await brokerRouter.healthCheck(brokerMode === "live" ? "schwab" : "paper")

  const guard = shouldAllowExecute({
    killSwitch: { active: policy.kill_switch_active },
    driftState,
    drawdownBrake: policy.drawdown_brake_floor,
    feedAgeSec,
    feedStalenessMaxSec: policy.feed_staleness_max_sec,
    dailyLossTotal: 0,
    dailyLossLimitTotal: policy.daily_loss_limit_total,
    tradesToday: tradesTodayResult.count ?? 0,
    maxTradesPerDay: policy.max_trades_per_day,
    brokerHealthOk: brokerHealth.ok,
    brokerMode,
  })

  if (!guard.allowed) {
    await logGovernanceEvent(guard.reason ?? "execution_guard_blocked", {
      driftState,
      feedAgeSec,
      tradesToday: tradesTodayResult.count ?? 0,
      brokerMode,
    })
    return { blocked: true, reason: guard.reason }
  }

  const confidenceTier = confidenceTierFromTrust(canonicalBundle.trust_score)
  const capital = computeCapitalSize(
    {
      balance: input.balance,
      edge: Math.max(1, Math.abs(toNumber((canonicalBundle.risk_snapshot as { sharpeRatio?: number }).sharpeRatio, 1))),
      winProbability: Math.min(0.95, Math.max(0.05, canonicalBundle.trust_score / 100)),
      confidenceTier,
      throttleMultiplier: guard.throttleMultiplier,
    },
    policy,
  )

  canonicalBundle.capital = {
    kelly_fraction: capital.kellyFractionCapped,
    confidence_tier: confidenceTier,
    throttle_multiplier: capital.throttleMultiplier,
    recommended_size: capital.recommendedSize,
    hard_capped: capital.hardCapped,
  }

  if (canonicalBundle.metadata?.determinism) {
    canonicalBundle.metadata.determinism.determinism_hash = hashDeterministic({
      input_snapshot: canonicalBundle.input_snapshot,
      market_snapshot_hash: canonicalBundle.metadata.determinism.market_snapshot_hash,
      engine_version: canonicalBundle.metadata.determinism.engine_version,
      config_hash: canonicalBundle.metadata.determinism.config_hash,
      random_seed: canonicalBundle.metadata.determinism.random_seed,
      capital: canonicalBundle.capital,
    })
  }

  return { blocked: false }
}

async function persistCanonical(input: CanonicalTradeInput, canonicalBundle: CanonicalProofBundle): Promise<{ receiptId: string | null; tradeId: string | null }> {
  const supabase = await createClient()
  const persistedSnapshot = await persistMarketSnapshot(canonicalBundle)

  canonicalBundle.market_snapshot_hash = persistedSnapshot.contentHash

  if (canonicalBundle.metadata?.determinism) {
    canonicalBundle.metadata.determinism.market_snapshot_ref = persistedSnapshot.snapshotId
    canonicalBundle.metadata.determinism.market_snapshot_hash = persistedSnapshot.contentHash
    canonicalBundle.metadata.determinism.determinism_hash = hashDeterministic({
      input_snapshot: canonicalBundle.input_snapshot,
      market_snapshot_hash: persistedSnapshot.contentHash,
      engine_version: canonicalBundle.metadata.determinism.engine_version,
      config_hash: canonicalBundle.metadata.determinism.config_hash,
      random_seed: canonicalBundle.metadata.determinism.random_seed,
      monte_carlo_seed: canonicalBundle.metadata.determinism.random_seed,
      capital: canonicalBundle.capital,
    })
  }

  let tradeId: string | null = null
  if (input.mode !== "preview" && canonicalBundle.safety_decision.safety_status === "ALLOWED") {
    const { data: insertedTrade, error: tradeError } = await supabase
      .from("trades")
      .insert({
        user_id: input.userId,
        ticker: input.ticker,
        strategy: "options_spread",
        action: input.mode,
        status: input.mode === "execute" ? "executed" : "simulated",
        amount: canonicalBundle.capital?.recommended_size ?? canonicalBundle.input_snapshot.requested_amount,
        trust_score: canonicalBundle.trust_score,
        rationale: canonicalBundle.model_rounds[canonicalBundle.model_rounds.length - 1]?.outcome.reason ?? null,
        ai_consensus: {
          consensus_score: canonicalBundle.consensus_score,
          model_provider: canonicalBundle.model_provider,
          model_version: canonicalBundle.model_version,
        },
        regime_data: canonicalBundle.regime_snapshot,
        risk_data: canonicalBundle.risk_snapshot,
      })
      .select("id")
      .single()

    if (tradeError) {
      throw new Error(`Failed to persist trade: ${tradeError.message}`)
    }

    tradeId = insertedTrade.id as string

    if (input.mode === "execute") {
      const brokerMode = process.env.BROKER_MODE === "live" ? "live" : "paper"
      const brokerProvider = brokerMode === "live" ? "schwab" : "paper"
      const brokerRouter = new BrokerRouter()
      const orderIntent = {
        tradeId,
        symbol: input.ticker,
        side: "buy" as const,
        quantity: 1,
        orderType: "market" as const,
        idempotencyKey: canonicalBundle.metadata?.request_id ?? `${tradeId}-intent`,
      }
      const brokerReceipt = await brokerRouter.placeOrder(orderIntent, brokerProvider)

      await supabase.from("broker_orders").insert({
        trade_id: tradeId,
        intent: orderIntent,
        status: brokerReceipt.status,
        receipt: brokerReceipt,
      })
    }
  }

  const { data: receipt, error: receiptError } = await supabase
    .from("trade_receipts")
    .insert({
      request_id: canonicalBundle.metadata?.request_id,
      trade_id: tradeId,
      user_id: input.userId,
      ticker: input.ticker,
      action: input.mode,
      amount: canonicalBundle.capital?.recommended_size ?? canonicalBundle.input_snapshot.requested_amount,
      trust_score: canonicalBundle.trust_score,
      proof_bundle: canonicalBundle,
      proof_bundle_version: canonicalBundle.version,
      final_verdict: canonicalBundle.safety_decision.safety_status === "BLOCKED" ? "NO" : "GO",
      regime_trend: String(canonicalBundle.regime_snapshot?.trend ?? "unknown"),
      risk_level: String(canonicalBundle.risk_snapshot?.riskLevel ?? "unknown"),
      engine_degraded: canonicalBundle.safety_decision.safety_status === "BLOCKED",
      warnings: canonicalBundle.safety_decision.reasons,
      engine_started_at: canonicalBundle.timestamp,
      engine_completed_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (receiptError) {
    throw new Error(`Failed to persist receipt: ${receiptError.message}`)
  }

  return { receiptId: receipt.id as string, tradeId }
}

async function enforceReplayPolicy(mode: CanonicalMode, engineVersion: string): Promise<void> {
  if (mode !== "execute") return

  const coverageThreshold = Number(process.env.REPLAY_COVERAGE_THRESHOLD ?? 0)
  const mismatchThreshold = Number(process.env.REPLAY_MISMATCH_THRESHOLD ?? 1)
  if (coverageThreshold <= 0 && mismatchThreshold >= 1) return

  const supabase = await createClient()
  const [{ count: totalReceipts }, { count: deterministicReceipts }, { data: replayRows }] = await Promise.all([
    supabase
      .from("trade_receipts")
      .select("id", { count: "exact", head: true })
      .filter("proof_bundle->metadata->>engine_version", "eq", engineVersion),
    supabase
      .from("trade_receipts")
      .select("id", { count: "exact", head: true })
      .filter("proof_bundle->metadata->>engine_version", "eq", engineVersion)
      .not("proof_bundle->metadata->determinism", "is", null),
    supabase.from("trade_replay_reports").select("match").order("created_at", { ascending: false }).limit(100),
  ])

  const coverage = (deterministicReceipts ?? 0) / Math.max(totalReceipts ?? 1, 1)
  const mismatchRate = replayRows?.length ? replayRows.filter((row) => !row.match).length / replayRows.length : 0

  if (coverage < coverageThreshold) {
    throw new Error(`Replay coverage gate blocked execution: coverage ${coverage.toFixed(2)} < ${coverageThreshold.toFixed(2)}`)
  }

  if (mismatchRate > mismatchThreshold) {
    throw new Error(`Replay mismatch gate blocked execution: mismatch ${mismatchRate.toFixed(2)} > ${mismatchThreshold.toFixed(2)}`)
  }
}

export async function runCanonicalTrade(input: CanonicalTradeInput): Promise<CanonicalTradeResult> {
  const base = await runTradeSwarm({
    ticker: input.ticker,
    action: "preview",
    userId: input.userId,
    amount: input.amount,
    balance: input.balance,
    safetyMode: input.safetyMode,
    theme: input.theme,
    userContext: input.userContext,
  })

  const canonicalProofBundle = buildCanonicalProofBundle(base.proofBundle, input)
  await enforceReplayPolicy(input.mode, canonicalProofBundle.metadata?.engine_version ?? "unknown")

  const cp4Guard = await applyCapitalAndExecutionGuards(input, canonicalProofBundle)
  if (cp4Guard.blocked) {
    canonicalProofBundle.safety_decision = {
      ...canonicalProofBundle.safety_decision,
      safety_status: "BLOCKED",
      reason_code: cp4Guard.reason ?? "execution_guard_blocked",
      reasons: [...(canonicalProofBundle.safety_decision.reasons ?? []), cp4Guard.reason ?? "execution_guard_blocked"],
    }
  }

  const blocked = canonicalProofBundle.safety_decision.safety_status === "BLOCKED"
  const shouldPersist = input.mode === "preview" || input.mode === "simulate" || (input.mode === "execute" && !blocked)
  const persisted = shouldPersist
    ? await persistCanonical(input, canonicalProofBundle)
    : { receiptId: null, tradeId: null }

  return {
    proofBundle: canonicalProofBundle,
    legacyProofBundle: base.proofBundle,
    receiptId: persisted.receiptId,
    tradeId: persisted.tradeId,
    blocked,
  }
}
