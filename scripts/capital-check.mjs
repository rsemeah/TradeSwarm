function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function computeKellyFraction(winProbability, edge) {
  if (edge <= 0) return 0
  const lossProbability = 1 - winProbability
  return clamp((winProbability * edge - lossProbability) / edge, 0, 1)
}

function computeCapitalSize(input, policy) {
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

const policy = {
  confidence_tiers: { high: 1, medium: 0.7, low: 0.4 },
  kelly_fraction_cap: 0.25,
  hard_cap_dollars: 500,
}

const result = computeCapitalSize(
  {
    balance: 10_000,
    edge: 1.8,
    winProbability: 0.58,
    confidenceTier: "medium",
    throttleMultiplier: 0.6,
  },
  policy,
)

console.log(JSON.stringify({ ok: result.recommendedSize >= 0, result }, null, 2))
