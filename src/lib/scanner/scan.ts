import { buildCandidates } from './candidates'
import { FIXED_UNIVERSE } from './universe'
import { computeScore } from './score'
import { computeStress } from './stress'
import { applyRanking } from './rank'
import { getNewsImpact } from '@/src/lib/news/newsEngine'
import type { RankedDeal, ScanResult } from './types'

const CACHE_TTL_MS = 5 * 60_000
const cache = new Map<string, { expiresAt: number; value: ScanResult }>()

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n))

function calcRor(deal: RankedDeal['candidate']) {
  const net = deal.strategy === 'CDS' ? deal.longLeg.mid - deal.shortLeg.mid : deal.shortLeg.mid - deal.longLeg.mid
  const maxLoss = deal.strategy === 'CDS' ? net : deal.spreadWidth - net
  const maxProfit = deal.strategy === 'CDS' ? deal.spreadWidth - net : net
  return { ror: maxLoss > 0 ? maxProfit / maxLoss : 0, maxLoss, maxProfit }
}

export async function runScan(params?: { includeTierA?: boolean; forceRefresh?: boolean }): Promise<ScanResult> {
  const key = `scan:${params?.includeTierA ? 'withA' : 'noA'}`
  const cached = cache.get(key)
  if (!params?.forceRefresh && cached && cached.expiresAt > Date.now()) return cached.value

  const { candidates, ivHistoryInsufficient } = await buildCandidates(FIXED_UNIVERSE, params?.includeTierA ?? false)

  const deals: RankedDeal[] = []
  for (const candidate of candidates) {
    const news = await getNewsImpact(candidate.ticker)
    const { ror, maxLoss, maxProfit } = calcRor(candidate)
    const contracts = Math.max(1, Math.floor(candidate.riskBudget / (maxLoss * 100 || Number.POSITIVE_INFINITY)))
    if (maxLoss * 100 * contracts > candidate.hardCap) continue

    const score = computeScore({
      ror: clamp(ror / 0.4),
      pop: candidate.pop,
      ivVsRv: candidate.strategy === 'CDS' ? 1 - candidate.ivVsRv : candidate.ivVsRv,
      liquidity: candidate.liquidity,
      eventPenalty: news.penalty + (news.macroFlags.fomc ? 0.1 : 0) + (news.macroFlags.cpi ? 0.08 : 0) + (news.macroFlags.nfp ? 0.06 : 0),
      regimeBonus: 0,
    })

    deals.push({
      candidate,
      score,
      ror,
      maxLoss,
      maxProfit,
      contracts,
      stress: computeStress(candidate, contracts),
      news,
      truthSerum: {
        delta_approximated: !candidate.shortLeg.delta,
        iv_history_insufficient: ivHistoryInsufficient.has(candidate.ticker),
        sigma_source: computeStress(candidate, contracts).source,
        catalyst_mode_trade: 'A',
      },
    })
  }

  const ranked = applyRanking(deals).filter((d) => d.ror >= (d.candidate.tier === 'A' ? 0.1 : d.candidate.tier === 'B' ? 0.12 : 0.15))
  const finalDeals = ranked.slice(0, 15)
  const value: ScanResult = {
    scanId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    ttlSeconds: CACHE_TTL_MS / 1000,
    empty: finalDeals.length < 5,
    reason: finalDeals.length < 5 ? 'No high-quality setups found.' : undefined,
    deals: finalDeals,
  }

  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value })
  cache.set(`id:${value.scanId}`, { expiresAt: Date.now() + CACHE_TTL_MS, value })
  return value
}

export function getCachedScan(scanId: string): ScanResult | null {
  const hit = cache.get(`id:${scanId}`)
  if (!hit || hit.expiresAt < Date.now()) return null
  return hit.value
}
