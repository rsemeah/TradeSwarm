/**
 * Stress test — locked interpolation at ±1σ and ±2σ price scenarios.
 *
 * expected_move_1σ = S × σ × √(DTE / 365)
 *
 * P&L at expiry for a vertical spread:
 *   PCS: max profit = credit received (short put expires worthless)
 *        max loss   = (spread width − credit) if underlying below long strike
 *   CCS: max profit = credit received (short call expires worthless)
 *        max loss   = (spread width − credit) if underlying above long strike
 *
 * pnl_total = pnl_ps × 100 × contracts
 */

import type { StressProof, StressRow, StressScenario } from "@/lib/types/proof-bundle"
import type { ScanResult } from "@/lib/types/proof-bundle"

type CandidateForStress = Pick<
  ScanResult,
  "shortLeg" | "longLeg" | "spreadType" | "credit_ps" | "maxLoss_ps" | "contracts"
> & { underlyingPrice: number; atmIv: number; dte: number }

function pnlAtExpiry(
  candidate: CandidateForStress,
  finalPrice: number
): number {
  const { shortLeg, longLeg, spreadType, credit_ps, maxLoss_ps } = candidate

  if (spreadType === "PCS") {
    // profit if price > short put strike at expiry
    if (finalPrice >= shortLeg.strike) return credit_ps
    if (finalPrice <= longLeg.strike) return -maxLoss_ps
    // interpolate
    const range = shortLeg.strike - longLeg.strike
    const pct = (finalPrice - longLeg.strike) / range
    return -maxLoss_ps + pct * (credit_ps + maxLoss_ps)
  }

  if (spreadType === "CCS") {
    // profit if price < short call strike at expiry
    if (finalPrice <= shortLeg.strike) return credit_ps
    if (finalPrice >= longLeg.strike) return -maxLoss_ps
    const range = longLeg.strike - shortLeg.strike
    const pct = (finalPrice - shortLeg.strike) / range
    return credit_ps - pct * (credit_ps + maxLoss_ps)
  }

  // CDS: long call spread — profit if price > long strike
  if (finalPrice >= longLeg.strike) return credit_ps  // credit_ps is negative for debit
  if (finalPrice <= shortLeg.strike) return maxLoss_ps
  return 0
}

export function computeStress(candidate: CandidateForStress): StressProof {
  const { underlyingPrice: S, atmIv: sigma, dte, contracts } = candidate

  const expected_move_1sigma =
    Math.round(S * sigma * Math.sqrt(dte / 365) * 100) / 100

  const scenarios: { scenario: StressScenario; move: number }[] = [
    { scenario: "+2σ", move: 2 * expected_move_1sigma },
    { scenario: "+1σ", move: expected_move_1sigma },
    { scenario: "-1σ", move: -expected_move_1sigma },
    { scenario: "-2σ", move: -2 * expected_move_1sigma },
  ]

  const rows: StressRow[] = scenarios.map(({ scenario, move }) => {
    const finalPrice = Math.max(0.01, S + move)
    const pnl_ps = pnlAtExpiry(candidate, finalPrice)
    const pnl_total = Math.round(pnl_ps * 100 * contracts * 100) / 100

    return {
      scenario,
      underlyingMove_pct: Math.round((move / S) * 10000) / 10000,
      pnl_ps: Math.round(pnl_ps * 100) / 100,
      pnl_total,
    }
  })

  const max_loss_total = Math.min(...rows.map((r) => r.pnl_total))

  return {
    expected_move_1sigma,
    scenarios: rows,
    contracts,
    max_loss_total,
  }
}
