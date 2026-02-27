export type CandidateStatus = "FIRE" | "WATCH" | "BLOCK"
export type RegimeStatus = "PASS" | "BLOCK"
export type ImpactLevel = "Low" | "Medium" | "High"

export interface GateResult {
  label: string
  passed: boolean
}

export interface AuditData {
  costModel: {
    grossELR: string
    tcaDeduction: string
    netELR: string
  }
  popEstimate: {
    deltaProxy: string
    bucketHits: string
    ciLower: string
    confidence: string
  }
  kellySizing: {
    kellyRaw: string
    halfKelly: string
    finalCapped: string
    dollarRisk: string
  }
  gateResults: GateResult[]
  timestamp: string
}

export interface TradeCandidate {
  ticker: string
  strategy: string
  dte: number
  growthScore: number
  elr: string | null
  pop: string | null
  regimeStatus: RegimeStatus
  liquidity: number
  impact: ImpactLevel
  allocation: string | null
  riskAmount: string | null
  rationale: string
  drivers: string[]
  status: CandidateStatus
  audit: AuditData | null
}

export interface RegimeIndicator {
  label: string
  value: string
  status: "green" | "yellow" | "red"
}

export interface RegimeData {
  indicators: RegimeIndicator[]
  score: number
  status: RegimeStatus
}

export interface PortfolioData {
  balance: string
  dayPnl: string
  dayPnlPositive: boolean
  openPositions: number
  openRisk: number
  maxRisk: number
  weeklyDrawdown: number
  maxDrawdown: number
  tradesToday: number
  maxTrades: number
  swarmActive: boolean
  swarmMode: string
}

export interface SystemStatus {
  lastScan: string
  nextScan: string
  evaluated: number
  fireCount: number
  watchCount: number
  blockCount: number
  noTradeReason: string | null
}
