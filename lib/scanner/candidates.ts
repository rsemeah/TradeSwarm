/**
 * Spread candidate generator.
 *
 * Generates PCS (put credit spread), CCS (call credit spread),
 * and CDS (call debit spread) candidates from a raw options chain.
 *
 * Selection criteria:
 *  • Short leg: 0.25–0.35 absolute delta (credit spreads)
 *  • Long leg: 0.10–0.20 delta (one width away from short)
 *  • Spread widths: $1 first, $2 fallback
 *  • Min bid-ask mid: $0.05 per share
 *  • Min OI: 100 on both legs
 */

import type { RawChain, RawOptionContract } from "./types"
import type { LegProof, ScanResult, SpreadType } from "@/lib/types/proof-bundle"
import { LIQUIDITY_GATES } from "./universe"
import { absDelta } from "./delta"

const SHORT_DELTA_MIN = 0.25
const SHORT_DELTA_MAX = 0.35
const SPREAD_WIDTHS = [1, 2, 5] // $1 first, fallback to $2 then $5

function contractLiquidityOk(c: RawOptionContract): boolean {
  const spread = c.ask - c.bid
  const relSpread = c.mid_ps > 0 ? spread / c.mid_ps : 1
  return (
    c.openInterest >= LIQUIDITY_GATES.minOpenInterest &&
    c.volume >= LIQUIDITY_GATES.minContractVolume &&
    relSpread <= LIQUIDITY_GATES.maxRelativeSpread &&
    c.mid_ps >= LIQUIDITY_GATES.minMidPricePs
  )
}

function toleg(c: RawOptionContract, side: "short" | "long", right: "C" | "P", expiration: string): LegProof {
  return {
    strike: c.strike,
    expiration,
    right,
    side,
    bid: c.bid,
    ask: c.ask,
    mid_ps: c.mid_ps,
    iv: c.impliedVolatility,
    delta: c.delta,
    oi: c.openInterest,
    volume: c.volume,
  }
}

function makeScanResult(params: {
  ticker: string
  spreadType: SpreadType
  tier: "A" | "B" | "C"
  expiration: string
  dte: number
  shortLeg: LegProof
  longLeg: LegProof
  scanId: string
}): Omit<ScanResult, "score" | "ivRv" | "news" | "stress" | "flags"> {
  const credit_ps =
    params.spreadType === "CDS"
      ? -(params.shortLeg.mid_ps - params.longLeg.mid_ps) // debit
      : params.shortLeg.mid_ps - params.longLeg.mid_ps   // credit

  const spreadWidth = Math.abs(params.longLeg.strike - params.shortLeg.strike)
  const maxLoss_ps = params.spreadType === "CDS"
    ? spreadWidth - Math.abs(credit_ps)
    : spreadWidth - credit_ps

  const ror_ps = maxLoss_ps > 0 ? credit_ps / maxLoss_ps : 0
  const pop = 1 - Math.abs(params.shortLeg.delta ?? (params.spreadType === "PCS" ? 0.30 : 0.30))

  return {
    ticker: params.ticker,
    spreadType: params.spreadType,
    tier: params.tier,
    expiration: params.expiration,
    dte: params.dte,
    shortLeg: params.shortLeg,
    longLeg: params.longLeg,
    credit_ps,
    maxLoss_ps,
    ror_ps,
    pop,
    contracts: 1, // sizing happens in score.ts
    scanId: params.scanId,
    candidateId: crypto.randomUUID().replace(/-/g, "").slice(0, 8),
    ts: new Date().toISOString(),
  }
}

function dteTier(dte: number): "A" | "B" | "C" | null {
  if (dte >= 3 && dte <= 7) return "A"
  if (dte >= 10 && dte <= 21) return "B"
  if (dte >= 22 && dte <= 30) return "C"
  return null
}

export function generateCandidates(params: {
  chain: RawChain
  ticker: string
  dte: number
  underlyingAvgVolume: number
  atmIv: number | null
  scanId: string
}): Omit<ScanResult, "score" | "ivRv" | "news" | "stress" | "flags">[] {
  const { chain, ticker, dte, underlyingAvgVolume, scanId } = params

  // Check underlying volume gate
  if (underlyingAvgVolume < LIQUIDITY_GATES.minAvgVolume) return []

  const tier = dteTier(dte)
  if (!tier) return []

  const expiration = chain.expiration ?? chain.expirations[0]
  if (!expiration) return []

  const results: Omit<ScanResult, "score" | "ivRv" | "news" | "stress" | "flags">[] = []
  const S = chain.underlyingPrice
  const iv = params.atmIv ?? 0.3
  const T = dte / 365

  // ─── PCS: short OTM put, long further OTM put ──────────────────────────────
  const shortPuts = chain.puts.filter((p) => {
    if (!contractLiquidityOk(p)) return false
    const delta = p.delta !== null
      ? Math.abs(p.delta)
      : absDelta({ S, K: p.strike, dte, sigma: iv, type: "P" })
    return delta >= SHORT_DELTA_MIN && delta <= SHORT_DELTA_MAX
  })

  for (const shortPut of shortPuts.slice(0, 3)) {
    for (const width of SPREAD_WIDTHS) {
      const longStrike = shortPut.strike - width
      const longPut = chain.puts.find(
        (p) => Math.abs(p.strike - longStrike) < 0.01 && contractLiquidityOk(p)
      )
      if (!longPut) continue
      if (shortPut.mid_ps <= longPut.mid_ps) continue // no credit

      results.push(
        makeScanResult({
          ticker, spreadType: "PCS", tier, expiration, dte,
          shortLeg: toleg(shortPut, "short", "P", expiration),
          longLeg: toleg(longPut, "long", "P", expiration),
          scanId,
        })
      )
      break // first valid width wins
    }
  }

  // ─── CCS: short OTM call, long further OTM call ────────────────────────────
  const shortCalls = chain.calls.filter((c) => {
    if (!contractLiquidityOk(c)) return false
    const delta = c.delta !== null
      ? Math.abs(c.delta)
      : absDelta({ S, K: c.strike, dte, sigma: iv, type: "C" })
    return delta >= SHORT_DELTA_MIN && delta <= SHORT_DELTA_MAX
  })

  for (const shortCall of shortCalls.slice(0, 3)) {
    for (const width of SPREAD_WIDTHS) {
      const longStrike = shortCall.strike + width
      const longCall = chain.calls.find(
        (c) => Math.abs(c.strike - longStrike) < 0.01 && contractLiquidityOk(c)
      )
      if (!longCall) continue
      if (shortCall.mid_ps <= longCall.mid_ps) continue

      results.push(
        makeScanResult({
          ticker, spreadType: "CCS", tier, expiration, dte,
          shortLeg: toleg(shortCall, "short", "C", expiration),
          longLeg: toleg(longCall, "long", "C", expiration),
          scanId,
        })
      )
      break
    }
  }

  return results
}
