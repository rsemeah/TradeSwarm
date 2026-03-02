// Scanner types - canonical definitions for scan results and candidates
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
  id: string
  id?: string
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

export interface RankedDeal {
  candidate: RawCandidate
  score: {
    total: number
    display: string
    breakdown: Record<string, number>
  }
  ror: number
  pop: number
  contracts: number
  risk_usd: number
  margin_usd: number
  stress: {
    max_loss: number
    break_even: number
    scenarios: Array<{ move: number; pnl: number }>
  }
  tier: Tier
  rank: number
}

export interface ScanResult {
  scan_id: string
  scanned_at: string
  config: ScanConfig
  regime: Regime
  deals: RankedDeal[]
  filter_counts: FilterCounts
  universe_size: number
  candidates_generated: number
  candidates_passed: number
  cache_hit: boolean
  // Empty state fields (for when scan finds no candidates)
  empty?: boolean
  reason?: string
  score: { display: string; value: number }
  ror: number
  contracts: number
  stress?: unknown
  truthSerum?: unknown
  news: { macroFlags: string[] }
}

export interface ScanResult {
  empty: boolean
  reason?: string
  deals: RankedDeal[]
}
