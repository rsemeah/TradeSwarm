import { rankCandidates } from './rank'
import { computeEventPenalty, computeTotalScore, computeTradeMath } from './score'

export interface AcceptanceCheck {
  name: string
  pass: boolean
  details?: string
}

export function runAcceptanceChecks(): AcceptanceCheck[] {
  const checks: AcceptanceCheck[] = []

  const unitSafety = computeTradeMath({ strategy: 'PCS', spreadWidth: 1, shortMidPs: 0.55, longMidPs: 0.25 })
  checks.push({
    name: 'unit-safety',
    pass:
      !unitSafety.skipped &&
      unitSafety.netCreditTotal === unitSafety.netCreditPs * 100 * unitSafety.contracts &&
      unitSafety.maxLossTotal === unitSafety.maxLossPs * 100 * unitSafety.contracts,
  })

  const riskRetry = computeTradeMath({ strategy: 'PCS', spreadWidth: 5, shortMidPs: 2.7, longMidPs: 0 })
  const riskSkip = computeTradeMath({ strategy: 'PCS', spreadWidth: 10, shortMidPs: 0.5, longMidPs: 0 })
  checks.push({
    name: 'risk-cap-retry',
    pass: !riskRetry.skipped && riskRetry.sizedAtHardCap && riskRetry.contracts === 1 && riskSkip.skipped,
  })

  const ivMissingScore = computeTotalScore({ rorScore: 0.8, popScore: 0.7, ivRvScore: 0.5, liquidityScore: 0.7 })
  checks.push({ name: 'iv-missing-neutralization', pass: ivMissingScore.components.ivRvScore === 0.5 })

  const penalty = computeEventPenalty({ earningsFlag: true, fomcFlag: true, cpiFlag: true, nfpFlag: true, finalNewsSentiment: -1 })
  checks.push({ name: 'event-penalty-cap', pass: penalty === 0.25 })

  const spy = Array.from({ length: 10 }).map((_, idx) => ({
    candidateId: `SPY-${idx}`,
    ticker: 'SPY',
    tier: 'B' as const,
    dte: 14,
    strategy: 'PCS' as const,
    ror: 0.2,
    score: 100 - idx,
  }))
  const qqq = Array.from({ length: 5 }).map((_, idx) => ({
    candidateId: `QQQ-${idx}`,
    ticker: 'QQQ',
    tier: 'B' as const,
    dte: 14,
    strategy: 'CCS' as const,
    ror: 0.2,
    score: 90 - idx,
  }))

  const ranked = rankCandidates([...spy, ...qqq])
  checks.push({
    name: 'diversity-constraint',
    pass:
      !ranked.empty &&
      ranked.candidates.filter((c) => c.ticker === 'SPY').length === 3 &&
      ranked.candidates.filter((c) => c.ticker === 'QQQ').length === 3,
  })

  const emptyBoard = rankCandidates([
    { candidateId: '1', ticker: 'SPY', tier: 'C', dte: 29, strategy: 'PCS', ror: 0.1, score: 20 },
    { candidateId: '2', ticker: 'QQQ', tier: 'C', dte: 29, strategy: 'CCS', ror: 0.11, score: 20 },
  ])
  checks.push({ name: 'empty-board-policy', pass: emptyBoard.empty && emptyBoard.candidates.length === 0 })

  const clampCheck = computeTotalScore({
    rorScore: 0,
    popScore: 0,
    ivRvScore: 0,
    liquidityScore: 0.66,
    earningsFlag: true,
    finalNewsSentiment: -0.5,
    regimeBonus: -0.037,
  })
  checks.push({ name: 'final-score-clamp', pass: clampCheck.total === 0 && clampCheck.display === 0 })

  return checks
}
