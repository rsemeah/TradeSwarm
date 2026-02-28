import type { OptionContract } from '@/src/lib/adapters/optionsChain'
import type { FilterResult } from './types'

export const TIER_1_UNIVERSE: string[] = [
  'SPY', 'QQQ', 'IWM', 'DIA', 'GLD', 'TLT', 'XLF', 'XLE', 'XLK',
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA',
  'JPM', 'BAC', 'GS', 'V', 'MA',
  'WMT', 'JNJ', 'PG', 'UNH', 'HD',
]

const MIN_UNDERLYING_VOLUME = 500_000
const MIN_OI = 100
const MIN_OPTION_VOLUME = 50
const MAX_BID_ASK_PCT = 0.15
const MIN_PREMIUM_PS = 0.05

export function filterTicker(avgVolume: number): FilterResult {
  if (avgVolume < MIN_UNDERLYING_VOLUME) {
    return { passed: false, reasons: [`avg_volume ${avgVolume} < ${MIN_UNDERLYING_VOLUME}`] }
  }
  return { passed: true, reasons: [] }
}

export function filterContract(contract: OptionContract): FilterResult {
  const reasons: string[] = []
  if (contract.open_interest < MIN_OI) reasons.push(`oi ${contract.open_interest} < ${MIN_OI}`)
  if (contract.volume < MIN_OPTION_VOLUME) reasons.push(`volume ${contract.volume} < ${MIN_OPTION_VOLUME}`)

  const mid = (contract.bid + contract.ask) / 2
  if (mid > 0) {
    const spread_pct = (contract.ask - contract.bid) / mid
    if (spread_pct > MAX_BID_ASK_PCT) reasons.push(`bid_ask_pct ${spread_pct.toFixed(3)} > ${MAX_BID_ASK_PCT}`)
  }

  if (contract.mid_ps < MIN_PREMIUM_PS) reasons.push(`mid_ps ${contract.mid_ps} < ${MIN_PREMIUM_PS}`)
  return { passed: reasons.length === 0, reasons }
}

export function buildUniverse(watchlist: string[] = []): string[] {
  return Array.from(new Set([...TIER_1_UNIVERSE, ...watchlist]))
}
