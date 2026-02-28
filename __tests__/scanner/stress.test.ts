import { describe, it, expect } from "vitest"
import { computeStress } from "@/lib/scanner/stress"

function makePcs(overrides = {}) {
  return {
    spreadType: "PCS" as const,
    shortLeg: { strike: 480, expiration: "2025-03-21", right: "P" as const, side: "short" as const, bid: 1.20, ask: 1.30, mid_ps: 1.25, iv: 0.18, delta: -0.30, oi: 2000, volume: 500 },
    longLeg: { strike: 479, expiration: "2025-03-21", right: "P" as const, side: "long" as const, bid: 0.80, ask: 0.90, mid_ps: 0.85, iv: 0.20, delta: -0.20, oi: 1500, volume: 300 },
    credit_ps: 0.40,
    maxLoss_ps: 0.60,
    underlyingPrice: 490,
    atmIv: 0.20,
    dte: 14,
    contracts: 2,
    ...overrides,
  }
}

describe("computeStress", () => {
  it("produces 4 scenarios", () => {
    const result = computeStress(makePcs())
    expect(result.scenarios).toHaveLength(4)
    const scenarios = result.scenarios.map((s) => s.scenario)
    expect(scenarios).toContain("+1σ")
    expect(scenarios).toContain("-1σ")
    expect(scenarios).toContain("+2σ")
    expect(scenarios).toContain("-2σ")
  })

  it("PCS profits when price moves up (+2σ)", () => {
    const result = computeStress(makePcs())
    const up2 = result.scenarios.find((s) => s.scenario === "+2σ")!
    // Price moves up → put spread expires worthless → profit = credit
    expect(up2.pnl_ps).toBeCloseTo(0.40, 1)
  })

  it("PCS loses when price moves down (-2σ)", () => {
    const result = computeStress(makePcs())
    const down2 = result.scenarios.find((s) => s.scenario === "-2σ")!
    // Price moves far below → max loss
    expect(down2.pnl_ps).toBeCloseTo(-0.60, 1)
  })

  it("pnl_total = pnl_ps × 100 × contracts", () => {
    const result = computeStress(makePcs({ contracts: 3 }))
    for (const row of result.scenarios) {
      const expected = Math.round(row.pnl_ps * 100 * 3 * 100) / 100
      expect(row.pnl_total).toBeCloseTo(expected, 1)
    }
  })

  it("expected_move_1sigma = S × σ × √(DTE/365)", () => {
    const result = computeStress(makePcs())
    const expected = 490 * 0.20 * Math.sqrt(14 / 365)
    expect(result.expected_move_1sigma).toBeCloseTo(expected, 1)
  })

  it("max_loss_total is the minimum pnl_total", () => {
    const result = computeStress(makePcs())
    const min = Math.min(...result.scenarios.map((s) => s.pnl_total))
    expect(result.max_loss_total).toBe(min)
  })
})
