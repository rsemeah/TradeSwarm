/**
 * Risk Simulation Module
 * Monte Carlo lite for position sizing and max loss estimation
 */

import type { RegimeSnapshot } from "./regime"

export interface RiskSnapshot {
  maxLoss: number
  expectedReturn: number
  confidenceInterval: number
  worstCase: number
  bestCase: number
  sharpeRatio: number
  positionSizeRecommended: number
  riskLevel: "low" | "medium" | "high" | "extreme"
}

interface RiskParams {
  ticker: string
  amount: number
  balance: number
  trustScore: number
  regime: RegimeSnapshot
  seed: number
  strategy?: "bullish_spread" | "bearish_spread" | "iron_condor"
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export function deriveSeedFromString(input: string): number {
  // djb2 hash (32-bit) for deterministic replay seed generation.
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i)
    hash |= 0
  }

  return hash >>> 0
}

/**
 * Simple Monte Carlo simulation for risk estimation
 */
function runMonteCarloLite(
  expectedReturn: number,
  volatility: number,
  seed: number,
  simulations: number = 1000
): { returns: number[]; percentiles: Record<number, number> } {
  const returns: number[] = []
  const random = mulberry32(seed)

  for (let i = 0; i < simulations; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.max(random(), Number.EPSILON)
    const u2 = random()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    
    // Simulated return based on expected return and volatility
    const simulatedReturn = expectedReturn + z * volatility
    returns.push(simulatedReturn)
  }

  returns.sort((a, b) => a - b)

  return {
    returns,
    percentiles: {
      5: returns[Math.floor(simulations * 0.05)],
      25: returns[Math.floor(simulations * 0.25)],
      50: returns[Math.floor(simulations * 0.5)],
      75: returns[Math.floor(simulations * 0.75)],
      95: returns[Math.floor(simulations * 0.95)],
    },
  }
}

/**
 * Calculate expected return based on trust score and regime
 */
function calculateExpectedReturn(trustScore: number, regime: RegimeSnapshot): number {
  // Base expected return from trust score
  let baseReturn = (trustScore - 50) * 0.02 // 0% at 50 trust, 1% at 100, -1% at 0

  // Regime adjustments
  if (regime.trend === "bullish" && regime.momentum === "strong") {
    baseReturn *= 1.3
  } else if (regime.trend === "bearish" || regime.momentum === "weak") {
    baseReturn *= 0.7
  }

  return baseReturn
}

/**
 * Calculate volatility based on regime
 */
function calculateVolatility(regime: RegimeSnapshot): number {
  const baseVol = 0.15 // 15% base volatility

  switch (regime.volatility) {
    case "low":
      return baseVol * 0.6
    case "high":
      return baseVol * 1.5
    default:
      return baseVol
  }
}

/**
 * Simulate risk for a potential trade
 */
export function simulateRisk(params: RiskParams): RiskSnapshot {
  const { amount, balance, trustScore, regime, seed, strategy } = params

  // Calculate expected return and volatility
  const expectedReturnPct = calculateExpectedReturn(trustScore, regime)
  const volatility = calculateVolatility(regime)

  // Strategy adjustments
  let strategyMultiplier = 1
  if (strategy === "iron_condor") {
    strategyMultiplier = 0.5 // Lower risk, lower reward
  } else if (strategy === "bullish_spread" && regime.trend === "bullish") {
    strategyMultiplier = 1.2
  }

  const adjustedExpectedReturn = expectedReturnPct * strategyMultiplier
  const adjustedVolatility = volatility * strategyMultiplier

  // Run Monte Carlo simulation
  const simulation = runMonteCarloLite(adjustedExpectedReturn, adjustedVolatility, seed)

  // Calculate dollar values
  const expectedReturn = amount * adjustedExpectedReturn
  const maxLoss = amount * Math.abs(simulation.percentiles[5])
  const worstCase = amount * simulation.percentiles[5]
  const bestCase = amount * simulation.percentiles[95]

  // Sharpe ratio (simplified)
  const riskFreeRate = 0.05 // 5% annual
  const sharpeRatio = adjustedVolatility > 0 
    ? (adjustedExpectedReturn - riskFreeRate / 12) / adjustedVolatility 
    : 0

  // Confidence interval (how likely to be profitable)
  const profitableSimulations = simulation.returns.filter((r) => r > 0).length
  const confidenceInterval = profitableSimulations / simulation.returns.length

  // Position size recommendation (Kelly-lite)
  const winRate = confidenceInterval
  const avgWin = simulation.percentiles[75]
  const avgLoss = Math.abs(simulation.percentiles[25])
  const kellyFraction = winRate - (1 - winRate) / (avgWin / avgLoss || 1)
  const positionSizeRecommended = Math.max(0, Math.min(0.05, kellyFraction * 0.5)) * balance

  // Risk level classification
  let riskLevel: "low" | "medium" | "high" | "extreme" = "medium"
  const maxLossPercent = maxLoss / balance
  if (maxLossPercent < 0.01) {
    riskLevel = "low"
  } else if (maxLossPercent < 0.03) {
    riskLevel = "medium"
  } else if (maxLossPercent < 0.05) {
    riskLevel = "high"
  } else {
    riskLevel = "extreme"
  }

  return {
    maxLoss: Math.round(maxLoss * 100) / 100,
    expectedReturn: Math.round(expectedReturn * 100) / 100,
    confidenceInterval: Math.round(confidenceInterval * 100) / 100,
    worstCase: Math.round(worstCase * 100) / 100,
    bestCase: Math.round(bestCase * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    positionSizeRecommended: Math.round(positionSizeRecommended * 100) / 100,
    riskLevel,
  }
}

/**
 * Get risk context string for AI prompts
 */
export function riskToContext(risk: RiskSnapshot): string {
  return `Risk Assessment: ${risk.riskLevel} risk level. ` +
    `Max loss: $${risk.maxLoss}, Expected return: $${risk.expectedReturn}. ` +
    `Confidence: ${(risk.confidenceInterval * 100).toFixed(0)}% chance of profit. ` +
    `Recommended position: $${risk.positionSizeRecommended}.`
}
