export type RiskGrade = "low" | "medium" | "high" | "extreme"

export interface ScoringFactor {
  name: string
  impact: number
  value: string | number
  detail: string
}

export interface CredibilityScoreInput {
  baseTrustScore: number
  deliberation: {
    agreementRatio: number
    arbitrationUsed: boolean
    dissentCount: number
  }
  regime: {
    confidence: number
    volatility: "low" | "medium" | "high"
  }
  risk: {
    grade: RiskGrade
  }
  liquidity: {
    volumeRatio: number
    spreadProxy: number
  }
  freshness: {
    marketDataAgeMs: number
    modelDataAgeMs: number
  }
}

export interface CredibilityScore {
  trustScore: number
  factors: ScoringFactor[]
  penalties: ScoringFactor[]
  boosts: ScoringFactor[]
  timestamp: string
  formula: {
    version: string
    policy: string
    expression: string
    normalizedInputs: Record<string, number>
    weights: Record<string, number>
    clamp: {
      min: number
      max: number
      rounding: string
    }
  }
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const clamp100 = (value: number) => Math.min(100, Math.max(0, value))

const riskWeight: Record<RiskGrade, number> = {
  low: 1,
  medium: 0.65,
  high: 0.3,
  extreme: 0,
}

const normalizeFreshness = (ageMs: number, maxMs: number) => {
  const boundedAge = Math.min(Math.max(ageMs, 0), maxMs)
  return clamp01(1 - boundedAge / maxMs)
}

export function calculateCredibilityScore(input: CredibilityScoreInput): CredibilityScore {
  const agreement = clamp01(input.deliberation.agreementRatio)
  const regimeConfidence = clamp01(input.regime.confidence)
  const riskNormalized = riskWeight[input.risk.grade]
  const liquidityNormalized = clamp01(input.liquidity.volumeRatio / 1.5)
  const spreadNormalized = clamp01(1 - input.liquidity.spreadProxy)
  const marketFreshness = normalizeFreshness(input.freshness.marketDataAgeMs, 10 * 60 * 1000)
  const modelFreshness = normalizeFreshness(input.freshness.modelDataAgeMs, 5 * 60 * 1000)

  const normalizedInputs = {
    baseTrust: clamp01(input.baseTrustScore / 100),
    agreement,
    arbitration: input.deliberation.arbitrationUsed ? 0 : 1,
    regimeConfidence,
    risk: riskNormalized,
    liquidity: (liquidityNormalized + spreadNormalized) / 2,
    freshness: (marketFreshness + modelFreshness) / 2,
    dissent: clamp01(input.deliberation.dissentCount / 3),
  }

  const weights = {
    baseTrust: 0.45,
    agreement: 0.18,
    arbitration: 0.05,
    regimeConfidence: 0.1,
    risk: 0.09,
    liquidity: 0.08,
    freshness: 0.05,
  }

  const weightedScore =
    normalizedInputs.baseTrust * weights.baseTrust +
    normalizedInputs.agreement * weights.agreement +
    normalizedInputs.arbitration * weights.arbitration +
    normalizedInputs.regimeConfidence * weights.regimeConfidence +
    normalizedInputs.risk * weights.risk +
    normalizedInputs.liquidity * weights.liquidity +
    normalizedInputs.freshness * weights.freshness

  const dissentPenalty = normalizedInputs.dissent * 12
  const rawScore = weightedScore * 100 - dissentPenalty
  const trustScore = Math.round(clamp100(rawScore))

  const factors: ScoringFactor[] = [
    {
      name: "Model agreement",
      impact: Math.round(normalizedInputs.agreement * weights.agreement * 100),
      value: `${Math.round(agreement * 100)}%`,
      detail: "Higher model agreement increases confidence in shared conclusions.",
    },
    {
      name: "Regime confidence",
      impact: Math.round(normalizedInputs.regimeConfidence * weights.regimeConfidence * 100),
      value: regimeConfidence,
      detail: "Market regime detector confidence for current trend/volatility state.",
    },
    {
      name: "Risk grade",
      impact: Math.round(normalizedInputs.risk * weights.risk * 100),
      value: input.risk.grade,
      detail: "Lower risk grades receive a larger trust contribution.",
    },
    {
      name: "Liquidity/spread proxy",
      impact: Math.round(normalizedInputs.liquidity * weights.liquidity * 100),
      value: Number(normalizedInputs.liquidity.toFixed(2)),
      detail: "Volume ratio and spread proxy are normalized and averaged.",
    },
    {
      name: "Data freshness",
      impact: Math.round(normalizedInputs.freshness * weights.freshness * 100),
      value: Number(normalizedInputs.freshness.toFixed(2)),
      detail: "Recent market + model data keeps trust from drifting stale.",
    },
  ]

  const penalties: ScoringFactor[] = []
  if (input.deliberation.dissentCount > 0) {
    penalties.push({
      name: "Dissent penalty",
      impact: -Math.round(dissentPenalty),
      value: input.deliberation.dissentCount,
      detail: "Conflicting model decisions reduce trust deterministically.",
    })
  }
  if (input.deliberation.arbitrationUsed) {
    penalties.push({
      name: "Arbitration penalty",
      impact: -4,
      value: "enabled",
      detail: "Consensus arbitration indicates disagreement needing tie-break.",
    })
  }

  const boosts: ScoringFactor[] = []
  if (agreement >= 0.8) {
    boosts.push({
      name: "Strong agreement boost",
      impact: 6,
      value: `${Math.round(agreement * 100)}%`,
      detail: "High alignment across models improves signal credibility.",
    })
  }
  if (normalizedInputs.freshness > 0.85) {
    boosts.push({
      name: "Fresh data boost",
      impact: 3,
      value: Number(normalizedInputs.freshness.toFixed(2)),
      detail: "Recently refreshed data avoids stale trust inputs.",
    })
  }

  return {
    trustScore,
    factors,
    penalties,
    boosts,
    timestamp: new Date().toISOString(),
    formula: {
      version: "credibility-v1",
      policy: "Deterministic weighted normalization with 0-100 clamp",
      expression:
        "score=clamp(0,100, round(100*Σ(normalized_i*weight_i) - dissent*12)); normalized inputs clamped to [0,1]",
      normalizedInputs,
      weights,
      clamp: {
        min: 0,
        max: 100,
        rounding: "nearest_integer",
      },
    },
  }
}
