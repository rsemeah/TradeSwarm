/**
 * Black-Scholes delta approximation.
 *
 * Uses Abramowitz & Stegun normCDF approximation (max error ~1.5e-7).
 * Used when exchange-provided Greeks are unavailable.
 *
 * All inputs in standard units:
 *  S   = spot price
 *  K   = strike price
 *  T   = time to expiration in years (DTE / 365)
 *  r   = risk-free rate (decimal, e.g. 0.05)
 *  σ   = implied volatility (decimal, e.g. 0.30)
 *  type = "C" | "P"
 */

function normCdf(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  const t = 1 / (1 + p * Math.abs(x))
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t
  const erf = 1 - poly * Math.exp(-x * x)
  return 0.5 * (1 + sign * erf)
}

export function bsDelta(params: {
  S: number
  K: number
  T: number   // years
  r: number
  sigma: number
  type: "C" | "P"
}): number {
  const { S, K, T, r, sigma, type } = params

  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) {
    // Intrinsic-only fallback
    if (type === "C") return S > K ? 1 : 0
    return S < K ? -1 : 0
  }

  const d1 =
    (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T))

  if (type === "C") return normCdf(d1)
  return normCdf(d1) - 1 // put delta = N(d1) - 1
}

/**
 * Convenience: get absolute delta for an OTM option,
 * returning a value in [0, 1].
 */
export function absDelta(params: {
  S: number
  K: number
  dte: number
  sigma: number
  type: "C" | "P"
  r?: number
}): number {
  const delta = bsDelta({
    S: params.S,
    K: params.K,
    T: params.dte / 365,
    r: params.r ?? 0.05,
    sigma: params.sigma,
    type: params.type,
  })
  return Math.abs(delta)
}
