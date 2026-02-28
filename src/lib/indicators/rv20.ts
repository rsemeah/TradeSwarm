export interface Rv20Result {
  series: number[]
  low: number
  high: number
  current: number
  sufficient: boolean
}

export function computeRv20(closes: number[]): Rv20Result {
  if (closes.length < 21) {
    return { series: [], low: 0, high: 0, current: 0.2, sufficient: false }
  }

  const returns: number[] = []
  for (let i = 1; i < closes.length; i += 1) {
    returns.push(Math.log(closes[i] / closes[i - 1]))
  }

  const series: number[] = []
  for (let i = 20; i <= returns.length; i += 1) {
    const window = returns.slice(i - 20, i)
    const mean = window.reduce((a, b) => a + b, 0) / window.length
    const variance = window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length
    const rv = Math.sqrt(variance) * Math.sqrt(252)
    series.push(rv)
  }

  const low = Math.min(...series)
  const high = Math.max(...series)
  const current = series[series.length - 1]

  return { series, low, high, current, sufficient: series.length >= 30 }
}

export function computeIvRvPosition(currentIv: number, rv20: Rv20Result): { position: number; sufficient: boolean } {
  if (!rv20.sufficient || rv20.high === rv20.low) {
    return { position: 0.5, sufficient: false }
  }
  const position = (currentIv - rv20.low) / (rv20.high - rv20.low)
  return { position: Math.max(0, Math.min(1, position)), sufficient: true }
}
