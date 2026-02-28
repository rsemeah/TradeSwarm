/**
 * Candidate scoring.
 *
 * Final score = ROR(0.35) + POP(0.25) + IV_RV(0.20) + Liquidity(0.15)
 *   − eventPenalty (max 0.25)
 *   + regimeBonus (±0.05 × regimeConfidence)
 *
 * All inputs normalized to [0, 1] before weighting.
 * Position sizing uses Kelly-lite floor:
 *   contracts = floor(positionBudget / (maxLoss_ps × 100))
 *   Retry with $250 budget if 0 → sized_at_hard_cap = true
 */

import type { ScanResult, ScoreProof, CandidateFlags, NewsResult } from "@/lib/types/proof-bundle"
import type { IvRvResult } from "@/lib/indicators/rv20"

const WEIGHTS = {
  ror: 0.35,
  pop: 0.25,
  ivRv: 0.20,
  liquidity: 0.15,
} as const

const ROR_TARGET = 0.20    // 20% ROR maps to 1.0 normalized
const IV_RV_TARGET = 1.5   // IV/RV ratio of 1.5 maps to 1.0

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function liquidityScore(candidate: Omit<ScanResult, "score" | "flags" | "ivRv" | "news" | "stress">): number {
  const { shortLeg, longLeg } = candidate
  // Composite: OI normalization + volume normalization
  const shortOiScore = clamp01(shortLeg.oi / 1000)
  const longOiScore = clamp01(longLeg.oi / 500)
  const shortVolScore = clamp01(shortLeg.volume / 500)
  return (shortOiScore + longOiScore + shortVolScore) / 3
}

export function scoreCandidate(params: {
  candidate: Omit<ScanResult, "score" | "flags" | "ivRv" | "news" | "stress">
  ivRv: IvRvResult
  news: NewsResult
  regimeConfidence: number    // 0..1
  regimeBullish: boolean      // true if trend=bullish
  balance: number             // for position sizing
}): { score: ScoreProof; flags: Partial<CandidateFlags>; contracts: number } {
  const { candidate, ivRv, news, regimeConfidence, regimeBullish, balance } = params

  const rorNorm = clamp01(candidate.ror_ps / ROR_TARGET)
  const popNorm = clamp01(candidate.pop)
  const ivRvNorm = ivRv.sufficient ? clamp01(ivRv.position / IV_RV_TARGET) : 0.5
  const liqNorm = liquidityScore(candidate)

  const raw =
    rorNorm * WEIGHTS.ror +
    popNorm * WEIGHTS.pop +
    ivRvNorm * WEIGHTS.ivRv +
    liqNorm * WEIGHTS.liquidity

  // Event penalty
  const eventPenalty = Math.min(0.25, news.penaltyApplied)

  // Regime bonus: +5% × confidence if aligned, -5% if not
  const isCredit = candidate.spreadType !== "CDS"
  const aligned = isCredit ? regimeBullish : !regimeBullish
  const regimeBonus = (aligned ? 0.05 : -0.05) * regimeConfidence

  const final = clamp01(raw - eventPenalty + regimeBonus)

  const score: ScoreProof = {
    ror_ps: candidate.ror_ps,
    pop: candidate.pop,
    ivRvPosition: ivRv.position,
    liquidity: liqNorm,
    raw,
    eventPenalty,
    regimeBonus,
    final,
  }

  // Position sizing: floor($200 / (maxLoss_ps × 100))
  let contracts = Math.floor((balance * 0.02) / (candidate.maxLoss_ps * 100))
  let sized_at_hard_cap = false

  if (contracts <= 0) {
    contracts = Math.floor(250 / (candidate.maxLoss_ps * 100))
    sized_at_hard_cap = true
  }

  contracts = Math.max(1, Math.min(contracts, 10)) // absolute cap at 10 contracts

  return {
    score,
    flags: {
      sized_at_hard_cap,
      catalyst_mode_trade: candidate.tier === "A",
      iv_rich: ivRv.sufficient && ivRv.position > 1.2,
      event_window: news.hasEarnings || news.hasMacroEvent,
    },
    contracts,
  }
}
