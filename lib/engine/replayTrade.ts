import { createAdminClient } from "@/lib/supabase/admin"
import { evaluateSafety } from "@/lib/engine/safety"
import type { CanonicalProofBundle } from "@/lib/types/proof-bundle"

interface ReplayDiff {
  field: string
  original: unknown
  replayed: unknown
}

export interface ReplayReport {
  tradeId: string
  inputSnapshot: CanonicalProofBundle["input_snapshot"]
  marketSnapshot: CanonicalProofBundle["market_snapshot"]
  originalSafetyDecision: CanonicalProofBundle["safety_decision"]
  replaySafetyDecision: CanonicalProofBundle["safety_decision"]
  diffs: ReplayDiff[]
}

export async function replayTrade(tradeId: string): Promise<ReplayReport> {
  const supabase = createAdminClient()

  const { data: receipt, error } = await supabase
    .from("trade_receipts")
    .select("trade_id,proof_bundle")
    .eq("trade_id", tradeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!receipt?.proof_bundle) {
    throw new Error("No proof bundle found for trade")
  }

  const proof = receipt.proof_bundle as CanonicalProofBundle
  const replayEval = evaluateSafety({
    bankroll: Number(proof.input_snapshot.balance ?? 0),
    proposedNotional: Number(proof.input_snapshot.requested_amount ?? 0),
    underlyingVolume24h: Number((proof.market_snapshot.quote as { volume?: number } | null)?.volume ?? 0),
    spreadPct: 0,
    optionOpenInterest: 1000,
    optionVolume24h: 1000,
    estimatedSlippagePct: 0,
    isInEarningsBlackout: false,
    truthSerumAvailable: true,
    mode: "preview",
  })

  const replaySafetyDecision: CanonicalProofBundle["safety_decision"] = {
    safety_status: replayEval.allowed ? "ALLOWED" : "BLOCKED",
    reason_code: replayEval.allowed ? null : "REPLAY_SAFETY_BLOCKED",
    reasons: replayEval.reasons,
    max_size_hint: replayEval.maxSizeHint,
  }

  const diffs: ReplayDiff[] = []
  if (proof.safety_decision.safety_status !== replaySafetyDecision.safety_status) {
    diffs.push({
      field: "safety_status",
      original: proof.safety_decision.safety_status,
      replayed: replaySafetyDecision.safety_status,
    })
  }
  if (proof.safety_decision.reason_code !== replaySafetyDecision.reason_code) {
    diffs.push({
      field: "reason_code",
      original: proof.safety_decision.reason_code,
      replayed: replaySafetyDecision.reason_code,
    })
  }

  return {
    tradeId,
    inputSnapshot: proof.input_snapshot,
    marketSnapshot: proof.market_snapshot,
    originalSafetyDecision: proof.safety_decision,
    replaySafetyDecision,
    diffs,
  }
}
