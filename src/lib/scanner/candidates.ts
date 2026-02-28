import { fetchRv20 } from '@/src/lib/indicators/rv20'
import { fetchOptionSnapshot } from '@/src/lib/adapters/optionsChain'
import type { Candidate, Strategy, Tier, UniverseTicker } from './types'

const DTE = 21

function liquidityScore(volume: number, oi: number): number {
  return Math.max(0, Math.min(1, (volume / 800 + oi / 2500) / 2))
}

function popFromDelta(delta: number | undefined): number {
  const d = delta ?? 0.2
  return Math.max(0.5, Math.min(0.95, 1 - Math.abs(d)))
}

function ivVsRvPosition(iv: number, rv20: number | null): number {
  if (!rv20 || rv20 <= 0) return 0.5
  return Math.max(0, Math.min(1, iv / (iv + rv20)))
}

function buildCandidate(symbol: string, tier: Tier, strategy: Strategy, snapshot: Awaited<ReturnType<typeof fetchOptionSnapshot>>, rv20: number | null): Candidate {
  const [shortLeg, longLeg] = strategy === 'CDS' ? [snapshot.callLong, snapshot.callShort] : strategy === 'PCS' ? [snapshot.putShort, snapshot.putLong] : [snapshot.callShort, snapshot.callLong]
  return {
    id: `${symbol}-${strategy}-${snapshot.expiration}`,
    ticker: symbol,
    tier,
    strategy,
    dte: DTE,
    underlyingPrice: snapshot.underlyingPrice,
    spreadWidth: Math.abs(longLeg.strike - shortLeg.strike),
    shortLeg,
    longLeg,
    iv: (shortLeg.iv + longLeg.iv) / 2,
    rv20,
    ivVsRv: ivVsRvPosition((shortLeg.iv + longLeg.iv) / 2, rv20),
    pop: popFromDelta(shortLeg.delta),
    liquidity: liquidityScore(shortLeg.volume + longLeg.volume, shortLeg.openInterest + longLeg.openInterest),
    riskBudget: 200,
    hardCap: 250,
  }
}

export async function buildCandidates(universe: UniverseTicker[], includeTierA: boolean): Promise<{ candidates: Candidate[]; ivHistoryInsufficient: Set<string> }> {
  const pool = includeTierA ? universe : universe.filter((t) => t.tier !== 'A')
  const candidates: Candidate[] = []
  const ivHistoryInsufficient = new Set<string>()

  await Promise.all(
    pool.map(async ({ symbol, tier }) => {
      const [snapshot, rv] = await Promise.all([fetchOptionSnapshot(symbol), fetchRv20(symbol)])
      if (!snapshot) return
      if (rv.insufficient) ivHistoryInsufficient.add(symbol)

      candidates.push(buildCandidate(symbol, tier, 'PCS', snapshot, rv.rv20))
      candidates.push(buildCandidate(symbol, tier, 'CCS', snapshot, rv.rv20))
      candidates.push(buildCandidate(symbol, tier, 'CDS', snapshot, rv.rv20))
    })
  )

  return { candidates, ivHistoryInsufficient }
}
