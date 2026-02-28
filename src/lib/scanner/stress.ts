import type { Candidate, StressResult } from './types'

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export function computeStress(candidate: Candidate, contracts: number): StressResult {
  const sigma = candidate.iv > 0 ? candidate.iv : candidate.rv20 && candidate.rv20 > 0 ? candidate.rv20 : 0.2
  const source = candidate.iv > 0 ? 'contract_iv' : candidate.rv20 && candidate.rv20 > 0 ? 'rv20_proxy' : 'fallback_0_20'

  const oneSigma = candidate.underlyingPrice * sigma * Math.sqrt(candidate.dte / 365)

  const pnlAt = (price: number) => {
    const width = candidate.spreadWidth
    const net = candidate.strategy === 'CDS' ? candidate.longLeg.mid - candidate.shortLeg.mid : candidate.shortLeg.mid - candidate.longLeg.mid

    let perShare = 0
    if (candidate.strategy === 'PCS') {
      perShare = net - clamp(candidate.shortLeg.strike - price, 0, width)
    } else if (candidate.strategy === 'CCS') {
      perShare = net - clamp(price - candidate.shortLeg.strike, 0, width)
    } else {
      perShare = clamp(price - candidate.longLeg.strike, 0, width) - net
    }

    const pnl = perShare * contracts * 100
    const label: 'Win' | 'Flat' | 'Loss' = pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'Flat'
    return { price, pnl, label }
  }

  return {
    sigma,
    source,
    scenarios: {
      up_1s: pnlAt(candidate.underlyingPrice + oneSigma),
      down_1s: pnlAt(candidate.underlyingPrice - oneSigma),
      up_2s: pnlAt(candidate.underlyingPrice + oneSigma * 2),
      down_2s: pnlAt(candidate.underlyingPrice - oneSigma * 2),
    },
  }
}
