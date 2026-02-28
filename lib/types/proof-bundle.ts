export type DecisionMode = "preview" | "simulate" | "execute" | "analyze"

export interface ProofEnvelope {
  receipt_id: string
  parent_receipt_id?: string | null
  timestamp: string
  actor: "system" | "user" | "admin"
  action_type: DecisionMode
  outcome: "GO" | "WAIT" | "NO" | "SIMULATE" | "ERROR"
}

export interface ScoringFactor {
  key: string
  value: number
  note: string
}

export interface TradeProofBundle {
  envelope: ProofEnvelope
  market_context: Record<string, unknown>
  regime: Record<string, unknown> | null
  risk: Record<string, unknown> | null
  deliberation: Record<string, unknown>
  scoring: {
    trustScore: number
    factors: ScoringFactor[]
    ts: string
  } | null
  model_versions: Record<string, string>
  provenance: {
    data_source: string
    delayed_data_possible: boolean
    quote_ts?: string
    chain_ts?: string
  }
  engine_timeline: Array<{
    stage: string
    status: "OK" | "WARN" | "ERROR"
    durationMs?: number
    ts: string
  }>
  metadata?: Record<string, unknown>
}

export interface TruthSerumFeaturesV1 {
  features_version: "features_v1"
  symbol: string
  side: "buy" | "sell"
  spreadPct: number
  liquidityProxy: number
  regimeScore: number
  riskDrawdown: number
  trustScore?: number
}
