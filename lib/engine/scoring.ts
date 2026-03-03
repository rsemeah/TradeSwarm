/**
 * Trust Scoring Module — Balanced policy (0.4 / 0.3 / 0.2 / 0.1 weights)
 *
 * trustScore = f(modelAgreement, providerCredibility, regimeAlignment, risk)
 * Final score is 0-100 integer. Balanced means: informative disagreement is
 * penalised but not catastrophically; strong regime alignment earns a bonus.
 */

import type {
  DeliberationRound,
  ScoringResult,
  ProofRegimeSnapshot,
  ProofRiskSnapshot,
  TradeDecision,
} from "@/lib/types/proof"

const WEIGHTS = {
  modelAgreement: 0.4,
  providerCredibility: 0.3,
  regimeAlignmentBonus: 0.2,
  riskPenalty: 0.1,
} as const

export function computeTrustScore(params: {
  rounds: DeliberationRound[]
  regime: ProofRegimeSnapshot
  risk: ProofRiskSnapshot
  finalDecision: TradeDecision
}): ScoringResult {
  const { rounds, regime, risk, finalDecision } = params
  const ts = new Date().toISOString()

  if (rounds.length === 0) {
    return {
      trustScore: 0,
      rawAvgScore: 0,
      agreementRatio: 0,
      penaltyFactor: 0,
      factors: {
        modelAgreement: 0,
        providerCredibility: 0,
        regimeAlignmentBonus: 0,
        riskPenalty: 0,
      },
      weights: { ...WEIGHTS },
      ts,
    }
  }

  // Collect all outputs across rounds
  const allOutputs = rounds.flatMap((r) => r.outputs)

  // Agreement: fraction of outputs that match the final verdict
  const agreeingCount = allOutputs.filter((o) => o.decision === finalDecision).length
  const agreementRatio = allOutputs.length > 0 ? agreeingCount / allOutputs.length : 0

  // Raw average confidence from all models
  const rawAvgScore =
    allOutputs.length > 0
      ? allOutputs.reduce((s, o) => s + o.confidence, 0) / allOutputs.length
      : 0

  // Balanced penalty — unanimous → 1.0, 50/50 split → 0.75
  const penaltyFactor = 0.5 + 0.5 * agreementRatio

  // Factor: model agreement (0–1)
  const modelAgreement = agreementRatio * penaltyFactor

  // Factor: provider credibility (V1 flat; will be calibrated via backtest)
  const providerCredibility = 0.8

  // Factor: regime alignment bonus (-0.2 to +0.2)
  let regimeAlignmentBonus = 0
  if (finalDecision === "GO") {
    if (regime.trend === "bullish" && regime.momentum === "strong") {
      regimeAlignmentBonus = 0.2
    } else if (regime.trend === "bearish" || regime.momentum === "weak") {
      regimeAlignmentBonus = -0.2
    }
  } else if (finalDecision === "NO" && regime.trend === "bearish") {
    regimeAlignmentBonus = 0.1   // correctly protective in down market
  }

  // Factor: risk penalty (0 to -0.3)
  let riskPenalty = 0
  if (risk.riskLevel === "extreme") {
    riskPenalty = -0.3
  } else if (risk.riskLevel === "high") {
    riskPenalty = -0.15
  } else if (risk.riskLevel === "low") {
    riskPenalty = 0.05            // slight bonus for low-risk setups
  }

  // Weighted adjustment on top of base (rawAvg * penalty)
  const factorAdjustment =
    modelAgreement * WEIGHTS.modelAgreement +
    providerCredibility * WEIGHTS.providerCredibility +
    regimeAlignmentBonus * WEIGHTS.regimeAlignmentBonus +
    riskPenalty * WEIGHTS.riskPenalty

  // Map factorAdjustment → ±25 point swing
  const adjustmentPoints = factorAdjustment * 25
  const trustScore = Math.max(
    0,
    Math.min(100, Math.round(rawAvgScore * penaltyFactor + adjustmentPoints))
  )

  return {
    trustScore,
    rawAvgScore: Math.round(rawAvgScore),
    agreementRatio: Math.round(agreementRatio * 100) / 100,
    penaltyFactor: Math.round(penaltyFactor * 100) / 100,
    factors: {
      modelAgreement: Math.round(modelAgreement * 100) / 100,
      providerCredibility,
      regimeAlignmentBonus: Math.round(regimeAlignmentBonus * 100) / 100,
      riskPenalty: Math.round(riskPenalty * 100) / 100,
    },
    weights: { ...WEIGHTS },
    ts,
  }
}
