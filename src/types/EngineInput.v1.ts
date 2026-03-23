export const ENGINE_INPUT_VERSION = "EngineInput.v1" as const

export interface EngineInputV1 {
  schema_version: typeof ENGINE_INPUT_VERSION
  run: {
    run_id: string
    idempotency_key?: string
    mode: "preview" | "simulate" | "execute"
    engine_version: string
    config_hash: string
    created_utc: string
  }
  request: {
    ticker: string
    amount_usd: number
    intent?: string
    user_timezone?: string
  }
  snapshot: {
    market_snapshot_hash: string
    market_snapshot: {
      quote: Record<string, unknown> | null
      chain: unknown
      provider_health: unknown
      as_of: string
      source?: string
      latency_ms?: number
    }
  }
  features: {
    trust_score: number
    consensus_score: number
    regime_snapshot: Record<string, unknown>
    risk_snapshot: Record<string, unknown>
    preflight_pass: boolean
    final_action: string
  }
  stochastic: {
    random_seed?: string | null
  }
}
