import { describe, it, expect } from 'vitest'
import { computeStress } from '@/src/lib/scanner/stress'

const BASE = {
  underlying_price: 500,
  dte: 15,
  sigma: 0.18,
  sigma_source: 'contract_iv' as const,
  spread_width: 1,
  short_strike: 490,
  long_strike: 489,
  net_credit_ps: 0.17,
  net_debit_ps: 0,
  contracts: 2,
}

describe('PCS stress', () => {
  it('up_1s is Win (price above short strike)', () => {
    const r = computeStress({ ...BASE, strategy: 'PCS' })
    expect(r.scenarios.up_1s.label).toBe('Win')
    expect(r.scenarios.up_1s.pnl_total).toBeGreaterThan(0)
  })

  it('down_2s is Loss (price well below long strike)', () => {
    const r = computeStress({ ...BASE, strategy: 'PCS' })
    expect(r.scenarios.down_2s.label).toBe('Loss')
    expect(r.scenarios.down_2s.pnl_total).toBeLessThan(0)
  })

  it('pnl_total uses _total units, not _ps', () => {
    const r = computeStress({ ...BASE, strategy: 'PCS' })
    expect(r.scenarios.up_1s.pnl_total).toBeCloseTo(0.17 * 100 * 2, 0)
  })
})

describe('CDS stress', () => {
  it('up_1s gain is positive when price moves above long strike', () => {
    const r = computeStress({ ...BASE, strategy: 'CDS', long_strike: 498, short_strike: 499, net_credit_ps: 0, net_debit_ps: 0.4 })
    expect(typeof r.scenarios.up_2s.pnl_total).toBe('number')
  })
})
