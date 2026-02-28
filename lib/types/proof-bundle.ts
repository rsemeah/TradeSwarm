// Full replacement — v3 spec canonical shape
// All monetary fields use explicit _ps (per share) and _total suffixes
// No silent unit mixing

export type Strategy = 'PCS' | 'CCS' | 'CDS'
export type Tier = 'A' | 'B' | 'C'
export type DeltaSource = 'exchange' | 'approximated' | 'unavailable'
export type SigmaSource = 'contract_iv' | 'rv20_proxy' | 'default_0.20'
export type ScenarioLabel = 'Win' | 'Partial' | 'Loss'
export type NewsConfidence = 'High' | 'Med' | 'Low' | 'None'
export type FillAssumption = 'mid'

export interface LegProof {
  role: 'short' | 'long'
  type: 'call' | 'put'
  strike: number
  bid: number
  ask: number
  mid_ps: number
  last: number
  open_interest: number
  volume: number
  implied_vol: number
  delta: number | null
  theta: number | null
  delta_source: DeltaSource
  sigma_source: SigmaSource
}

export interface ScoreComponents {
  ror_score: number
  pop_score: number
  iv_rv_score: number
  liquidity_score: number
}

export interface ScoreWeights {
  ror: 0.35
  pop: 0.25
  iv_rv: 0.2
  liquidity: 0.15
}

export interface ScoreProof {
  raw_score: number
  event_penalty: number
  regime_bonus: number
  total: number
  display: number
  components: ScoreComponents
  weights: ScoreWeights
  computed_at: string
}

export interface IvRvProof {
  current_iv: number
  rv20_low: number
  rv20_high: number
  position: number
  data_sufficient: boolean
}

export interface NewsResult {
  sentiment: number
  confidence: NewsConfidence
  sources_used: string[]
  headlines: string[]
}

export interface StressScenario {
  price: number
  pnl_total: number
  label: ScenarioLabel
}

export interface StressProof {
  sigma_used: number
  sigma_source: SigmaSource
  scenarios: {
    up_1s: StressScenario
    down_1s: StressScenario
    up_2s: StressScenario
    down_2s: StressScenario
  }
}

export interface CandidateFlags {
  earnings_within_dte: boolean
  fomc_within_5d: boolean
  cpi_within_3d: boolean
  nfp_within_3d: boolean
  low_liquidity: boolean
  iv_history_insufficient: boolean
  iv_data_missing: boolean
  delta_approximated: boolean
  catalyst_mode_trade: boolean
  fill_assumption_mid: true
  sized_at_hard_cap: boolean
}

export interface RegimeResult {
  regime: 'TRENDING' | 'HIGH_VOL' | 'LOW_VOL' | 'CHOPPY' | 'MEAN_REVERT'
  confidence: number
  source: string
}

export interface CandidateProofBundle {
  candidate_id: string
  generated_at: string
  data_timestamp: string
  source: string
  cache_hit: boolean
  ticker: string
  underlying_price: number
  strategy: Strategy
  tier: Tier
  dte: number
  expiry_date: string
  legs: LegProof[]
  net_credit_ps: number
  net_credit_total: number
  net_debit_ps: number
  net_debit_total: number
  max_loss_ps: number
  max_loss_total: number
  max_profit_ps: number
  max_profit_total: number
  breakeven_price: number
  contracts: number
  actual_risk_total: number
  fill_assumption: FillAssumption
  ROR: number
  score: ScoreProof
  iv_rv: IvRvProof
  regime: RegimeResult
  news_ticker: NewsResult
  news_macro: NewsResult
  flags: CandidateFlags
  sizing_modifier: number
  sizing_reason: string
  stress: StressProof
}

export interface ScanResult {
  scan_id: string
  scanned_at: string
  cached: boolean
  universe: string[]
  candidates: CandidateProofBundle[]
  empty: boolean
  empty_reason?: string
  filter_counts: Record<string, number>
  tier_counts: {
    A: number
    B: number
    C: number
  }
}

export interface TruthSerumFeaturesV1 {
  ticker: string
  strategy: string
  dte: number
  width: number
  credit: number
  iv_rank?: number | null
  regime?: string | null
  liquidity_score?: number | null
}

export interface ModelRound {
  round_id: string
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

export interface SafetyDecision {
  safety_status: "ALLOWED" | "BLOCKED"
  reason_code: string | null
  reasons: string[]
  max_size_hint: number
}

export interface DeterminismContext {
  market_snapshot_ref: string | null
  market_snapshot_hash: string
  engine_version: string
  config_hash: string
  determinism_hash: string
  random_seed: number | null
}

export interface CanonicalProofBundle {
  version: string
  model_provider: string
  model_version: string
  regime_snapshot: Record<string, unknown>
  risk_snapshot: Record<string, unknown>
  safety_decision: SafetyDecision
  model_rounds: ModelRound[]
  consensus_score: number
  trust_score: number
  execution_mode: string
  timestamp: string
  input_snapshot: {
    ticker: string
    requested_amount: number
    balance: number
    safety_mode?: string
    theme?: string
    user_context?: string
  }
  market_snapshot: {
    quote: unknown
    chain: unknown
    provider_health: unknown
    as_of: string
    source?: string
    latency_ms?: number
  }
  metadata?: {
    request_id?: string
    engine_version?: string
    warnings?: string[]
    safety_status?: string
    reason_code?: string | null
    determinism?: DeterminismContext
  }
}

const DEFAULT_NEWS: NewsResult = {
  sentiment: 0,
  confidence: 'None',
  sources_used: [],
  headlines: [],
}

const DEFAULT_FLAGS: CandidateFlags = {
  earnings_within_dte: false,
  fomc_within_5d: false,
  cpi_within_3d: false,
  nfp_within_3d: false,
  low_liquidity: false,
  iv_history_insufficient: false,
  iv_data_missing: false,
  delta_approximated: false,
  catalyst_mode_trade: false,
  fill_assumption_mid: true,
  sized_at_hard_cap: false,
}

const DEFAULT_STRESS: StressProof = {
  sigma_used: 0.2,
  sigma_source: 'default_0.20',
  scenarios: {
    up_1s: { price: 0, pnl_total: 0, label: 'Partial' },
    down_1s: { price: 0, pnl_total: 0, label: 'Partial' },
    up_2s: { price: 0, pnl_total: 0, label: 'Loss' },
    down_2s: { price: 0, pnl_total: 0, label: 'Loss' },
  },
}

/**
 * Backwards-compatible adapter for persisted/legacy bundles.
 * Always returns a v3-safe CandidateProofBundle shape.
 */
export function upgradeProofBundleToV3(old: unknown): CandidateProofBundle {
  const o = (typeof old === 'object' && old !== null ? old : {}) as Record<string, unknown>
  const netCreditPs = Number(o.net_credit_ps ?? o.net_credit ?? 0)
  const contracts = Number(o.contracts ?? 0)
  const defaultTotal = netCreditPs * 100 * contracts

  return {
    candidate_id: String(o.candidate_id ?? crypto.randomUUID()),
    generated_at: String(o.generated_at ?? new Date(0).toISOString()),
    data_timestamp: String(o.data_timestamp ?? new Date(0).toISOString()),
    source: String(o.source ?? 'legacy'),
    cache_hit: Boolean(o.cache_hit),
    ticker: String(o.ticker ?? 'UNKNOWN'),
    underlying_price: Number(o.underlying_price ?? 0),
    strategy: (o.strategy as Strategy) ?? 'PCS',
    tier: (o.tier as Tier) ?? 'C',
    dte: Number(o.dte ?? 0),
    expiry_date: String(o.expiry_date ?? new Date(0).toISOString().split('T')[0]),
    legs: Array.isArray(o.legs) ? (o.legs as LegProof[]) : [],
    net_credit_ps: netCreditPs,
    net_credit_total: Number(o.net_credit_total ?? defaultTotal),
    net_debit_ps: Number(o.net_debit_ps ?? 0),
    net_debit_total: Number(o.net_debit_total ?? 0),
    max_loss_ps: Number(o.max_loss_ps ?? 0),
    max_loss_total: Number(o.max_loss_total ?? 0),
    max_profit_ps: Number(o.max_profit_ps ?? 0),
    max_profit_total: Number(o.max_profit_total ?? 0),
    breakeven_price: Number(o.breakeven_price ?? 0),
    contracts,
    actual_risk_total: Number(o.actual_risk_total ?? 0),
    fill_assumption: 'mid',
    ROR: Number(o.ROR ?? 0),
    score: (o.score as ScoreProof) ?? {
      raw_score: 0,
      event_penalty: 0,
      regime_bonus: 0,
      total: 0,
      display: 0,
      components: {
        ror_score: 0,
        pop_score: 0,
        iv_rv_score: 0,
        liquidity_score: 0,
      },
      weights: { ror: 0.35, pop: 0.25, iv_rv: 0.2, liquidity: 0.15 },
      computed_at: new Date(0).toISOString(),
    },
    iv_rv: (o.iv_rv as IvRvProof) ?? {
      current_iv: 0,
      rv20_low: 0,
      rv20_high: 0,
      position: 0,
      data_sufficient: false,
    },
    regime: (o.regime as RegimeResult) ?? { regime: 'CHOPPY', confidence: 0, source: 'legacy' },
    news_ticker: (o.news_ticker as NewsResult) ?? DEFAULT_NEWS,
    news_macro: (o.news_macro as NewsResult) ?? DEFAULT_NEWS,
    flags: { ...DEFAULT_FLAGS, ...(o.flags as Partial<CandidateFlags> ?? {}) },
    sizing_modifier: Number(o.sizing_modifier ?? 1),
    sizing_reason: String(o.sizing_reason ?? 'legacy_defaults'),
    stress: (o.stress as StressProof) ?? DEFAULT_STRESS,
  }
}
