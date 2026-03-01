/**
 * CP3 Policy Gate
 *
 * Reads the operator-controlled calibration_policy and exposes two checks:
 *   1. getActivePolicy()      — current min confidence + risk limits
 *   2. isDriftHalt(driftState) — should execute routes stop for this drift level?
 *
 * This is intentionally operator-approved, not automatic.
 * The engine recommends; the operator approves; the gate enforces.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { DriftState } from "./cp3"

export type CalibrationPolicy = {
  minConfidenceToExecute: number
  maxRiskPct: number
  haltOnDriftAlert: boolean
  strategyOverrides: Record<string, unknown>
}

const DEFAULT_POLICY: CalibrationPolicy = {
  minConfidenceToExecute: 0.55,
  maxRiskPct: 5.0,
  haltOnDriftAlert: false,
  strategyOverrides: {},
}

export async function getActivePolicy(supabase: SupabaseClient): Promise<CalibrationPolicy> {
  const { data, error } = await supabase
    .from("calibration_policy")
    .select("min_confidence_to_execute,max_risk_pct,halt_on_drift_alert,strategy_overrides")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return DEFAULT_POLICY

  return {
    minConfidenceToExecute: Number(data.min_confidence_to_execute ?? DEFAULT_POLICY.minConfidenceToExecute),
    maxRiskPct: Number(data.max_risk_pct ?? DEFAULT_POLICY.maxRiskPct),
    haltOnDriftAlert: Boolean(data.halt_on_drift_alert ?? DEFAULT_POLICY.haltOnDriftAlert),
    strategyOverrides: (data.strategy_overrides as Record<string, unknown>) ?? {},
  }
}

/**
 * Returns true when execution should be halted due to drift.
 * Only halts if the operator has explicitly enabled halt_on_drift_alert.
 */
export function isDriftHalt(drift: DriftState, policy: CalibrationPolicy): boolean {
  if (drift === "ALERT" && policy.haltOnDriftAlert) return true
  return false
}

/**
 * Returns true when a given confidence score passes the policy floor.
 * engineScore is 0–100; policy threshold is 0–1.
 */
export function isConfidenceAboveFloor(engineScore: number, policy: CalibrationPolicy): boolean {
  const normalized = Math.max(0, Math.min(1, engineScore / 100))
  return normalized >= policy.minConfidenceToExecute
}

/**
 * Checks whether a strategy is disabled in a given regime.
 * strategyOverrides shape: { "iron_condor": { "disable_in_regimes": ["bearish"] } }
 */
export function isStrategyAllowed(
  strategyType: string,
  regimeAtEntry: string,
  policy: CalibrationPolicy
): boolean {
  const override = policy.strategyOverrides[strategyType] as
    | { disable_in_regimes?: string[] }
    | undefined
  if (!override?.disable_in_regimes) return true
  return !override.disable_in_regimes.includes(regimeAtEntry)
}
