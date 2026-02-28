import type { IvRvProof, NewsResult, RegimeResult } from '@/lib/types/proof-bundle'
import type { Rv20Result } from '@/src/lib/indicators/rv20'
import { computeIvRvPosition } from '@/src/lib/indicators/rv20'
import { getMacroFlags } from '@/src/lib/news/calendar'
import { computeDelta } from './delta'
import type { RawCandidate } from './types'

const WEIGHTS = { ror: 0.35, pop: 0.25, iv_rv: 0.2, liquidity: 0.15 } as const
const ROR_TARGET = 0.15
const POP_MIN = 0.5
const POP_MAX = 0.85
const MAX_BID_ASK_PCT = 0.15
const OI_TARGET = 500

function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)) }

export function computeROR(candidate: RawCandidate) {
  const { strategy, short_mid_ps, long_mid_ps, spread_width } = candidate
  let ror = 0
  let net_credit_ps = 0
  let net_debit_ps = 0
  let max_loss_ps = 0
  let max_profit_ps = 0

  if (strategy === 'PCS' || strategy === 'CCS') {
    net_credit_ps = short_mid_ps - long_mid_ps
    max_loss_ps = spread_width - net_credit_ps
    ror = max_loss_ps > 0 ? net_credit_ps / max_loss_ps : 0
    max_profit_ps = net_credit_ps
  } else {
    net_debit_ps = long_mid_ps - short_mid_ps
    max_loss_ps = net_debit_ps
    max_profit_ps = spread_width - net_debit_ps
    ror = net_debit_ps > 0 ? max_profit_ps / net_debit_ps : 0
  }

  const loss_per_contract = max_loss_ps * 100
  let contracts = loss_per_contract > 0 ? Math.floor(200 / loss_per_contract) : 0
  let sized_at_hard_cap = false
  if (contracts === 0 && loss_per_contract > 0) {
    contracts = Math.floor(250 / loss_per_contract)
    if (contracts > 0) sized_at_hard_cap = true
  }

  const actual_risk_total = max_loss_ps * 100 * contracts
  const net_credit_total = net_credit_ps * 100 * contracts
  const net_debit_total = net_debit_ps * 100 * contracts
  const max_loss_total = max_loss_ps * 100 * contracts
  max_profit_ps = strategy === 'PCS' || strategy === 'CCS' ? net_credit_ps : spread_width - net_debit_ps
  const max_profit_total = max_profit_ps * 100 * contracts
  const ror_score = Math.min(ror / ROR_TARGET, 1)

  return {
    ror, ror_score,
    net_credit_ps, net_credit_total,
    net_debit_ps, net_debit_total,
    max_loss_ps, max_loss_total,
    max_profit_ps, max_profit_total,
    contracts, actual_risk_total,
    sized_at_hard_cap,
  }
}

export function computePOP(candidate: RawCandidate, rv20: Rv20Result) {
  const { strategy, short_delta, long_delta, short_iv, underlying_price, short_strike, long_strike, dte } = candidate
  let effective_delta: number

  if (strategy === 'PCS' || strategy === 'CCS') {
    effective_delta = short_delta !== null
      ? Math.abs(short_delta)
      : Math.abs(computeDelta(underlying_price, short_strike, dte / 365, short_iv || rv20.current, strategy === 'PCS' ? 'put' : 'call'))
  } else {
    effective_delta = long_delta !== null
      ? Math.abs(long_delta)
      : Math.abs(computeDelta(underlying_price, long_strike, dte / 365, candidate.long_iv || rv20.current, 'call'))
  }

  const pop_approx = strategy === 'CDS' ? effective_delta : 1 - effective_delta
  const pop_score = clamp((pop_approx - POP_MIN) / (POP_MAX - POP_MIN), 0, 1)
  return { pop_approx, pop_score }
}

export function computeIvRv(candidate: RawCandidate, rv20: Rv20Result): { iv_rv: IvRvProof; iv_rv_score: number } {
  const current_iv = candidate.short_iv || 0
  const { position, sufficient } = computeIvRvPosition(current_iv, rv20)
  const iv_rv: IvRvProof = { current_iv, rv20_low: rv20.low, rv20_high: rv20.high, position, data_sufficient: sufficient }
  return { iv_rv, iv_rv_score: candidate.strategy === 'CDS' ? 1 - position : position }
}

export function computeLiquidity(candidate: RawCandidate): number {
  const { short_bid, short_ask, short_oi } = candidate
  const mid = (short_bid + short_ask) / 2
  const bid_ask_pct = mid > 0 ? (short_ask - short_bid) / mid : MAX_BID_ASK_PCT
  const liquidity_raw = clamp(1 - bid_ask_pct / MAX_BID_ASK_PCT, 0, 1)
  const oi_factor = clamp(short_oi / OI_TARGET, 0, 1)
  return liquidity_raw * 0.7 + oi_factor * 0.3
}

export function computeEventPenalty(candidate: RawCandidate, newsSentiment: number) {
  const flags = getMacroFlags(candidate.earnings_date ?? undefined, candidate.dte)
  const news_flag = Math.max(0, -newsSentiment)
  let penalty =
    (flags.earnings_within_dte ? 0.2 : 0) +
    (flags.fomc_within_5d ? 0.1 : 0) +
    (flags.cpi_within_3d ? 0.08 : 0) +
    (flags.nfp_within_3d ? 0.06 : 0) +
    news_flag * 0.1

  const event_penalty = Math.min(penalty, 0.25)
  let sizing_modifier = 1
  const reasons: string[] = []
  if (flags.earnings_within_dte) { sizing_modifier = Math.min(sizing_modifier, 0.5); reasons.push('earnings within window') }
  if (flags.fomc_within_5d) { sizing_modifier = Math.min(sizing_modifier, 0.75); reasons.push('FOMC within 5 days') }
  if (flags.cpi_within_3d) { sizing_modifier = Math.min(sizing_modifier, 0.8); reasons.push('CPI within 3 days') }
  if (newsSentiment < -0.5) { sizing_modifier = Math.min(sizing_modifier, 0.6); reasons.push('strong negative news') }
  else if (newsSentiment < -0.3) { sizing_modifier = Math.min(sizing_modifier, 0.75); reasons.push('negative news') }

  return { event_penalty, sizing_modifier, sizing_reason: reasons.length ? `Reduced from $200 — ${reasons.join(', ')}` : 'Full size' }
}

export function computeRegimeBonus(candidate: RawCandidate, regime: RegimeResult, newsSentiment: number): number {
  const { strategy } = candidate
  const r = regime.regime
  let direction_match = 0
  if (r === 'TRENDING' && strategy === 'CDS') direction_match = 1
  else if (r === 'HIGH_VOL' && (strategy === 'PCS' || strategy === 'CCS')) direction_match = 1
  else if (r === 'LOW_VOL' && strategy === 'CDS') direction_match = 1
  else if (r === 'MEAN_REVERT' && (strategy === 'PCS' || strategy === 'CCS')) direction_match = 0.5
  else if (r === 'CHOPPY') direction_match = 0
  else direction_match = -0.5

  const regime_component = regime.confidence * direction_match * 0.05
  const news_regime_boost = newsSentiment > 0 ? newsSentiment * 0.05 : 0
  return regime_component + news_regime_boost
}

export function computeFinalScore(
  ror_score: number,
  pop_score: number,
  iv_rv_score: number,
  liquidity_score: number,
  event_penalty: number,
  regime_bonus: number,
): { raw_score: number; total: number; display: number } {
  const raw_score = ror_score * WEIGHTS.ror + pop_score * WEIGHTS.pop + iv_rv_score * WEIGHTS.iv_rv + liquidity_score * WEIGHTS.liquidity
  const total = clamp(raw_score - event_penalty + regime_bonus, 0, 1)
  return { raw_score, total, display: Math.round(total * 100) }
}
