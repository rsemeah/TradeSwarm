import { describe, it, expect } from "vitest"
import { computeRv20, computeIvRvPosition } from "@/lib/indicators/rv20"

describe("computeRv20", () => {
  it("returns insufficient=false for < 22 closes", () => {
    const closes = Array.from({ length: 10 }, (_, i) => 100 + i)
    const { sufficient } = computeRv20(closes)
    expect(sufficient).toBe(false)
  })

  it("returns sufficient=true for >= 22 closes", () => {
    const closes = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i) * 5)
    const { sufficient } = computeRv20(closes)
    expect(sufficient).toBe(true)
  })

  it("fallback RV=0.5 for empty input", () => {
    const { current } = computeRv20([])
    expect(current).toBe(0.5)
  })

  it("current is positive and annualized", () => {
    // Prices with ~1% daily move → annualized ~16%
    const closes = Array.from({ length: 30 }, (_, i) => 100 * Math.exp(0.01 * i))
    const { current } = computeRv20(closes)
    expect(current).toBeGreaterThan(0)
    expect(current).toBeLessThan(5) // sanity: not absurd
  })

  it("series length equals closes.length - window", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 5)
    const { series } = computeRv20(closes)
    // 30 closes → 29 returns → 10 windows (30-1-20+1=10)
    expect(series.length).toBe(10)
  })
})

describe("computeIvRvPosition", () => {
  it("returns position = iv / rv", () => {
    const { position } = computeIvRvPosition(0.30, 0.20)
    expect(position).toBeCloseTo(1.5)
  })

  it("returns position = 1 and sufficient=false when rv=0", () => {
    const { position, sufficient } = computeIvRvPosition(0.30, 0)
    expect(position).toBe(1)
    expect(sufficient).toBe(false)
  })
})
