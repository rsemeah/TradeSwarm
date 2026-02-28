import type { RankedDeal } from './types'

export function applyRanking(deals: RankedDeal[]): RankedDeal[] {
  const sorted = [...deals].sort((a, b) => b.score.total - a.score.total)
  const perTicker = new Map<string, number>()
  const filtered: RankedDeal[] = []

  for (const deal of sorted) {
    const count = perTicker.get(deal.candidate.ticker) ?? 0
    if (count >= 3) continue
    perTicker.set(deal.candidate.ticker, count + 1)
    filtered.push(deal)
  }

  return filtered.slice(0, 15)
}
