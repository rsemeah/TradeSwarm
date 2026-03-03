function normCDF(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const sign = x < 0 ? -1 : 1
  let z = Math.abs(x) / Math.sqrt(2)
  const t = 1 / (1 + p * z)
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z))
  return 0.5 * (1 + sign * y)
}

export function computeDelta(S: number, K: number, T: number, sigma: number, type: 'call' | 'put', r = 0.05): number {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) return 0
  const d1 = (Math.log(S / K) + (r + sigma ** 2 / 2) * T) / (sigma * Math.sqrt(T))
  return type === 'call' ? normCDF(d1) : normCDF(d1) - 1
}
