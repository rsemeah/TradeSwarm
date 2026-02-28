/**
 * Rank and filter candidates.
 *
 * Targets per scan:
 *   Tier A: 5  (3-7 DTE catalyst plays)
 *   Tier B: 5  (10-21 DTE core)
 *   Tier C: 4  (21-30 DTE longer-dated)
 *
 * Constraints:
 *   • Max 3 candidates per underlying
 *   • Min ROR: A=10%, B=12%, C=15%
 *   • Sort by score.final descending within each tier
 *
 * If fewer than 5 candidates total → empty=true in summary.
 */

import type { ScanResult } from "@/lib/types/proof-bundle"
import type { ScanConfig } from "./types"
import { DEFAULT_SCAN_CONFIG } from "./types"

export interface RankResult {
  ranked: ScanResult[]
  tierCounts: { A: number; B: number; C: number }
  totalScanned: number
  passed: number
  empty: boolean
}

export function rankAndFilter(
  candidates: ScanResult[],
  totalScanned: number,
  config: ScanConfig = DEFAULT_SCAN_CONFIG
): RankResult {
  // 1. Apply min ROR filter per tier
  const filtered = candidates.filter((c) => {
    const minRor = config.minRor[c.tier]
    return c.ror_ps >= minRor
  })

  // 2. Sort by final score descending
  filtered.sort((a, b) => b.score.final - a.score.final)

  // 3. Apply max-per-underlying and tier targets
  const perUnderlying = new Map<string, number>()
  const tierCounts = { A: 0, B: 0, C: 0 }
  const ranked: ScanResult[] = []

  for (const c of filtered) {
    const underlyingCount = perUnderlying.get(c.ticker) ?? 0
    if (underlyingCount >= config.maxCandidatesPerTicker) continue

    const tierCount = tierCounts[c.tier]
    if (tierCount >= config.tierTargets[c.tier]) continue

    ranked.push(c)
    perUnderlying.set(c.ticker, underlyingCount + 1)
    tierCounts[c.tier]++
  }

  const passed = ranked.length
  const empty = passed < 5

  return { ranked, tierCounts, totalScanned, passed, empty }
}
