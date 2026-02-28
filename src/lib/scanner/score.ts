import type { ScoreBreakdown, ScoreInputs } from './types'

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n))

export function computeScore(input: ScoreInputs): ScoreBreakdown {
  const weights = {
    ror: clamp(input.ror) * 0.35,
    pop: clamp(input.pop) * 0.25,
    ivVsRv: clamp(input.ivVsRv) * 0.2,
    liquidity: clamp(input.liquidity) * 0.15,
  }

  const raw = weights.ror + weights.pop + weights.ivVsRv + weights.liquidity
  const total = clamp(raw - clamp(input.eventPenalty, 0, 0.25) + clamp(input.regimeBonus, -0.1, 0.1))

  return {
    raw,
    eventPenalty: clamp(input.eventPenalty, 0, 0.25),
    regimeBonus: clamp(input.regimeBonus, -0.1, 0.1),
    total,
    display: Math.round(total * 100),
    weights,
  }
}
