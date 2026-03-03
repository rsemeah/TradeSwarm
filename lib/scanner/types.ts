export type Strategy = 'PCS' | 'CCS' | 'CDS'

export interface ScoreInputs {
  rorScore: number
  popScore: number
  ivRvScore: number
  liquidityScore: number
  earningsFlag?: boolean
  fomcFlag?: boolean
  cpiFlag?: boolean
  nfpFlag?: boolean
  finalNewsSentiment?: number
  regimeBonus?: number
}

export interface ScoreBreakdown {
  rawScore: number
  eventPenalty: number
  regimeBonus: number
  total: number
  display: number
  components: {
    rorScore: number
    popScore: number
    ivRvScore: number
    liquidityScore: number
  }
}

export interface CandidateMathInput {
  strategy: Strategy
  spreadWidth: number
  shortMidPs: number
  longMidPs: number
  riskBudget?: number
  hardCap?: number
}

export interface CandidateMathResult {
  netCreditPs: number
  netCreditTotal: number
  netDebitPs: number
  netDebitTotal: number
  maxLossPs: number
  maxLossTotal: number
  maxProfitPs: number
  maxProfitTotal: number
  contracts: number
  actualRiskTotal: number
  sizedAtHardCap: boolean
  skipped: boolean
  ror: number
}

export interface RankedCandidate {
  candidateId: string
  ticker: string
  tier: 'A' | 'B' | 'C'
  dte: number
  strategy: Strategy
  ror: number
  score: number
}

export interface RankResult {
  candidates: RankedCandidate[]
  empty: boolean
  reason?: string
  filterCounts?: Record<string, number>
}
