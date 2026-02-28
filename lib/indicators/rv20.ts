/**
 * RV20 — 20-day rolling realized volatility (annualized).
 *
 * Formula: σ_rv = std(ln(P_i / P_{i-1})) × √252
 * Falls back to 0.5 if fewer than 20 closing prices available.
 */

export interface Rv20Result {
  series: number[]     // full log-return series (annualized)
  current: number      // most recent 20-day RV (annualized)
  low: number
  high: number
  sufficient: boolean  // true if ≥20 closes provided
}

export function computeRv20(closes: number[]): Rv20Result {
  if (closes.length < 2) {
    return { series: [], current: 0.5, low: 0.5, high: 0.5, sufficient: false }
  }

  // Log returns
  const logReturns: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1]
    const curr = closes[i]
    if (prev > 0 && curr > 0) {
      logReturns.push(Math.log(curr / prev))
    }
  }

  if (logReturns.length < 2) {
    return { series: [], current: 0.5, low: 0.5, high: 0.5, sufficient: false }
  }

  // Compute rolling 20-day RV
  const window = 20
  const series: number[] = []

  for (let i = window - 1; i < logReturns.length; i++) {
    const slice = logReturns.slice(i - window + 1, i + 1)
    const mean = slice.reduce((s, r) => s + r, 0) / slice.length
    const variance = slice.reduce((s, r) => s + (r - mean) ** 2, 0) / (slice.length - 1)
    series.push(Math.sqrt(variance * 252))
  }

  if (series.length === 0) {
    // Not enough data for a full 20-day window — use full period
    const mean = logReturns.reduce((s, r) => s + r, 0) / logReturns.length
    const variance =
      logReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (logReturns.length - 1)
    const rv = Math.sqrt(variance * 252)
    return { series: [rv], current: rv, low: rv, high: rv, sufficient: false }
  }

  return {
    series,
    current: series[series.length - 1],
    low: Math.min(...series),
    high: Math.max(...series),
    sufficient: closes.length >= 22, // 22 closes → 21 returns → one full 20-day window
  }
}

export interface IvRvResult {
  position: number    // currentIv / rv20  (>1 = IV rich)
  sufficient: boolean
}

export function computeIvRvPosition(currentIv: number, rv20: number): IvRvResult {
  if (rv20 <= 0) return { position: 1, sufficient: false }
  return {
    position: Math.round((currentIv / rv20) * 100) / 100,
    sufficient: true,
  }
}
