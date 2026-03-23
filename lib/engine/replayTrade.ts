import { createAdminClient } from "@/lib/supabase/admin"
import { evaluateSafety } from "@/lib/engine/safety"
import { persistReplayConvergence } from "@/lib/engine/measurement"
import { computeInputHash, computeOutputHash } from "@/src/lib/determinism/hash"
import { ENGINE_INPUT_VERSION, type EngineInputV1 } from "@/src/types/EngineInput.v1"
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
  runId: string
  match: boolean
  inputHash: string
  outputHash: string
  originalOutputHash: string | null
  inputSnapshot: CanonicalProofBundle["input_snapshot"]
  marketSnapshot: CanonicalProofBundle["market_snapshot"]
  originalSafetyDecision: CanonicalProofBundle["safety_decision"]
  replaySafetyDecision: CanonicalProofBundle["safety_decision"]
  diffs: ReplayDiff[]
  mismatchClassification: MismatchClassification
  divergence?: { field: string | null; path: string | null }
}

function buildReplayInput(proof: CanonicalProofBundle, tradeId: string): EngineInputV1 {
  return {
    schema_version: ENGINE_INPUT_VERSION,
    run: {
      run_id: proof.metadata?.request_id ?? tradeId,
      mode: "preview",
      engine_version: proof.metadata?.determinism?.engine_version ?? proof.metadata?.engine_version ?? "unknown",
      config_hash: proof.metadata?.determinism?.config_hash ?? "unknown",
      created_utc: proof.timestamp,
    },
    request: {
      ticker: proof.input_snapshot.ticker,
      amount_usd: Number(proof.input_snapshot.requested_amount ?? 0),
      intent: proof.execution_mode,
    },
    snapshot: {
      market_snapshot_hash: proof.metadata?.determinism?.market_snapshot_hash ?? "unknown",
      market_snapshot: proof.market_snapshot,
    },
    features: {
      trust_score: proof.trust_score,
      consensus_score: proof.consensus_score,
      regime_snapshot: proof.regime_snapshot,
      risk_snapshot: proof.risk_snapshot,
      preflight_pass: proof.safety_decision.safety_status === "ALLOWED",
      final_action: proof.safety_decision.safety_status,
    },
    stochastic: {
      random_seed: proof.metadata?.determinism?.random_seed != null ? String(proof.metadata.determinism.random_seed) : null,
    },
  }
}

function firstDivergence(original: unknown, replayed: unknown, path = ""): { field: string | null; path: string | null } {
  if (Object.is(original, replayed)) return { field: null, path: null }

  if (typeof original !== typeof replayed) {
    return { field: path.split(".").filter(Boolean).pop() ?? null, path: path || "$" }
  }

  if (Array.isArray(original) && Array.isArray(replayed)) {
    const max = Math.max(original.length, replayed.length)
    for (let i = 0; i < max; i += 1) {
      const next = firstDivergence(original[i], replayed[i], `${path}[${i}]`)
      if (next.path) return next
    }
    return { field: path.split(".").filter(Boolean).pop() ?? null, path: path || "$" }
  }

  if (original && replayed && typeof original === "object" && typeof replayed === "object") {
    const keys = Array.from(new Set([...Object.keys(original as Record<string, unknown>), ...Object.keys(replayed as Record<string, unknown>)])).sort()
    for (const key of keys) {
      const next = firstDivergence(
        (original as Record<string, unknown>)[key],
        (replayed as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key,
      )
      if (next.path) return next
    }
    return { field: path.split(".").filter(Boolean).pop() ?? null, path: path || "$" }
  }

  return { field: path.split(".").filter(Boolean).pop() ?? (path || null), path: path || "$" }
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
  const schemaVersion = proof.metadata?.determinism?.schema_version ?? ENGINE_INPUT_VERSION
  if (schemaVersion !== ENGINE_INPUT_VERSION) {
    throw new Error(`Replay refused: schema mismatch ${schemaVersion} != ${ENGINE_INPUT_VERSION}`)
  }

  let replayMarketSnapshot = proof.market_snapshot
  const snapshotRef = proof.metadata?.determinism?.market_snapshot_ref
  if (snapshotRef) {
    const { data: marketSnapshot } = await supabase.from("market_snapshots").select("snapshot").eq("id", snapshotRef).maybeSingle()
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
    diffs.push({ field: "safety_status", original: proof.safety_decision.safety_status, replayed: replaySafetyDecision.safety_status, rule: "strict" })
  }
  if (proof.safety_decision.reason_code !== replaySafetyDecision.reason_code) {
    diffs.push({ field: "reason_code", original: proof.safety_decision.reason_code, replayed: replaySafetyDecision.reason_code, rule: "strict" })
  }
  const originalHint = Number(proof.safety_decision.max_size_hint ?? 0)
  const replayHint = Number(replaySafetyDecision.max_size_hint ?? 0)
  if (Math.abs(originalHint - replayHint) > 1e-6) {
    diffs.push({ field: "max_size_hint", original: originalHint, replayed: replayHint, rule: "tolerance" })
  }

  const replayInput = buildReplayInput({ ...proof, market_snapshot: replayMarketSnapshot }, tradeId)
  const inputHash = computeInputHash(replayInput)
  const outputHash = computeOutputHash(replaySafetyDecision)
  const originalOutputHash = proof.metadata?.determinism?.output_hash ?? null

  if (originalOutputHash && originalOutputHash !== outputHash) {
    diffs.push({ field: "output_hash", original: originalOutputHash, replayed: outputHash, rule: "strict" })
  }

  const replayEngineVersion = process.env.ENGINE_VERSION ?? proof.metadata?.determinism?.engine_version ?? proof.metadata?.engine_version ?? "unknown"
  let mismatchClassification: MismatchClassification = "none"
  if (diffs.length > 0) {
    const metadataVersion = proof.metadata?.determinism?.engine_version ?? proof.metadata?.engine_version
    if (metadataVersion && metadataVersion !== replayEngineVersion) {
      mismatchClassification = "version_drift"
    } else if (diffs.some((d) => d.field === "output_hash")) {
      mismatchClassification = "data_mismatch"
    } else {
      mismatchClassification = "nondeterministic_logic"
    }
  }

  const divergence = diffs.length > 0 ? firstDivergence(proof.safety_decision, replaySafetyDecision) : { field: null, path: null }

  const report: ReplayReport = {
    tradeId,
    runId: replayInput.run.run_id,
    match: diffs.length === 0,
    inputHash,
    outputHash,
    originalOutputHash,
    inputSnapshot: proof.input_snapshot,
    marketSnapshot: replayMarketSnapshot,
    originalSafetyDecision: proof.safety_decision,
    replaySafetyDecision,
    diffs,
    mismatchClassification,
    divergence,
  }

  await supabase.from("trade_replay_reports").insert({
    trade_id: tradeId,
    receipt_id: receipt.id,
    match: report.match,
    mismatch_classification: report.mismatchClassification,
    diff: report.diffs,
  })

  await persistReplayConvergence({
    trade_id: tradeId,
    run_id: report.runId,
    schema_version: ENGINE_INPUT_VERSION,
    engine_version: replayInput.run.engine_version,
    input_hash: report.inputHash,
    output_hash: report.outputHash,
    match: report.match,
    divergence_field: report.divergence?.field ?? null,
    divergence_path: report.divergence?.path ?? null,
  })

  return report
}
