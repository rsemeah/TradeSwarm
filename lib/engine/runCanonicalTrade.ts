import { createClient } from "@/lib/supabase/server"
import { evaluateSafety } from "@/lib/engine/safety"
import { runTradeSwarm } from "@/lib/engine/orchestrator"
import { hashDeterministic } from "@/lib/engine/determinism"
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

async function persistMarketSnapshot(canonicalBundle: CanonicalProofBundle): Promise<PersistedMarketSnapshot> {
  const supabase = await createClient()
  const contentHash = hashDeterministic(canonicalBundle.market_snapshot)

  const payload = {
    snapshot_hash: contentHash,
    snapshot: canonicalBundle.market_snapshot,
    source: String(canonicalBundle.market_snapshot.source ?? "unknown"),
    as_of: canonicalBundle.market_snapshot.as_of,
    latency_ms: canonicalBundle.market_snapshot.latency_ms,
  }

  const { data, error } = await supabase
    .from("market_snapshots")
    .upsert(payload, { onConflict: "snapshot_hash", ignoreDuplicates: false })
    .select("id")
    .single()

  if (error) {
    return { snapshotId: null, contentHash }
  }

  return { snapshotId: data.id as string, contentHash }
}

async function persistCanonical(input: CanonicalTradeInput, canonicalBundle: CanonicalProofBundle): Promise<{ receiptId: string | null; tradeId: string | null }> {
  const supabase = await createClient()
  const persistedSnapshot = await persistMarketSnapshot(canonicalBundle)

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
        amount: canonicalBundle.input_snapshot.requested_amount,
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
  }

  const { data: receipt, error: receiptError } = await supabase
    .from("trade_receipts")
    .insert({
      request_id: canonicalBundle.metadata?.request_id,
      trade_id: tradeId,
      user_id: input.userId,
      ticker: input.ticker,
      action: input.mode,
      amount: canonicalBundle.input_snapshot.requested_amount,
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
