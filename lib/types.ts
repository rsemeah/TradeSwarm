// Theme types for Radar screen
export interface Theme {
  name: string
  heat: "hot" | "warming" | "quiet"
  tickers: string[]
  brief: string
}

// Trade candidate types
export interface TradeBullets {
  why: string
  risk: string
  amount: string
}

export interface AuditSimple {
  trustScore: number
  winLikelihood: string
  marketStability: string
  fillQuality: string
  recommended: string
  decision: string
}

export interface AuditAdvanced {
  growthScore: number
  netElr: string
  popLowerBound: string
  kellyFinal: string
  regimeScore: number
  liquidityScore: number
  gates: {
    name: string
    passed: boolean
  }[]
}

export interface TradeScoringDetail {
  trustScore: number
  factors: { name: string; impact: number; value: string | number; detail: string }[]
  penalties: { name: string; impact: number; value: string | number; detail: string }[]
  boosts: { name: string; impact: number; value: string | number; detail: string }[]
  timestamp: string
  formula: {
    version: string
    policy: string
    expression: string
    normalizedInputs: Record<string, number>
    weights: Record<string, number>
    clamp: { min: number; max: number; rounding: string }
  }
}

export interface TradeCandidate {
  ticker: string
  strategy: string
  status: "GO" | "WAIT" | "NO"
  trustScore: number
  winLikelihoodPct: number | null
  amountDollars: number | null
  bullets: TradeBullets
  auditSimple: AuditSimple
  auditAdvanced: AuditAdvanced
  scoring?: TradeScoringDetail
}

// Portfolio types for My Money screen
export interface WeekStats {
  trades: number
  wins: number
  winRatePct: number
  avgGainDollars: number
}

export interface Portfolio {
  balance: number
  dayPnl: number
  drawdownPct: number
  drawdownLimitPct: number
  tradesToday: number
  tradesTodayMax: number
  paperTradesCompleted: number
  paperTradesRequired: number
  safetyMode: "training_wheels" | "normal" | "pro"
  weekStats: WeekStats
  dailySummary: string
}

export type TabId = "radar" | "trades" | "money"
