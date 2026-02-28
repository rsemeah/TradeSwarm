import { createClient } from "@/lib/supabase/server"
import { evaluateSafety } from "@/lib/engine/safety"
import { runTradeSwarm } from "@/lib/engine/orchestrator"
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

function buildModelRounds(bundle: ProofBundle): ModelRound[] {
  return bundle.deliberation.map((round) => ({
    round_id: round.roundId,
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

  return {
    version: "v2",
    model_provider: firstOutput?.provider ?? "unknown",
    model_version: firstOutput?.model_version ?? "unknown",
    regime_snapshot: bundle.regime,
    risk_snapshot: bundle.risk,
    safety_decision: safetyDecision,
    model_rounds: modelRounds,
    consensus_score: modelRounds[modelRounds.length - 1]?.outcome.consensus_strength ?? 0,
    trust_score: bundle.finalDecision.trustScore,
    execution_mode: input.mode,
    timestamp: bundle.ts,
    input_snapshot: {
      ticker: input.ticker,
      requested_amount: input.amount,
      balance: input.balance,
      safety_mode: input.safetyMode,
      theme: input.theme,
      user_context: input.userContext,
    },
    market_snapshot: {
      quote: bundle.marketContext.quote,
      chain: bundle.marketContext.chain,
      provider_health: bundle.marketContext.providerHealth,
      as_of: bundle.marketContext.ts,
    },
    metadata: {
      request_id: bundle.requestId,
      engine_version: bundle.engineVersion,
      warnings: bundle.warnings,
      safety_status: safetyDecision.safety_status,
      reason_code: safetyDecision.reason_code,
    },
  }
}

async function persistCanonical(input: CanonicalTradeInput, canonicalBundle: CanonicalProofBundle): Promise<{ receiptId: string | null; tradeId: string | null }> {
  const supabase = await createClient()

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
