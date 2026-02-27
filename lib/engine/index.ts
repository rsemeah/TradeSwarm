/**
 * TradeSwarm Engine
 * Main orchestration module for trade analysis
 */

export { detectRegime, regimeToContext } from "./regime"
export type { RegimeSnapshot, Trend, Volatility, Momentum } from "./regime"

export { simulateRisk, riskToContext } from "./risk"
export type { RiskSnapshot } from "./risk"

import { detectRegime, regimeToContext } from "./regime"
import { simulateRisk, riskToContext } from "./risk"
import type { RegimeSnapshot } from "./regime"
import type { RiskSnapshot } from "./risk"

export interface EngineAnalysis {
  ticker: string
  regime: RegimeSnapshot
  risk: RiskSnapshot
  marketContext: string
  riskContext: string
  timestamp: string
}

/**
 * Run full engine analysis for a ticker
 */
export async function runEngineAnalysis(
  ticker: string,
  amount: number,
  balance: number,
  trustScore: number
): Promise<EngineAnalysis> {
  // Get market regime
  const regime = await detectRegime(ticker)

  // Simulate risk
  const risk = simulateRisk({
    ticker,
    amount,
    balance,
    trustScore,
    regime,
  })

  // Generate context strings for AI
  const marketContext = regimeToContext(regime)
  const riskContext = riskToContext(risk)

  return {
    ticker,
    regime,
    risk,
    marketContext,
    riskContext,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Quick preflight check before trade
 */
export function preflightCheck(
  regime: RegimeSnapshot,
  risk: RiskSnapshot,
  trustScore: number
): { pass: boolean; reason: string } {
  // Block extreme risk
  if (risk.riskLevel === "extreme") {
    return { pass: false, reason: "Risk level too high for current market conditions" }
  }

  // Block low confidence + bearish trend
  if (regime.trend === "bearish" && trustScore < 60) {
    return { pass: false, reason: "Low confidence in bearish market - wait for better setup" }
  }

  // Block high volatility + weak momentum
  if (regime.volatility === "high" && regime.momentum === "weak") {
    return { pass: false, reason: "Choppy market conditions - sitting out" }
  }

  return { pass: true, reason: "Preflight checks passed" }
}
