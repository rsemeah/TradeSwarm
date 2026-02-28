import type { Strategy } from './types'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export interface StressScenario {
  price: number
  pnlTotal: number
  label: 'Win' | 'Partial' | 'Loss'
}

export interface StressInputs {
  strategy: Strategy
  underlyingPrice: number
  sigma: number
  dte: number
  contracts: number
  spreadWidth: number
  netCreditPs?: number
  netDebitPs?: number
  shortStrike: number
  longStrike: number
}

export function computeStressScenarios(input: StressInputs): {
  expectedMove1s: number
  scenarios: Record<'up_1s' | 'down_1s' | 'up_2s' | 'down_2s', StressScenario>
} {
  const expectedMove1s = input.underlyingPrice * input.sigma * Math.sqrt(input.dte / 365)

  const prices = {
    up_1s: input.underlyingPrice + expectedMove1s,
    down_1s: input.underlyingPrice - expectedMove1s,
    up_2s: input.underlyingPrice + 2 * expectedMove1s,
    down_2s: input.underlyingPrice - 2 * expectedMove1s,
  } as const

  const scenario = (price: number): StressScenario => {
    let pnlPs = 0

    if (input.strategy === 'CDS') {
      const distanceIntoSpread = Math.max(0, price - input.longStrike)
      const intrinsicGainPs = clamp(distanceIntoSpread, 0, input.spreadWidth)
      pnlPs = intrinsicGainPs - (input.netDebitPs ?? 0)
    } else if (input.strategy === 'PCS') {
      const distanceIntoSpread = Math.max(0, input.shortStrike - price)
      const intrinsicLossPs = clamp(distanceIntoSpread, 0, input.spreadWidth)
      pnlPs = (input.netCreditPs ?? 0) - intrinsicLossPs
    } else {
      const distanceIntoSpread = Math.max(0, price - input.shortStrike)
      const intrinsicLossPs = clamp(distanceIntoSpread, 0, input.spreadWidth)
      pnlPs = (input.netCreditPs ?? 0) - intrinsicLossPs
    }

    const pnlTotal = pnlPs * 100 * input.contracts
    return {
      price,
      pnlTotal,
      label: pnlTotal > 0 ? 'Win' : pnlTotal < 0 ? 'Loss' : 'Partial',
    }
  }

  return {
    expectedMove1s,
    scenarios: {
      up_1s: scenario(prices.up_1s),
      down_1s: scenario(prices.down_1s),
      up_2s: scenario(prices.up_2s),
      down_2s: scenario(prices.down_2s),
    },
  }
}
