export type Strategy = 'PCS' | 'CCS' | 'CDS'

export type Tier = 'A' | 'B' | 'C'

export interface UniverseTicker {
  symbol: string
  tier: Tier
}

export interface OptionLeg {
  strike: number
  bid: number
  ask: number
  mid: number
  iv: number
  volume: number
  openInterest: number
  delta?: number
}

export interface Candidate {
  id: string
  ticker: string
  tier: Tier
  strategy: Strategy
  dte: number
  underlyingPrice: number
  spreadWidth: number
  shortLeg: OptionLeg
  longLeg: OptionLeg
  iv: number
  rv20: number | null
  ivVsRv: number
  pop: number
  liquidity: number
  riskBudget: number
  hardCap: number
}

export interface ScoreInputs {
  ror: number
  pop: number
  ivVsRv: number
  liquidity: number
  eventPenalty: number
  regimeBonus: number
}

export interface ScoreBreakdown {
  raw: number
  eventPenalty: number
  regimeBonus: number
  total: number
  display: number
  weights: {
    ror: number
    pop: number
    ivVsRv: number
    liquidity: number
  }
}

export interface StressPoint {
  price: number
  pnl: number
  label: 'Win' | 'Flat' | 'Loss'
}

export interface StressResult {
  sigma: number
  source: 'contract_iv' | 'rv20_proxy' | 'fallback_0_20'
  scenarios: Record<'up_1s' | 'down_1s' | 'up_2s' | 'down_2s', StressPoint>
}

export interface MacroFlags {
  fomc: boolean
  cpi: boolean
  nfp: boolean
  earnings: boolean
}

export interface NewsImpact {
  sentiment: number
  penalty: number
  macroFlags: MacroFlags
  headlines: string[]
}

export interface TruthSerumFlags {
  delta_approximated: boolean
  iv_history_insufficient: boolean
  sigma_source: StressResult['source']
  catalyst_mode_trade: 'A'
}

export interface RankedDeal {
  candidate: Candidate
  score: ScoreBreakdown
  ror: number
  maxLoss: number
  maxProfit: number
  contracts: number
  stress: StressResult
  news: NewsImpact
  truthSerum: TruthSerumFlags
}

export interface ScanResult {
  scanId: string
  generatedAt: string
  ttlSeconds: number
  empty: boolean
  reason?: string
  deals: RankedDeal[]
}
