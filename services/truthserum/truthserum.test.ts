/**
 * TruthSerum Test Suite (T03)
 * Run: npx jest services/truthserum/truthserum.test.ts
 *
 * Sprint 1 gate requirement:
 *   - PASS on valid synthetic input
 *   - FAIL on Yahoo Finance source
 *   - FAIL on stale quote
 *   - FAIL on HARAM ticker in halal mode
 *   - FAIL on low consensus
 */

import { validateWithTruthSerum } from "./index"
import type { TruthSerumInput } from "./types"

const FRESH_TIMESTAMP = new Date(Date.now() - 30_000).toISOString() // 30s ago
const STALE_TIMESTAMP = new Date(Date.now() - 600_000).toISOString() // 10 min ago

const validInput: TruthSerumInput = {
  ticker: "AAPL",
  dataSource: "POLYGON_REALTIME",
  quoteTimestamp: FRESH_TIMESTAMP,
  engineVersion: "1.0.0",
  requestId: "test-req-001",
  halalMode: false,
  action: "simulate",
  deliberationConsensus: 0.75,
  trustScore: 65,
}

describe("TruthSerum — PASS cases", () => {
  test("valid simulate input returns PASS", () => {
    const result = validateWithTruthSerum(validInput)
    expect(result.verdict).toBe("PASS")
    expect(result.failReasons).toHaveLength(0)
    expect(result.receiptHash).toHaveLength(64) // SHA-256 hex
  })

  test("preview action skips consensus + trust score checks", () => {
    const input: TruthSerumInput = {
      ...validInput,
      action: "preview",
      deliberationConsensus: undefined,
      trustScore: undefined,
    }
    const result = validateWithTruthSerum(input)
    expect(result.verdict).toBe("PASS")
  })

  test("halal mode PASS with HALAL verdict", () => {
    const input: TruthSerumInput = {
      ...validInput,
      halalMode: true,
      halalVerdict: "HALAL",
    }
    const result = validateWithTruthSerum(input)
    expect(result.verdict).toBe("PASS")
  })

  test("SYNTHETIC_TEST source passes (not in blocked list)", () => {
    const input: TruthSerumInput = { ...validInput, dataSource: "SYNTHETIC_TEST" }
    const result = validateWithTruthSerum(input)
    expect(result.verdict).toBe("PASS")
  })
})

describe("TruthSerum — FAIL cases", () => {
  test("Yahoo Finance source returns FAIL with UNTRUSTED_DATA_SOURCE", () => {
    const input: TruthSerumInput = { ...validInput, dataSource: "YAHOO_FINANCE" }
    const result = validateWithTruthSerum(input)
    expect(result.verdict).toBe("FAIL")
    expect(result.failReasons.some(r => r.includes("UNTRUSTED_DATA_SOURCE"))).toBe(true)
  })

  test("stale quote returns FAIL with STALE_QUOTE", () => {
    const input: TruthSerumInput = { ...validInput, quoteTimestamp: STALE_TIMESTAMP }
    const result = validateWithTruthSerum(input)
    expect(result.verdict).toBe("FAIL")
    expect(result.failReasons.some(r => r.includes("STALE_QUOTE"))).toBe(true)
  })

  test("halal mode with HARAM verdict returns FAIL", () => {
    const input: TruthSerumInput = {
      ...validInput,
      halalMode: true,
      halalVerdict: "HARAM",
    }
    const result = validateWithTruthSerum(input)
    expect(result.verdict).toBe("FAIL")
    expect(result.failReasons.some(r => r.includes("HARAM_TICKER"))).toBe(true)
  })

  test("halal mode with UNKNOWN verdict returns FAIL (fail-closed)", () => {
    const input: TruthSerumInput = {
      ...validInput,
      halalMode: true,
      halalVerdict: "UNKNOWN",
    }
    const result = validateWithTruthSerum(input)
    expect(result.verdict).toBe("FAIL")
    expect(result.failReasons.some(r => r.includes("HALAL_VERDICT_MISSING"))).toBe(true)
  })

  test("low deliberation consensus returns FAIL", () => {
    const input: TruthSerumInput = { ...validInput, deliberationConsensus: 0.45 }
    const result = validateWithTruthSerum(input)
    expect(result.verdict).toBe("FAIL")
    expect(result.failReasons.some(r => r.includes("LOW_CONSENSUS"))).toBe(true)
  })

  test("low trust score returns FAIL", () => {
    const input: TruthSerumInput = { ...validInput, trustScore: 25 }
    const result = validateWithTruthSerum(input)
    expect(result.verdict).toBe("FAIL")
    expect(result.failReasons.some(r => r.includes("LOW_TRUST_SCORE"))).toBe(true)
  })

  test("missing deliberation consensus on execute returns FAIL", () => {
    const input: TruthSerumInput = {
      ...validInput,
      action: "execute",
      deliberationConsensus: undefined,
    }
    const result = validateWithTruthSerum(input)
    expect(result.verdict).toBe("FAIL")
    expect(result.failReasons.some(r => r.includes("MISSING_CONSENSUS"))).toBe(true)
  })
})

describe("TruthSerum — receipt integrity", () => {
  test("same input produces same hash (deterministic)", () => {
    const r1 = validateWithTruthSerum(validInput)
    const r2 = validateWithTruthSerum(validInput)
    expect(r1.receiptHash).toBe(r2.receiptHash)
  })

  test("different requestId produces different hash", () => {
    const r1 = validateWithTruthSerum(validInput)
    const r2 = validateWithTruthSerum({ ...validInput, requestId: "test-req-999" })
    expect(r1.receiptHash).not.toBe(r2.receiptHash)
  })

  test("inputSnapshot is immutable copy — mutation does not affect result", () => {
    const input: TruthSerumInput = { ...validInput }
    const result = validateWithTruthSerum(input)
    input.ticker = "MUTATED"
    expect(result.inputSnapshot.ticker).toBe("AAPL")
  })
})
