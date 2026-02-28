import { createAdminClient } from "@/lib/supabase/admin"
import { evaluateSafety } from "@/lib/engine/safety"
import { hashDeterministic } from "@/lib/engine/determinism"
import type { CanonicalProofBundle } from "@/lib/types/proof-bundle"

interface ReplayDiff {
  field: string
  original: unknown
  replayed: unknown
  rule: "strict" | "tolerance"
}

type MismatchClassification = "none" | "data_mismatch" | "nondeterministic_logic" | "version_drift"

export interface ReplayReport {
  tradeId: string
  match: boolean
  inputSnapshot: CanonicalProofBundle["input_snapshot"]
  marketSnapshot: CanonicalProofBundle["market_snapshot"]
  originalSafetyDecision: CanonicalProofBundle["safety_decision"]
  replaySafetyDecision: CanonicalProofBundle["safety_decision"]
  diffs: ReplayDiff[]
  mismatchClassification: MismatchClassification
}

export async function replayTrade(tradeId: string): Promise<ReplayReport> {
  const supabase = createAdminClient()

  const { data: receipt, error } = await supabase
    .from("trade_receipts")
    .select("id,trade_id,proof_bundle")
    .eq("trade_id", tradeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!receipt?.proof_bundle) {
    throw new Error("No proof bundle found for trade")
  }

  const proof = receipt.proof_bundle as CanonicalProofBundle
  let replayMarketSnapshot = proof.market_snapshot

  const snapshotRef = proof.metadata?.determinism?.market_snapshot_ref
  if (snapshotRef) {
    const { data: marketSnapshot } = await supabase
      .from("market_snapshots")
      .select("snapshot")
      .eq("id", snapshotRef)
      .maybeSingle()

    if (marketSnapshot?.snapshot) {
      replayMarketSnapshot = marketSnapshot.snapshot as CanonicalProofBundle["market_snapshot"]
    }
  }

  const replayEval = evaluateSafety({
    bankroll: Number(proof.input_snapshot.balance ?? 0),
    proposedNotional: Number(proof.input_snapshot.requested_amount ?? 0),
    underlyingVolume24h: Number((replayMarketSnapshot.quote as { volume?: number } | null)?.volume ?? 0),
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
      rule: "strict",
    })
  }
  if (proof.safety_decision.reason_code !== replaySafetyDecision.reason_code) {
    diffs.push({
      field: "reason_code",
      original: proof.safety_decision.reason_code,
      replayed: replaySafetyDecision.reason_code,
      rule: "strict",
    })
  }

  const originalHint = Number(proof.safety_decision.max_size_hint ?? 0)
  const replayHint = Number(replaySafetyDecision.max_size_hint ?? 0)
  if (Math.abs(originalHint - replayHint) > 1e-6) {
    diffs.push({
      field: "max_size_hint",
      original: originalHint,
      replayed: replayHint,
      rule: "tolerance",
    })
  }

  const replayDeterminismHash = hashDeterministic({
    input_snapshot: proof.input_snapshot,
    market_snapshot_hash: hashDeterministic(replayMarketSnapshot),
    engine_version: proof.metadata?.determinism?.engine_version ?? proof.metadata?.engine_version ?? "unknown",
    config_hash: proof.metadata?.determinism?.config_hash ?? "unknown",
    random_seed: proof.metadata?.determinism?.random_seed ?? null,
  })

  const originalDeterminismHash = proof.metadata?.determinism?.determinism_hash
  if (originalDeterminismHash && originalDeterminismHash !== replayDeterminismHash) {
    diffs.push({
      field: "determinism_hash",
      original: originalDeterminismHash,
      replayed: replayDeterminismHash,
      rule: "strict",
    })
  }

  const replayEngineVersion = process.env.ENGINE_VERSION ?? proof.metadata?.determinism?.engine_version ?? proof.metadata?.engine_version ?? "unknown"
  let mismatchClassification: MismatchClassification = "none"
  if (diffs.length > 0) {
    const metadataVersion = proof.metadata?.determinism?.engine_version ?? proof.metadata?.engine_version
    if (metadataVersion && metadataVersion !== replayEngineVersion) {
      mismatchClassification = "version_drift"
    } else if (diffs.some((d) => d.field === "determinism_hash")) {
      mismatchClassification = "data_mismatch"
    } else {
      mismatchClassification = "nondeterministic_logic"
    }
  }

  const report: ReplayReport = {
    tradeId,
    match: diffs.length === 0,
    inputSnapshot: proof.input_snapshot,
    marketSnapshot: replayMarketSnapshot,
    originalSafetyDecision: proof.safety_decision,
    replaySafetyDecision,
    diffs,
    mismatchClassification,
  }

  await supabase.from("trade_replay_reports").insert({
    trade_id: tradeId,
    receipt_id: receipt.id,
    match: report.match,
    mismatch_classification: report.mismatchClassification,
    diff: report.diffs,
  })

  return report
}
