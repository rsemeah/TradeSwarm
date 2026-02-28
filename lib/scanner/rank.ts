import type { RankResult, RankedCandidate } from './types'

export function rankCandidates(
  candidates: RankedCandidate[],
  minRorByTier: Record<'A' | 'B' | 'C', number> = { A: 0.1, B: 0.12, C: 0.15 },
  minBoardSize = 5
): RankResult {
  const filterCounts: Record<string, number> = {
    below_min_ror: 0,
    diversity_trimmed: 0,
  }

  const passingRor = candidates.filter((candidate) => {
    const passes = candidate.ror >= minRorByTier[candidate.tier]
    if (!passes) {
      filterCounts.below_min_ror += 1
    }
    return passes
  })

  const sorted = [...passingRor].sort((a, b) => b.score - a.score)
  const perTickerCount = new Map<string, number>()
  const diverse: RankedCandidate[] = []

  for (const candidate of sorted) {
    const count = perTickerCount.get(candidate.ticker) ?? 0
    if (count >= 3) {
      filterCounts.diversity_trimmed += 1
      continue
    }

    perTickerCount.set(candidate.ticker, count + 1)
    diverse.push(candidate)
  }

  if (diverse.length < minBoardSize) {
    return {
      candidates: [],
      empty: true,
      reason: 'No strong deals found today',
      filterCounts,
    }
  }

  return {
    candidates: diverse,
    empty: false,
    filterCounts,
  }
}
