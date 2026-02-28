export type Strategy = 'PCS' | 'CCS' | 'CDS'
export type Tier = 'A' | 'B' | 'C'
export type Regime = 'TRENDING' | 'HIGH_VOL' | 'LOW_VOL' | 'CHOPPY' | 'MEAN_REVERT'

export interface ScanConfig {
  watchlist?: string[]
  catalyst_mode: boolean
  force_refresh: boolean
  account_size: number
  max_risk: number
  hard_cap: number
}

export interface RawCandidate {
  ticker: string
  underlying_price: number
  strategy: Strategy
  tier: Tier
  dte: number
  expiry_date: string
  spread_width: number
  short_strike: number
  long_strike: number
  short_mid_ps: number
  long_mid_ps: number
  short_bid: number
  short_ask: number
  long_bid: number
  long_ask: number
  short_oi: number
  long_oi: number
  short_vol: number
  long_vol: number
  short_iv: number
  long_iv: number
  short_delta: number | null
  long_delta: number | null
  earnings_date: string | null
}

export interface FilterResult {
  passed: boolean
  reasons: string[]
}

export type FilterCounts = Record<string, number>
