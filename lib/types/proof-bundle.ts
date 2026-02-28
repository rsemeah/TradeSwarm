// ─── Trade Proof Bundle (orchestrator output) ─────────────────────────────────

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

// ─── CandidateProofBundle (scanner output) ────────────────────────────────────

/**
 * Unit conventions:
 *   _ps   = per-share (or per-contract for options, per-$1 width)
 *   _total = net dollar P&L after contract multiplier (×100) and position sizing
 *
 * Persisted in scan_candidates.proof_bundle (JSONB).
 */

export interface LegProof {
  strike: number
  expiration: string      // YYYY-MM-DD
  right: "C" | "P"
  side: "short" | "long"
  bid: number
  ask: number
  mid_ps: number
  iv: number | null
  delta: number | null
  oi: number
  volume: number
}

export interface IvRvProof {
  currentIv: number
  rv20: number
  position: number
  sufficient: boolean
}

export interface NewsResult {
  hasEarnings: boolean
  hasFedEvent: boolean
  hasMacroEvent: boolean
  penaltyApplied: number  // 0..0.25
  sources: string[]
}

export interface ScoreProof {
  ror_ps: number
  pop: number
  ivRvPosition: number
  liquidity: number
  raw: number
  eventPenalty: number
  regimeBonus: number
  final: number           // clamped 0..1
}

export type StressScenario = "+1σ" | "+2σ" | "-1σ" | "-2σ"

export interface StressRow {
  scenario: StressScenario
  underlyingMove_pct: number
  pnl_ps: number
  pnl_total: number
}

export interface StressProof {
  expected_move_1sigma: number
  scenarios: StressRow[]
  contracts: number
  max_loss_total: number
}

export interface CandidateFlags {
  sized_at_hard_cap: boolean
  catalyst_mode_trade: boolean
  iv_rich: boolean
  event_window: boolean
}

export type SpreadType = "PCS" | "CCS" | "CDS"

export interface ScanResult {
  ticker: string
  spreadType: SpreadType
  tier: "A" | "B" | "C"
  expiration: string
  dte: number
  shortLeg: LegProof
  longLeg: LegProof
  credit_ps: number
  maxLoss_ps: number
  ror_ps: number
  pop: number
  contracts: number
  score: ScoreProof
  ivRv: IvRvProof
  news: NewsResult
  stress: StressProof
  flags: CandidateFlags
  scanId: string
  candidateId: string
  ts: string
}

export interface CandidateProofBundle {
  scanId: string
  ticker: string
  regime: {
    trend: string
    volatility: string
    momentum: string
    confidence: number
  }
  candidates: ScanResult[]
  rankingSummary: {
    totalScanned: number
    passed: number
    tierCounts: { A: number; B: number; C: number }
    empty: boolean
  }
  ts: string
}
