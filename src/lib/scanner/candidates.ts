import type { OptionContract } from '@/src/lib/adapters/optionsChain'
import type { RawCandidate, Tier } from './types'

const DTE_TIERS: Record<Tier, [number, number]> = { A: [3, 7], B: [10, 21], C: [21, 30] }
const CREDIT_SHORT_DELTA_MIN = 0.25
const CREDIT_SHORT_DELTA_MAX = 0.35
const DEBIT_LONG_DELTA_MIN = 0.45
const DEBIT_LONG_DELTA_MAX = 0.55
const PREFERRED_WIDTH = 1
const FALLBACK_WIDTH = 2

function dteFits(dte: number, tier: Tier): boolean {
  const [min, max] = DTE_TIERS[tier]
  return dte >= min && dte <= max
}

function findContract(contracts: OptionContract[], type: 'call' | 'put', strike: number): OptionContract | undefined {
  return contracts.find((c) => c.type === type && c.strike === strike)
}

function nearestByDelta(contracts: OptionContract[], type: 'call' | 'put', min: number, max: number): OptionContract | undefined {
  return contracts
    .filter((c) => c.type === type && c.delta !== null)
    .filter((c) => Math.abs(c.delta!) >= min && Math.abs(c.delta!) <= max)
    .sort((a, b) => Math.abs(a.delta!) - Math.abs(b.delta!))[0]
}

export function generateCreditSpreadCandidates(
  ticker: string,
  underlying_price: number,
  contracts: OptionContract[],
  expiry_date: string,
  dte: number,
  strategy: 'PCS' | 'CCS',
  earnings_date: string | null,
  tiers: Tier[],
): RawCandidate[] {
  const results: RawCandidate[] = []
  const option_type = strategy === 'PCS' ? 'put' : 'call'
  const short_leg = nearestByDelta(contracts, option_type, CREDIT_SHORT_DELTA_MIN, CREDIT_SHORT_DELTA_MAX)
  if (!short_leg) return results

  for (const width of [PREFERRED_WIDTH, FALLBACK_WIDTH]) {
    const long_strike = strategy === 'PCS' ? short_leg.strike - width : short_leg.strike + width
    const long_leg = findContract(contracts, option_type, long_strike)
    if (!long_leg) continue
    const net_credit_ps = short_leg.mid_ps - long_leg.mid_ps
    if (net_credit_ps <= 0) continue

    for (const tier of tiers) {
      if (!dteFits(dte, tier)) continue
      results.push({
        ticker, underlying_price, strategy, tier, dte, expiry_date,
        spread_width: width,
        short_strike: short_leg.strike,
        long_strike,
        short_mid_ps: short_leg.mid_ps,
        long_mid_ps: long_leg.mid_ps,
        short_bid: short_leg.bid,
        short_ask: short_leg.ask,
        long_bid: long_leg.bid,
        long_ask: long_leg.ask,
        short_oi: short_leg.open_interest,
        long_oi: long_leg.open_interest,
        short_vol: short_leg.volume,
        long_vol: long_leg.volume,
        short_iv: short_leg.implied_vol,
        long_iv: long_leg.implied_vol,
        short_delta: short_leg.delta,
        long_delta: long_leg.delta,
        earnings_date,
      })
    }
  }

  return results
}

export function generateDebitSpreadCandidates(
  ticker: string,
  underlying_price: number,
  contracts: OptionContract[],
  expiry_date: string,
  dte: number,
  earnings_date: string | null,
): RawCandidate[] {
  const results: RawCandidate[] = []
  const tiers: Tier[] = ['B', 'C']
  const long_leg = nearestByDelta(contracts, 'call', DEBIT_LONG_DELTA_MIN, DEBIT_LONG_DELTA_MAX)
  if (!long_leg) return results

  for (const width of [PREFERRED_WIDTH, FALLBACK_WIDTH]) {
    const short_strike = long_leg.strike + width
    const short_leg = findContract(contracts, 'call', short_strike)
    if (!short_leg) continue
    const net_debit_ps = long_leg.mid_ps - short_leg.mid_ps
    if (net_debit_ps <= 0) continue

    for (const tier of tiers) {
      if (!dteFits(dte, tier)) continue
      results.push({
        ticker, underlying_price, strategy: 'CDS', tier, dte, expiry_date,
        spread_width: width,
        short_strike: short_leg.strike,
        long_strike: long_leg.strike,
        short_mid_ps: short_leg.mid_ps,
        long_mid_ps: long_leg.mid_ps,
        short_bid: short_leg.bid,
        short_ask: short_leg.ask,
        long_bid: long_leg.bid,
        long_ask: long_leg.ask,
        short_oi: short_leg.open_interest,
        long_oi: long_leg.open_interest,
        short_vol: short_leg.volume,
        long_vol: long_leg.volume,
        short_iv: short_leg.implied_vol,
        long_iv: long_leg.implied_vol,
        short_delta: short_leg.delta,
        long_delta: long_leg.delta,
        earnings_date,
      })
    }
  }

  return results
}
