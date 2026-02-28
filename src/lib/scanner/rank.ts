import type { CandidateProofBundle, ScanResult } from '@/lib/types/proof-bundle'
import type { FilterCounts } from './types'

const TIER_MIN_ROR: Record<string, number> = { A: 0.1, B: 0.12, C: 0.15 }
const MAX_PER_UNDERLYING = 3
const TIER_TARGETS = { A: 5, B: 5, C: 4 }

export function rankAndFilter(candidates: CandidateProofBundle[], catalyst_mode: boolean, filter_counts: FilterCounts): ScanResult['candidates'] {
  let pool = candidates.filter((c) => {
    if (c.tier === 'A' && !catalyst_mode) {
      filter_counts.catalyst_mode_off = (filter_counts.catalyst_mode_off ?? 0) + 1
      return false
    }
    return true
  })

  pool = pool.filter((c) => {
    const min = TIER_MIN_ROR[c.tier] ?? 0
    if (c.ROR < min) {
      filter_counts.below_min_ror = (filter_counts.below_min_ror ?? 0) + 1
      return false
    }
    return true
  })

  pool.sort((a, b) => b.score.total - a.score.total)
  const ticker_counts: Record<string, number> = {}
  pool = pool.filter((c) => {
    const count = ticker_counts[c.ticker] ?? 0
    if (count >= MAX_PER_UNDERLYING) {
      filter_counts.diversity_limit = (filter_counts.diversity_limit ?? 0) + 1
      return false
    }
    ticker_counts[c.ticker] = count + 1
    return true
  })

  const result: CandidateProofBundle[] = []
  const tier_taken: Record<string, number> = { A: 0, B: 0, C: 0 }
  for (const c of pool) {
    const target = TIER_TARGETS[c.tier] ?? 0
    if (tier_taken[c.tier] < target) {
      result.push(c)
      tier_taken[c.tier] += 1
    }
  }
  return result
}

export function buildScanResult(scan_id: string, universe: string[], candidates: CandidateProofBundle[], filter_counts: FilterCounts, cached: boolean): ScanResult {
  const tier_counts = {
    A: candidates.filter((c) => c.tier === 'A').length,
    B: candidates.filter((c) => c.tier === 'B').length,
    C: candidates.filter((c) => c.tier === 'C').length,
  }
  const empty = candidates.length < 5
  return {
    scan_id,
    scanned_at: new Date().toISOString(),
    cached,
    universe,
    candidates,
    empty,
    empty_reason: empty ? 'No strong deals found today.' : undefined,
    filter_counts,
    tier_counts,
  }
}
