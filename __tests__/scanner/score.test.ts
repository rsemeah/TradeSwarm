import { describe, it, expect } from "vitest"
import { scoreCandidate } from "@/lib/scanner/score"
import type { ScanResult } from "@/lib/types/proof-bundle"

type CandidateInput = Omit<ScanResult, "score" | "flags" | "ivRv" | "news" | "stress">

function makeCandidate(overrides: Partial<CandidateInput> = {}): CandidateInput {
  return {
    ticker: "SPY",
    spreadType: "PCS",
    tier: "B",
    expiration: "2025-03-21",
    dte: 14,
    shortLeg: {
      strike: 480,
      expiration: "2025-03-21",
      right: "P",
      side: "short",
      bid: 1.20,
      ask: 1.30,
      mid_ps: 1.25,
      iv: 0.18,
      delta: -0.30,
      oi: 2000,
      volume: 500,
    },
    longLeg: {
      strike: 479,
      expiration: "2025-03-21",
      right: "P",
      side: "long",
      bid: 0.80,
      ask: 0.90,
      mid_ps: 0.85,
      iv: 0.20,
      delta: -0.20,
      oi: 1500,
      volume: 300,
    },
    credit_ps: 0.40,
    maxLoss_ps: 0.60,
    ror_ps: 0.40 / 0.60,
    pop: 0.70,
    contracts: 1,
    scanId: "test-scan",
    candidateId: "test-cand",
    ts: new Date().toISOString(),
    ...overrides,
  }
}

const defaultIvRv = { position: 1.2, sufficient: true }
const defaultNews = {
  hasEarnings: false,
  hasFedEvent: false,
  hasMacroEvent: false,
  penaltyApplied: 0,
  sources: [],
}

describe("scoreCandidate", () => {
  it("returns a score between 0 and 1", () => {
    const { score } = scoreCandidate({
      candidate: makeCandidate(),
      ivRv: defaultIvRv,
      news: defaultNews,
      regimeConfidence: 0.8,
      regimeBullish: true,
      balance: 10_000,
    })
    expect(score.final).toBeGreaterThanOrEqual(0)
    expect(score.final).toBeLessThanOrEqual(1)
  })

  it("applies event penalty correctly", () => {
    const newsWithEarnings = { ...defaultNews, hasEarnings: true, penaltyApplied: 0.20 }
    const withPenalty = scoreCandidate({
      candidate: makeCandidate(),
      ivRv: defaultIvRv,
      news: newsWithEarnings,
      regimeConfidence: 0.8,
      regimeBullish: true,
      balance: 10_000,
    })
    const withoutPenalty = scoreCandidate({
      candidate: makeCandidate(),
      ivRv: defaultIvRv,
      news: defaultNews,
      regimeConfidence: 0.8,
      regimeBullish: true,
      balance: 10_000,
    })
    expect(withPenalty.score.final).toBeLessThan(withoutPenalty.score.final)
    expect(withPenalty.score.eventPenalty).toBe(0.20)
  })

  it("sizes at least 1 contract", () => {
    const { contracts } = scoreCandidate({
      candidate: makeCandidate({ maxLoss_ps: 50 }), // huge max loss per share
      ivRv: defaultIvRv,
      news: defaultNews,
      regimeConfidence: 0.5,
      regimeBullish: true,
      balance: 500,
    })
    expect(contracts).toBeGreaterThanOrEqual(1)
  })

  it("sets sized_at_hard_cap when floor sizing returns 0", () => {
    const { flags } = scoreCandidate({
      candidate: makeCandidate({ maxLoss_ps: 999 }),
      ivRv: defaultIvRv,
      news: defaultNews,
      regimeConfidence: 0.5,
      regimeBullish: true,
      balance: 100,
    })
    expect(flags.sized_at_hard_cap).toBe(true)
  })

  it("caps contracts at 10", () => {
    const { contracts } = scoreCandidate({
      candidate: makeCandidate({ maxLoss_ps: 0.01 }),
      ivRv: defaultIvRv,
      news: defaultNews,
      regimeConfidence: 0.8,
      regimeBullish: true,
      balance: 100_000,
    })
    expect(contracts).toBeLessThanOrEqual(10)
  })
})
