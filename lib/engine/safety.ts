import { SAFETY_THRESHOLDS } from "@/lib/config/engine"

export interface SafetyInput {
  bankroll: number
  proposedNotional: number
  spreadPct?: number
  optionVolume24h?: number
  optionOpenInterest?: number
  underlyingVolume24h?: number
  estimatedSlippagePct?: number
  isInEarningsBlackout?: boolean
  truthSerumAvailable: boolean
  mode: "preview" | "simulate" | "execute" | "analyze"
}

export interface SafetyVerdict {
  allowed: boolean
  maxSizeHint: number
  reasons: string[]
  safetyNotes: string[]
}

export function evaluateSafety(input: SafetyInput): SafetyVerdict {
  const reasons: string[] = []
  const notes: string[] = []

  if (input.mode === "execute" && !input.truthSerumAvailable) {
    reasons.push("TruthSerum unavailable; execute is fail-closed")
  }

  if ((input.spreadPct ?? 0) > SAFETY_THRESHOLDS.maxSpreadPct) {
    reasons.push(`Spread too wide (${input.spreadPct}%)`)
  }

  if ((input.underlyingVolume24h ?? 0) < SAFETY_THRESHOLDS.minUnderlyingVolume24h) {
    reasons.push("Underlying volume below threshold")
  }

  if ((input.optionVolume24h ?? 0) < SAFETY_THRESHOLDS.minOptionVolume24h) {
    reasons.push("Option volume below threshold")
  }

  if ((input.optionOpenInterest ?? 0) < SAFETY_THRESHOLDS.minOptionOpenInterest) {
    reasons.push("Option open interest below threshold")
  }

  if ((input.estimatedSlippagePct ?? 0) > SAFETY_THRESHOLDS.maxEstimatedSlippagePct) {
    reasons.push("Estimated slippage exceeds threshold")
  }

  if (input.isInEarningsBlackout) {
    reasons.push("Earnings blackout window active")
  }

  const bankrollCap = input.bankroll * (SAFETY_THRESHOLDS.maxSizeCapPctOfBankroll / 100)
  const notionalCap = SAFETY_THRESHOLDS.maxNotionalPerTradeUsd
  const maxSizeHint = Math.max(0, Math.min(bankrollCap, notionalCap))

  if (input.proposedNotional > maxSizeHint) {
    notes.push(`Proposed notional clipped to ${maxSizeHint.toFixed(2)}`)
  }

  return {
    allowed: reasons.length === 0,
    maxSizeHint,
    reasons,
    safetyNotes: notes,
  }
}
