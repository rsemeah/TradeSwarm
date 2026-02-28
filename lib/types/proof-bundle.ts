export type DecisionMode = "preview" | "simulate" | "execute" | "analyze"

export type SafetyStatus = "ALLOWED" | "BLOCKED"

export interface InputSnapshot {
  ticker: string
  requested_amount: number
  balance: number
  safety_mode: string
  theme?: string
  user_context?: string
}

export interface MarketSnapshot {
  quote: Record<string, unknown> | null
  chain: Record<string, unknown> | null
  provider_health: Record<string, unknown>
  as_of: string
}

export interface SafetyDecision {
  safety_status: SafetyStatus
  reason_code: string | null
  reasons: string[]
  max_size_hint: number
}

export interface ModelRound {
  round_id: number
  stage: string
  providers: Array<{
    provider: string
    model_version: string
    decision: string
    confidence: number
    reasoning: string
  }>
  outcome: {
    decision: string
    reason: string
    consensus_strength: number
  }
  ts: string
}

export interface CanonicalProofBundle {
  version: string
  model_provider: string
  model_version: string
  regime_snapshot: Record<string, unknown> | null
  risk_snapshot: Record<string, unknown> | null
  safety_decision: SafetyDecision
  model_rounds: ModelRound[]
  consensus_score: number
  trust_score: number
  execution_mode: Exclude<DecisionMode, "analyze">
  timestamp: string
  input_snapshot: InputSnapshot
  market_snapshot: MarketSnapshot
  metadata?: Record<string, unknown>
}
