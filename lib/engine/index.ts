/**
 * TradeSwarm Engine — public API surface
 *
 * Use runTradeSwarm() for all new orchestrated trade flows.
 * Legacy runEngineAnalysis / preflightCheck are kept for the
 * /api/analyze route (radar screen theme analysis, no DB writes).
 */

// ─── Stage modules ─────────────────────────────────────────────────────────
export { detectRegime, regimeToContext } from "./regime"
export type { RegimeSnapshot, Trend, Volatility, Momentum } from "./regime"

export { simulateRisk, riskToContext } from "./risk"
export type { RiskSnapshot } from "./risk"

// ─── Orchestrator ──────────────────────────────────────────────────────────
export { runTradeSwarm } from "./orchestrator"

// ─── Engine sub-modules ────────────────────────────────────────────────────
export { buildMarketContext, probeMarketDataHealth } from "./market-context"
export { runDeliberation } from "./deliberation"
export { computeTrustScore } from "./scoring"
export { emitEngineEvent } from "./events"

// ─── Canonical types ───────────────────────────────────────────────────────
export type {
  SwarmParams,
  SwarmResult,
  ProofBundle,
  MarketContext,
  ProofRegimeSnapshot,
  ProofRiskSnapshot,
  DeliberationRound,
  ModelOutput,
  ScoringResult,
  PreflightResult,
  EngineEventMinimal,
  TradeDecision,
  TradeAction,
  EngineStatus,
} from "@/lib/types/proof"

// ─── Legacy (radar screen analysis — no orchestrator, no DB writes) ────────
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

export async function runEngineAnalysis(
  ticker: string,
  amount: number,
  balance: number,
  trustScore: number
): Promise<EngineAnalysis> {
  const regime = await detectRegime(ticker)
  const risk = simulateRisk({ ticker, amount, balance, trustScore, regime })
  return {
    ticker,
    regime,
    risk,
    marketContext: regimeToContext(regime),
    riskContext: riskToContext(risk),
    timestamp: new Date().toISOString(),
  }
}

export function preflightCheck(
  regime: RegimeSnapshot,
  risk: RiskSnapshot,
  trustScore: number
): { pass: boolean; reason: string } {
  if (risk.riskLevel === "extreme") {
    return { pass: false, reason: "Risk level too high for current market conditions" }
  }
  if (regime.trend === "bearish" && trustScore < 60) {
    return { pass: false, reason: "Low confidence in bearish market — wait for better setup" }
  }
  if (regime.volatility === "high" && regime.momentum === "weak") {
    return { pass: false, reason: "Choppy market conditions — sitting out" }
  }
  return { pass: true, reason: "Preflight checks passed" }
}
