#!/usr/bin/env node

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  return process.argv[index + 1] ?? fallback
}

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

function evaluateCapitalGate({ driftState, drawdownBrake, driftWarnThrottle }) {
  if (driftState === "ALERT") return { allowed: false, reason: "drift_alert", throttleMultiplier: 0 }
  if (drawdownBrake <= 0) return { allowed: false, reason: "drawdown_brake", throttleMultiplier: 0 }
  if (driftState === "WARN") return { allowed: true, reason: "drift_warn", throttleMultiplier: driftWarnThrottle }
  return { allowed: true, throttleMultiplier: 1 }
}

const equity = Number(arg("equity", "100000"))
const conf = Number(arg("conf", "0.81"))
const drift = String(arg("drift", "OK")).toUpperCase()

const policy = {
  confidence_tiers: { high: 1, medium: 0.7, low: 0.4 },
  kelly_fraction_cap: 0.25,
  hard_cap_dollars: 500,
  drift_warn_throttle: 0.6,
}

const confidenceTier = conf >= 0.85 ? "high" : conf >= 0.7 ? "medium" : "low"
const gate = evaluateCapitalGate({ driftState: drift, drawdownBrake: 1, driftWarnThrottle: policy.drift_warn_throttle })
const sizing = computeCapitalSize(
  {
    balance: equity,
    edge: 1.8,
    winProbability: conf,
    confidenceTier,
    throttleMultiplier: gate.throttleMultiplier,
  },
  policy,
)

console.log(
  JSON.stringify(
    {
      ok: gate.allowed,
      drift,
      confidenceTier,
      gate,
      sizing,
    },
    null,
    2,
  ),
)

if (!gate.allowed) {
  process.exitCode = 1
}
