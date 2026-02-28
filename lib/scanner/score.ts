import type { CandidateMathInput, CandidateMathResult, ScoreBreakdown, ScoreInputs } from './types'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function computeEventPenalty(params: Pick<ScoreInputs, 'earningsFlag' | 'fomcFlag' | 'cpiFlag' | 'nfpFlag' | 'finalNewsSentiment'>): number {
  const newsFlag = Math.max(0, -(params.finalNewsSentiment ?? 0))

  const penalty =
    (params.earningsFlag ? 0.2 : 0) +
    (params.fomcFlag ? 0.1 : 0) +
    (params.cpiFlag ? 0.08 : 0) +
    (params.nfpFlag ? 0.06 : 0) +
    newsFlag * 0.1

  return Math.min(penalty, 0.25)
}

export function computeTotalScore(input: ScoreInputs): ScoreBreakdown {
  const rawScore =
    input.rorScore * 0.35 +
    input.popScore * 0.25 +
    input.ivRvScore * 0.2 +
    input.liquidityScore * 0.15

  const eventPenalty = computeEventPenalty(input)
  const regimeBonus = input.regimeBonus ?? 0

  const total = clamp(rawScore - eventPenalty + regimeBonus, 0, 1)

  return {
    rawScore,
    eventPenalty,
    regimeBonus,
    total,
    display: Math.round(total * 100),
    components: {
      rorScore: input.rorScore,
      popScore: input.popScore,
      ivRvScore: input.ivRvScore,
      liquidityScore: input.liquidityScore,
    },
  }
}

export function computeRorScore(ror: number): number {
  return Math.min(ror / 0.15, 1)
}

export function computePopScore(popApprox: number): number {
  return clamp((popApprox - 0.5) / (0.85 - 0.5), 0, 1)
}

export function computeIvRvScore(ivRvPosition: number, strategy: CandidateMathInput['strategy']): number {
  return strategy === 'CDS' ? 1 - ivRvPosition : ivRvPosition
}

export function computeTradeMath(input: CandidateMathInput): CandidateMathResult {
  const riskBudget = input.riskBudget ?? 200
  const hardCap = input.hardCap ?? 250

  if (input.strategy === 'CDS') {
    const netDebitPs = input.longMidPs - input.shortMidPs
    const maxLossPs = netDebitPs
    const maxProfitPs = input.spreadWidth - netDebitPs

    const contractsAtBudget = Math.floor(riskBudget / (maxLossPs * 100))
    const sizedAtHardCap = contractsAtBudget === 0
    const contracts = contractsAtBudget > 0 ? contractsAtBudget : Math.floor(hardCap / (maxLossPs * 100))

    if (contracts === 0 || !Number.isFinite(contracts)) {
      return {
        netCreditPs: 0,
        netCreditTotal: 0,
        netDebitPs,
        netDebitTotal: 0,
        maxLossPs,
        maxLossTotal: 0,
        maxProfitPs,
        maxProfitTotal: 0,
        contracts: 0,
        actualRiskTotal: 0,
        sizedAtHardCap,
        skipped: true,
        ror: 0,
      }
    }

    return {
      netCreditPs: 0,
      netCreditTotal: 0,
      netDebitPs,
      netDebitTotal: netDebitPs * 100 * contracts,
      maxLossPs,
      maxLossTotal: maxLossPs * 100 * contracts,
      maxProfitPs,
      maxProfitTotal: maxProfitPs * 100 * contracts,
      contracts,
      actualRiskTotal: maxLossPs * 100 * contracts,
      sizedAtHardCap,
      skipped: false,
      ror: maxProfitPs / maxLossPs,
    }
  }

  const netCreditPs = input.shortMidPs - input.longMidPs
  const maxLossPs = input.spreadWidth - netCreditPs

  const contractsAtBudget = Math.floor(riskBudget / (maxLossPs * 100))
  const sizedAtHardCap = contractsAtBudget === 0
  const contracts = contractsAtBudget > 0 ? contractsAtBudget : Math.floor(hardCap / (maxLossPs * 100))

  if (contracts === 0 || !Number.isFinite(contracts)) {
    return {
      netCreditPs,
      netCreditTotal: 0,
      netDebitPs: 0,
      netDebitTotal: 0,
      maxLossPs,
      maxLossTotal: 0,
      maxProfitPs: 0,
      maxProfitTotal: 0,
      contracts: 0,
      actualRiskTotal: 0,
      sizedAtHardCap,
      skipped: true,
      ror: 0,
    }
  }

  return {
    netCreditPs,
    netCreditTotal: netCreditPs * 100 * contracts,
    netDebitPs: 0,
    netDebitTotal: 0,
    maxLossPs,
    maxLossTotal: maxLossPs * 100 * contracts,
    maxProfitPs: 0,
    maxProfitTotal: 0,
    contracts,
    actualRiskTotal: maxLossPs * 100 * contracts,
    sizedAtHardCap,
    skipped: false,
    ror: netCreditPs / maxLossPs,
  }
}
