/**
 * Canonical proof-bundle types for the TradeSwarm engine.
 * Single source of truth for all engine contracts: API responses,
 * DB storage, and inter-module communication.
 */

// ─── Primitives ────────────────────────────────────────────────────────────

export type MarketDataSource = "yahoo" | "mock"
export type TradeAction = "execute" | "simulate" | "preview"
export type TradeDecision = "GO" | "WAIT" | "NO"
export type EngineStatus = "ok" | "degraded" | "error" | "blocked"

// ─── Market Context ─────────────────────────────────────────────────────────

export interface UnderlyingQuote {
  symbol: string
  price: number
  previousClose: number
  changePercent: number
  volume: number
  avgVolume: number
  sma50: number
  sma200: number
  fetchedAt: string
  source: MarketDataSource
}

export interface OptionsChain {
  expirations: string[]       // ISO date strings, nearest 6
  putCallRatio: number | null
  callVolume: number | null
  putVolume: number | null
  fetchedAt: string
}

export interface ProviderHealth {
  status: "ok" | "degraded" | "down"
  latencyMs: number
  cached: boolean
  error?: string
  fetchedAt: string
}

export interface MarketContext {
  requestId: string
  ticker: string
  action: TradeAction
  quote: UnderlyingQuote | null
  chain: OptionsChain | null
  providerHealth: ProviderHealth
  theme?: string
  userContext?: string
  ts: string
}

// ─── Regime ─────────────────────────────────────────────────────────────────

export interface ProofRegimeSnapshot {
  name: string                    // e.g. "bullish-low-strong"
  trend: "bullish" | "bearish" | "neutral"
  volatility: "low" | "medium" | "high"
  momentum: "strong" | "weak" | "neutral"
  score: number                   // 0-1 composite confidence
  inputs: {
    sma20: number
    sma50: number
    rsi14: number
    atr14: number
    priceChange5d: number
    volumeRatio: number
  }
  confidence: number
  ts: string
}

// ─── Risk ────────────────────────────────────────────────────────────────────

export interface ProofRiskSnapshot {
  simCount: number
  medianPL: number
  pct10: number                   // 10th percentile (downside)
  pct90: number                   // 90th percentile (upside)
  maxDrawdown: number             // fraction of balance
  expectedReturn: number          // dollars
  sharpeRatio: number
  kellyFraction: number
  positionSizeRecommended: number // dollars
  riskLevel: "low" | "medium" | "high" | "extreme"
  ts: string
}

// ─── Deliberation ───────────────────────────────────────────────────────────

export interface ModelOutput {
  provider: string                // "groq", "openai", "arbitrator"
  modelVersion: string
  decision: TradeDecision
  confidence: number              // 0-100
  reasoning: string
  winLikelihoodPct: number | null
  recommendedAmount: number | null
  bullets?: {
    why: string
    risk: string
    amount: string
  }
  latencyMs: number
  ts: string
}

export interface DeliberationRound {
  roundId: number
  stage: "ROUND1" | "ROUND2" | "ARBITRATION"
  outputs: ModelOutput[]
  outcome: {
    decision: TradeDecision
    reason: string
    consensusStrength: number     // 0-1
  }
  ts: string
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface ScoringFactors {
  modelAgreement: number          // 0-1
  providerCredibility: number     // 0-1
  regimeAlignmentBonus: number    // -1 to 1
  riskPenalty: number             // -1 to 0
}

export interface ScoringResult {
  trustScore: number              // 0-100 final integer
  rawAvgScore: number             // unweighted avg model confidence
  agreementRatio: number          // 0-1
  penaltyFactor: number           // 0-1
  factors: ScoringFactors
  weights: {
    modelAgreement: number
    providerCredibility: number
    regimeAlignmentBonus: number
    riskPenalty: number
  }
  ts: string
}

// ─── Preflight ────────────────────────────────────────────────────────────────

export interface PreflightGate {
  name: string
  passed: boolean
  reason: string
}

export interface PreflightResult {
  pass: boolean
  reason: string
  gates: PreflightGate[]
}

// ─── Engine Events ────────────────────────────────────────────────────────────

export interface EngineEventMinimal {
  id: string
  requestId: string
  name: string
  stage: string
  status: EngineStatus
  durationMs?: number
  ts: string
}

// ─── Proof Bundle (canonical) ────────────────────────────────────────────────

export interface ProofBundle {
  requestId: string
  action: TradeAction
  ticker: string
  engineVersion: string

  marketContext: MarketContext
  regime: ProofRegimeSnapshot
  risk: ProofRiskSnapshot
  deliberation: DeliberationRound[]
  scoring: ScoringResult
  preflight: PreflightResult

  finalDecision: {
    action: TradeDecision
    reason: string
    trustScore: number
    recommendedAmount: number | null
    bullets?: {
      why: string
      risk: string
      amount: string
    }
  }

  engineDegraded: boolean
  warnings: string[]
  events: EngineEventMinimal[]
  ts: string
}

// ─── Orchestrator I/O ─────────────────────────────────────────────────────────

export interface SwarmParams {
  ticker: string
  action: TradeAction
  userId: string
  amount: number
  balance: number
  safetyMode?: string
  theme?: string
  userContext?: string
  requestId?: string
}

export interface SwarmResult {
  proofBundle: ProofBundle
  receiptId: string | null
  tradeId: string | null
}
