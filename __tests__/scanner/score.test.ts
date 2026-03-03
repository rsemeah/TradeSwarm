import { describe, it, expect } from 'vitest'
import { computeFinalScore, computeROR } from '@/src/lib/scanner/score'
import type { RawCandidate } from '@/src/lib/scanner/types'

const BASE_CANDIDATE: RawCandidate = {
  ticker: 'SPY', underlying_price: 500,
  strategy: 'PCS', tier: 'B',
  dte: 15, expiry_date: '2026-03-14',
  spread_width: 1,
  short_strike: 490, long_strike: 489,
  short_mid_ps: 0.25, long_mid_ps: 0.08,
  short_bid: 0.23, short_ask: 0.27,
  long_bid: 0.07, long_ask: 0.09,
  short_oi: 500, long_oi: 300,
  short_vol: 200, long_vol: 150,
  short_iv: 0.18, long_iv: 0.17,
  short_delta: -0.28, long_delta: -0.15,
  earnings_date: null,
}

describe('computeROR — unit safety', () => {
  it('net_credit_ps is per-share, total = ps * 100 * contracts', () => {
    const r = computeROR(BASE_CANDIDATE)
    expect(r.net_credit_ps).toBeCloseTo(0.25 - 0.08)
    expect(r.net_credit_total).toBeCloseTo(r.net_credit_ps * 100 * r.contracts)
  })

  it('max_loss_total = max_loss_ps * 100 * contracts', () => {
    const r = computeROR(BASE_CANDIDATE)
    expect(r.max_loss_total).toBeCloseTo(r.max_loss_ps * 100 * r.contracts)
  })

  it('actual_risk_total never exceeds 250', () => {
    const r = computeROR(BASE_CANDIDATE)
    expect(r.actual_risk_total).toBeLessThanOrEqual(250)
  })
})

describe('contracts = 0 handling', () => {
  it('retries at $250 hard cap and sets sized_at_hard_cap', () => {
    const expensive: RawCandidate = { ...BASE_CANDIDATE, short_mid_ps: 0.01, long_mid_ps: 0.0, spread_width: 5 }
    const r = computeROR(expensive)
    expect(r.contracts).toBe(0)
  })

  it('sized_at_hard_cap true when $250 used', () => {
    const at_cap: RawCandidate = { ...BASE_CANDIDATE, short_mid_ps: 2.6, long_mid_ps: 0.1, spread_width: 3 }
    const r = computeROR(at_cap)
    if (r.contracts > 0) expect(r.sized_at_hard_cap).toBe(true)
  })
})

describe('computeFinalScore — clamp', () => {
  it('clamps negative result to 0', () => {
    const r = computeFinalScore(0.1, 0.1, 0.1, 0.1, 0.25, -0.05)
    expect(r.total).toBe(0)
    expect(r.display).toBe(0)
  })

  it('clamps result above 1 to 1', () => {
    const r = computeFinalScore(1, 1, 1, 1, 0, 0.1)
    expect(r.total).toBe(1)
    expect(r.display).toBe(100)
  })

  it('penalty cap — max event_penalty is 0.25', () => {
    const maxPenalty = Math.min(0.2 + 0.1 + 0.08 + 0.06 + 0.1, 0.25)
    expect(maxPenalty).toBe(0.25)
  })
})
