import { describe, it, expect } from "vitest"
import { rankAndFilter } from "@/lib/scanner/rank"
import type { ScanResult } from "@/lib/types/proof-bundle"

function makeCand(overrides: Partial<ScanResult> = {}): ScanResult {
  const base: ScanResult = {
    ticker: "SPY",
    spreadType: "PCS",
    tier: "B",
    expiration: "2025-03-21",
    dte: 14,
    shortLeg: { strike: 480, expiration: "2025-03-21", right: "P", side: "short", bid: 1.20, ask: 1.30, mid_ps: 1.25, iv: 0.18, delta: -0.30, oi: 2000, volume: 500 },
    longLeg: { strike: 479, expiration: "2025-03-21", right: "P", side: "long", bid: 0.80, ask: 0.90, mid_ps: 0.85, iv: 0.20, delta: -0.20, oi: 1500, volume: 300 },
    credit_ps: 0.40,
    maxLoss_ps: 0.60,
    ror_ps: 0.667,
    pop: 0.70,
    contracts: 2,
    score: { ror_ps: 0.667, pop: 0.70, ivRvPosition: 1.2, liquidity: 0.8, raw: 0.75, eventPenalty: 0, regimeBonus: 0.04, final: 0.79 },
    ivRv: { currentIv: 0.18, rv20: 0.15, position: 1.2, sufficient: true },
    news: { hasEarnings: false, hasFedEvent: false, hasMacroEvent: false, penaltyApplied: 0, sources: [] },
    stress: { expected_move_1sigma: 5, scenarios: [], contracts: 2, max_loss_total: -120 },
    flags: { sized_at_hard_cap: false, catalyst_mode_trade: false, iv_rich: true, event_window: false },
    scanId: "test",
    candidateId: "c1",
    ts: new Date().toISOString(),
    ...overrides,
  }
  return base
}

describe("rankAndFilter", () => {
  it("applies min ROR per tier", () => {
    const tooLowRorB = makeCand({ tier: "B", ror_ps: 0.05 }) // min is 0.12 for B
    const goodRorB = makeCand({ tier: "B", ror_ps: 0.15, candidateId: "c2" })
    const { ranked } = rankAndFilter([tooLowRorB, goodRorB], 2)
    expect(ranked.every((c) => c.candidateId !== "c1")).toBe(true)
    expect(ranked.some((c) => c.candidateId === "c2")).toBe(true)
  })

  it("respects max 3 candidates per underlying", () => {
    const cands = Array.from({ length: 5 }, (_, i) =>
      makeCand({ ticker: "NVDA", candidateId: `c${i}`, ror_ps: 0.20 - i * 0.01 })
    )
    const { ranked } = rankAndFilter(cands, 5)
    const nvdaCount = ranked.filter((c) => c.ticker === "NVDA").length
    expect(nvdaCount).toBeLessThanOrEqual(3)
  })

  it("respects tier targets", () => {
    const tierA = Array.from({ length: 8 }, (_, i) =>
      makeCand({ tier: "A", candidateId: `a${i}`, ror_ps: 0.15 + i * 0.01, ticker: `T${i}` })
    )
    const { ranked, tierCounts } = rankAndFilter(tierA, 8)
    expect(tierCounts.A).toBeLessThanOrEqual(5) // tier A target = 5
  })

  it("marks empty=true if fewer than 5 total candidates", () => {
    const { empty } = rankAndFilter([makeCand({ ror_ps: 0.20 })], 1)
    expect(empty).toBe(true)
  })

  it("marks empty=false with 5+ candidates", () => {
    const cands = Array.from({ length: 7 }, (_, i) =>
      makeCand({ candidateId: `c${i}`, ticker: `T${i}`, ror_ps: 0.20 })
    )
    const { empty } = rankAndFilter(cands, 7)
    expect(empty).toBe(false)
  })

  it("sorts by score.final descending", () => {
    const low = makeCand({ candidateId: "low", score: { ...makeCand().score, final: 0.30 }, ror_ps: 0.20, ticker: "A" })
    const high = makeCand({ candidateId: "high", score: { ...makeCand().score, final: 0.90 }, ror_ps: 0.20, ticker: "B" })
    const { ranked } = rankAndFilter([low, high], 2)
    if (ranked.length >= 2) {
      expect(ranked[0].score.final).toBeGreaterThanOrEqual(ranked[1].score.final)
    }
  })
})
