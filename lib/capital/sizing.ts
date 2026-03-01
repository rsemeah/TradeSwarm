export type ConfidenceTier = "high" | "medium" | "low"

export interface CapitalPolicy {
  confidence_tiers: Record<ConfidenceTier, number>
  kelly_fraction_cap: number
  hard_cap_dollars: number
}

export interface SizingInput {
  balance: number
  edge: number
  winProbability: number
  confidenceTier: ConfidenceTier
  throttleMultiplier?: number
}

export interface CapitalSizingResult {
  kellyFractionRaw: number
  kellyFractionCapped: number
  confidenceMultiplier: number
  throttleMultiplier: number
  recommendedSize: number
  hardCapped: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function computeKellyFraction(winProbability: number, edge: number): number {
  if (edge <= 0) return 0
  const lossProbability = 1 - winProbability
  return clamp((winProbability * edge - lossProbability) / edge, 0, 1)
}

export function computeCapitalSize(input: SizingInput, policy: CapitalPolicy): CapitalSizingResult {
  const kellyFractionRaw = computeKellyFraction(input.winProbability, input.edge)
  const kellyFractionCapped = Math.min(kellyFractionRaw, policy.kelly_fraction_cap)
  const confidenceMultiplier = policy.confidence_tiers[input.confidenceTier]
  const throttleMultiplier = clamp(input.throttleMultiplier ?? 1, 0, 1)

  const rawSize = input.balance * kellyFractionCapped * confidenceMultiplier * throttleMultiplier
  const recommendedSize = Math.min(rawSize, policy.hard_cap_dollars)

  return {
    kellyFractionRaw,
    kellyFractionCapped,
    confidenceMultiplier,
    throttleMultiplier,
    recommendedSize,
    hardCapped: rawSize > recommendedSize,
  }
}
