import { describe, it, expect } from 'vitest'
import { rankAndFilter, buildScanResult } from '@/src/lib/scanner/rank'
import type { CandidateProofBundle } from '@/lib/types/proof-bundle'

function makeCandidate(ticker: string, tier: 'A' | 'B' | 'C', score: number, ror: number): CandidateProofBundle {
  return {
    candidate_id: `${ticker}-${tier}-${score}`,
    ticker, tier,
    ROR: ror,
    score: {
      raw_score: score, event_penalty: 0, regime_bonus: 0,
      total: score, display: Math.round(score * 100),
      components: { ror_score: 0, pop_score: 0, iv_rv_score: 0, liquidity_score: 0 },
      weights: { ror: 0.35, pop: 0.25, iv_rv: 0.2, liquidity: 0.15 },
      computed_at: new Date().toISOString(),
    },
    generated_at: '', data_timestamp: '', source: 'yfinance', cache_hit: false,
    strategy: 'PCS', dte: 15, expiry_date: '', underlying_price: 500,
    legs: [], net_credit_ps: 0, net_credit_total: 0, net_debit_ps: 0, net_debit_total: 0,
    max_loss_ps: 0, max_loss_total: 0, max_profit_ps: 0, max_profit_total: 0,
    breakeven_price: 0, contracts: 1, actual_risk_total: 200, fill_assumption: 'mid',
    iv_rv: { current_iv: 0, rv20_low: 0, rv20_high: 0, position: 0.5, data_sufficient: false },
    regime: { regime: 'CHOPPY', confidence: 0.5, source: 'default' },
    news_ticker: { sentiment: 0, confidence: 'None', sources_used: [], headlines: [] },
    news_macro: { sentiment: 0, confidence: 'None', sources_used: [], headlines: [] },
    flags: {
      earnings_within_dte: false, fomc_within_5d: false, cpi_within_3d: false,
      nfp_within_3d: false, low_liquidity: false, iv_history_insufficient: false,
      iv_data_missing: false, delta_approximated: false, catalyst_mode_trade: false,
      fill_assumption_mid: true, sized_at_hard_cap: false,
    },
    sizing_modifier: 1,
    sizing_reason: 'Full size',
    stress: {
      sigma_used: 0.18,
      sigma_source: 'contract_iv',
      scenarios: {
        up_1s: { price: 0, pnl_total: 0, label: 'Win' },
        down_1s: { price: 0, pnl_total: 0, label: 'Loss' },
        up_2s: { price: 0, pnl_total: 0, label: 'Win' },
        down_2s: { price: 0, pnl_total: 0, label: 'Loss' },
      },
    },
  }
}

describe('diversity constraint', () => {
  it('max 3 candidates per underlying', () => {
    const candidates = [
      makeCandidate('SPY', 'B', 0.8, 0.15),
      makeCandidate('SPY', 'B', 0.78, 0.14),
      makeCandidate('SPY', 'B', 0.76, 0.13),
      makeCandidate('SPY', 'B', 0.74, 0.13),
      makeCandidate('QQQ', 'B', 0.72, 0.13),
    ]
    const result = rankAndFilter(candidates, false, {})
    expect(result.filter((c) => c.ticker === 'SPY').length).toBeLessThanOrEqual(3)
  })
})

describe('empty board', () => {
  it('returns empty true when fewer than 5 candidates', () => {
    const candidates = [makeCandidate('SPY', 'B', 0.8, 0.15), makeCandidate('QQQ', 'B', 0.75, 0.14)]
    const ranked = rankAndFilter(candidates, false, {})
    const result = buildScanResult('test-scan', ['SPY', 'QQQ'], ranked, {}, false)
    expect(result.empty).toBe(true)
    expect(result.empty_reason).toBe('No strong deals found today.')
  })
})

describe('Tier A gating', () => {
  it('excludes Tier A when catalyst_mode is false', () => {
    const candidates = [makeCandidate('SPY', 'A', 0.9, 0.12), makeCandidate('SPY', 'B', 0.8, 0.15)]
    const result = rankAndFilter(candidates, false, {})
    expect(result.every((c) => c.tier !== 'A')).toBe(true)
  })

  it('includes Tier A when catalyst_mode is true', () => {
    const result = rankAndFilter([makeCandidate('SPY', 'A', 0.9, 0.12)], true, {})
    expect(result.some((c) => c.tier === 'A')).toBe(true)
  })
})
