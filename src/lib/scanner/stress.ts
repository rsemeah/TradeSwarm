import type { ScenarioLabel, SigmaSource, StressProof, StressScenario } from '@/lib/types/proof-bundle'

interface StressInput {
  strategy: 'PCS' | 'CCS' | 'CDS'
  underlying_price: number
  dte: number
  sigma: number
  sigma_source: SigmaSource
  short_strike: number
  long_strike: number
  spread_width: number
  net_credit_ps: number
  net_debit_ps: number
  contracts: number
}

function labelPnl(pnl: number): ScenarioLabel {
  if (pnl > 0) return 'Win'
  if (pnl < 0) return 'Loss'
  return 'Partial'
}

function calcScenario(input: StressInput, scenario_price: number): StressScenario {
  const { strategy, short_strike, long_strike, spread_width, net_credit_ps, net_debit_ps, contracts } = input
  let pnl_ps: number

  if (strategy === 'PCS') {
    const distance = Math.max(0, short_strike - scenario_price)
    const intrinsic_loss_ps = Math.min(distance, spread_width)
    pnl_ps = net_credit_ps - intrinsic_loss_ps
  } else if (strategy === 'CCS') {
    const distance = Math.max(0, scenario_price - short_strike)
    const intrinsic_loss_ps = Math.min(distance, spread_width)
    pnl_ps = net_credit_ps - intrinsic_loss_ps
  } else {
    const distance = Math.max(0, scenario_price - long_strike)
    const intrinsic_gain_ps = Math.min(distance, spread_width)
    pnl_ps = intrinsic_gain_ps - net_debit_ps
  }

  const pnl_total = pnl_ps * 100 * contracts
  return {
    price: Number(scenario_price.toFixed(2)),
    pnl_total: Number(pnl_total.toFixed(2)),
    label: labelPnl(pnl_total),
  }
}

export function computeStress(input: StressInput): StressProof {
  const { underlying_price, dte, sigma, sigma_source } = input
  const expected_move_1s = underlying_price * sigma * Math.sqrt(dte / 365)

  return {
    sigma_used: sigma,
    sigma_source,
    scenarios: {
      up_1s: calcScenario(input, underlying_price + expected_move_1s),
      down_1s: calcScenario(input, underlying_price - expected_move_1s),
      up_2s: calcScenario(input, underlying_price + 2 * expected_move_1s),
      down_2s: calcScenario(input, underlying_price - 2 * expected_move_1s),
    },
  }
}
