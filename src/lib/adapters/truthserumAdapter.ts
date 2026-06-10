/**
 * TruthSerum Adapter
 * Wires the orchestrator's call surface to the real TruthSerum implementation.
 *
 * Usage in orchestrator:
 *   import { runTruthSerumGate } from "@/src/lib/adapters/truthserumAdapter"
 *   const tsResult = await runTruthSerumGate({ ... })
 *   if (tsResult.verdict !== "PASS") { // block trade }
 */

import { validateWithTruthSerum } from "@/services/truthserum"
import type { TruthSerumInput, TruthSerumResult, TruthSerumConfig } from "@/services/truthserum/types"

export type { TruthSerumInput, TruthSerumResult }

/**
 * runTruthSerumGate
 * Call this in the orchestrator immediately after deliberation scoring,
 * before any trade record is written to Supabase.
 *
 * Returns TruthSerumResult. Caller must check verdict === "PASS" before proceeding.
 */
export function runTruthSerumGate(
  input: TruthSerumInput,
  config?: Partial<TruthSerumConfig>
): TruthSerumResult {
  return validateWithTruthSerum(input, config)
}

/**
 * buildTruthSerumInput
 * Helper to construct a TruthSerumInput from orchestrator context.
 * Call this after deliberation completes.
 */
export function buildTruthSerumInput(params: {
  ticker: string
  dataSource: TruthSerumInput["dataSource"]
  quoteTimestamp: string
  engineVersion: string
  requestId: string
  halalMode: boolean
  halalVerdict?: TruthSerumInput["halalVerdict"]
  deliberationConsensus?: number
  action: TruthSerumInput["action"]
  trustScore?: number
}): TruthSerumInput {
  return {
    ticker: params.ticker,
    dataSource: params.dataSource,
    quoteTimestamp: params.quoteTimestamp,
    engineVersion: params.engineVersion,
    requestId: params.requestId,
    halalMode: params.halalMode,
    halalVerdict: params.halalVerdict,
    deliberationConsensus: params.deliberationConsensus,
    action: params.action,
    trustScore: params.trustScore,
  }
}
