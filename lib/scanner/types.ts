/**
 * Scanner-internal types.
 * Public-facing output types live in lib/types/proof-bundle.ts.
 */

export interface ScanConfig {
  maxCandidatesPerTicker: number  // default 3
  tierTargets: { A: number; B: number; C: number }
  minRor: { A: number; B: number; C: number }  // decimal min return on risk
}

export const DEFAULT_SCAN_CONFIG: ScanConfig = {
  maxCandidatesPerTicker: 3,
  tierTargets: { A: 5, B: 5, C: 4 },
  minRor: { A: 0.10, B: 0.12, C: 0.15 },
}

export interface RawOptionContract {
  strike: number
  bid: number
  ask: number
  mid_ps: number
  volume: number
  openInterest: number
  impliedVolatility: number | null
  delta: number | null
  inTheMoney: boolean
}

export interface RawChain {
  symbol: string
  expiration: string          // YYYY-MM-DD
  underlyingPrice: number
  atmIv: number | null
  calls: RawOptionContract[]
  puts: RawOptionContract[]
}

export interface FilterResult {
  passed: boolean
  reason?: string
}

export interface FilterCounts {
  total: number
  passedLiquidity: number
  passedDelta: number
  passedRor: number
  passedFinal: number
}
