import assert from "node:assert/strict"
import test from "node:test"
import { simulateRisk } from "../lib/engine/risk.ts"
import type { RegimeSnapshot } from "../lib/engine/regime.ts"

test("simulateRisk returns byte-for-byte identical output for identical inputs and seed", () => {
  const regime: RegimeSnapshot = {
    trend: "bullish",
    volatility: "medium",
    momentum: "strong",
    confidence: 0.81,
    signals: {
      sma20: 101,
      sma50: 99,
      rsi14: 58,
      atr14: 2.3,
      priceChange5d: 0.6,
      volumeRatio: 1.1,
    },
    timestamp: "2026-02-28T00:00:00.000Z",
  }

  const params = {
    ticker: "SPY",
    amount: 250,
    balance: 10000,
    trustScore: 65,
    regime,
    seed: 133742,
    strategy: "bullish_spread" as const,
  }

  const first = simulateRisk(params)
  const second = simulateRisk(params)

  assert.equal(JSON.stringify(first), JSON.stringify(second))
})
