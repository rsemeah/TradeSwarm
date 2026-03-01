/**
 * CP3 — Outcome-Calibrated Confidence
 *
 * The four adult metrics:
 *   1. ECE   – Expected Calibration Error (do confidence bins match win rates?)
 *   2. Selectivity curve – top X% confidence trades: does win rate improve?
 *   3. Drift state (OK / WARN / ALERT) – is the engine lying because market changed?
 *   4. EV alignment – does expected value track realized outcomes?
 */

import type { SupabaseClient } from "@supabase/supabase-js"

// ─── Types ───────────────────────────────────────────────────────────────────

export type DriftState = "OK" | "WARN" | "ALERT"

export type CalibrationBin = {
  range: string
  lowerBound: number
  upperBound: number
  predicted: number
  actual: number
  count: number
  /** Contribution to ECE = (count/total) * |predicted - actual| */
  contribution: number
}

export type SelectivityPoint = {
  topPct: number
  winRate: number
  count: number
}

export type EvAlignment = {
  /** Σ(confidence * credit - (1-confidence) * max_risk) for options trades */
  expectedEV: number
  /** Σ(realized_pnl) */
  realizedEV: number
  /** realizedEV / expectedEV; 1.0 = perfect alignment */
  alignmentRatio: number
  sampleSize: number
}

export type RecommendedThresholds = {
  minConfidenceToExecute: number
  /** RAISE | LOWER | HOLD */
  action: "RAISE" | "LOWER" | "HOLD"
  reason: string
}

export type Cp3Report = {
  generatedAt: string
  windowDays: number
  sampleSize: number
  ece: number
  brierScore: number
  drift: DriftState
  bins: CalibrationBin[]
  selectivity: SelectivityPoint[]
  evAlignment: EvAlignment
  recommendedThresholds: RecommendedThresholds
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

const ECE_WARN_THRESHOLD = 0.05
const ECE_ALERT_THRESHOLD = 0.10
const SELECTIVITY_PERCENTILES = [10, 25, 50, 75, 100]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function boundedBucket(prob: number): { lower: number; upper: number; range: string } {
  const lower = Math.floor(prob * 10) * 10
  const upper = Math.min(lower + 10, 100)
  return { lower, upper, range: `${lower}-${upper}%` }
}

function brierScore(rows: { predicted: number; actual: number }[]): number {
  if (!rows.length) return 0
  return rows.reduce((acc, r) => acc + (r.predicted - r.actual) ** 2, 0) / rows.length
}

// ─── Metric: ECE + Bins ──────────────────────────────────────────────────────

function computeEceBins(
  rows: { predicted_probability: number; realized_outcome: number }[]
): { ece: number; bins: CalibrationBin[] } {
  const total = rows.length
  if (total === 0) return { ece: 0, bins: [] }

  const grouped = new Map<
    string,
    { lower: number; upper: number; predicted: number; actual: number; count: number }
  >()

  for (const row of rows) {
    const { lower, upper, range } = boundedBucket(row.predicted_probability)
    const entry = grouped.get(range) ?? { lower, upper, predicted: 0, actual: 0, count: 0 }
    entry.predicted += row.predicted_probability
    entry.actual += row.realized_outcome
    entry.count += 1
    grouped.set(range, entry)
  }

  let ece = 0
  const bins: CalibrationBin[] = []

  for (const [range, data] of grouped) {
    const avgPredicted = data.predicted / data.count
    const avgActual = data.actual / data.count
    const weight = data.count / total
    const contribution = weight * Math.abs(avgPredicted - avgActual)
    ece += contribution
    bins.push({
      range,
      lowerBound: data.lower / 100,
      upperBound: data.upper / 100,
      predicted: Math.round(avgPredicted * 1e5) / 1e5,
      actual: Math.round(avgActual * 1e5) / 1e5,
      count: data.count,
      contribution: Math.round(contribution * 1e5) / 1e5,
    })
  }

  bins.sort((a, b) => a.lowerBound - b.lowerBound)

  return { ece: Math.round(ece * 1e6) / 1e6, bins }
}

// ─── Metric: Selectivity Curve ───────────────────────────────────────────────

function computeSelectivity(
  rows: { predicted_probability: number; realized_outcome: number }[]
): SelectivityPoint[] {
  if (!rows.length) return []

  const sorted = [...rows].sort((a, b) => b.predicted_probability - a.predicted_probability)
  const total = sorted.length

  return SELECTIVITY_PERCENTILES.map((pct) => {
    const cutoff = Math.max(1, Math.round((pct / 100) * total))
    const slice = sorted.slice(0, cutoff)
    const wins = slice.reduce((acc, r) => acc + r.realized_outcome, 0)
    return {
      topPct: pct,
      winRate: Math.round((wins / slice.length) * 1e4) / 1e4,
      count: slice.length,
    }
  })
}

// ─── Metric: EV Alignment (options-aware) ────────────────────────────────────

function computeEvAlignment(
  rows: {
    confidence_at_entry: number | null
    credit_received: number | null
    max_risk: number | null
    realized_pnl: number | null
  }[]
): EvAlignment {
  const optionsRows = rows.filter(
    (r) =>
      r.confidence_at_entry !== null &&
      r.credit_received !== null &&
      r.max_risk !== null &&
      r.realized_pnl !== null
  )

  if (!optionsRows.length) {
    return { expectedEV: 0, realizedEV: 0, alignmentRatio: 1, sampleSize: 0 }
  }

  const expectedEV = optionsRows.reduce((acc, r) => {
    const c = r.confidence_at_entry!
    const credit = r.credit_received!
    const risk = r.max_risk!
    return acc + c * credit - (1 - c) * risk
  }, 0)

  const realizedEV = optionsRows.reduce((acc, r) => acc + r.realized_pnl!, 0)

  const alignmentRatio =
    expectedEV === 0
      ? 1
      : Math.round((realizedEV / expectedEV) * 1e4) / 1e4

  return {
    expectedEV: Math.round(expectedEV * 100) / 100,
    realizedEV: Math.round(realizedEV * 100) / 100,
    alignmentRatio,
    sampleSize: optionsRows.length,
  }
}

// ─── Drift State ─────────────────────────────────────────────────────────────

function classifyDrift(ece: number): DriftState {
  if (ece >= ECE_ALERT_THRESHOLD) return "ALERT"
  if (ece >= ECE_WARN_THRESHOLD) return "WARN"
  return "OK"
}

// ─── Recommended Thresholds ──────────────────────────────────────────────────

function recommendThresholds(
  drift: DriftState,
  ece: number,
  currentMin: number
): RecommendedThresholds {
  if (drift === "ALERT") {
    const raised = Math.min(0.85, Math.round((currentMin + 0.10) * 100) / 100)
    return {
      minConfidenceToExecute: raised,
      action: "RAISE",
      reason: `ECE ${(ece * 100).toFixed(1)}% exceeds alert threshold — raise confidence floor to filter marginal signals`,
    }
  }
  if (drift === "WARN") {
    const raised = Math.min(0.85, Math.round((currentMin + 0.05) * 100) / 100)
    return {
      minConfidenceToExecute: raised,
      action: "RAISE",
      reason: `ECE ${(ece * 100).toFixed(1)}% in warning zone — minor confidence raise recommended`,
    }
  }
  return {
    minConfidenceToExecute: currentMin,
    action: "HOLD",
    reason: `ECE ${(ece * 100).toFixed(1)}% within tolerance — no threshold change needed`,
  }
}

// ─── Main: buildCp3Report ─────────────────────────────────────────────────────

type CalibrationRow = {
  predicted_probability: number
  realized_outcome: number
  confidence_at_entry?: number | null
  credit_received?: number | null
  max_risk?: number | null
  realized_pnl?: number | null
}

export async function buildCp3Report(
  supabase: SupabaseClient,
  windowDays: number = 200
): Promise<Cp3Report> {
  const since = new Date()
  since.setDate(since.getDate() - windowDays)

  // Pull from model_calibration_datasets (populated by outcome-tracker job + close endpoint)
  const { data: datasetRows, error: datasetError } = await supabase
    .from("model_calibration_datasets")
    .select("predicted_probability,realized_outcome")
    .gte("observed_at", since.toISOString())
    .order("observed_at", { ascending: false })

  if (datasetError) throw datasetError

  // Pull trades_v2 closed rows for EV alignment (need options-specific fields)
  const { data: tv2Rows, error: tv2Error } = await supabase
    .from("trades_v2")
    .select("confidence_at_entry,credit_received,max_risk,realized_pnl")
    .neq("outcome", "open")
    .not("outcome", "is", null)
    .gte("created_at", since.toISOString())

  if (tv2Error) throw tv2Error

  const rows = (datasetRows ?? []) as CalibrationRow[]
  const tv2 = (tv2Rows ?? []) as CalibrationRow[]

  // Fetch active policy for current min confidence
  const { data: policyRow } = await supabase
    .from("calibration_policy")
    .select("min_confidence_to_execute")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const currentMin = Number(policyRow?.min_confidence_to_execute ?? 0.55)

  const { ece, bins } = computeEceBins(rows)
  const selectivity = computeSelectivity(rows)
  const evAlignment = computeEvAlignment(tv2)
  const drift = classifyDrift(ece)
  const recommendedThresholds = recommendThresholds(drift, ece, currentMin)

  const brier = brierScore(rows.map((r) => ({ predicted: r.predicted_probability, actual: r.realized_outcome })))

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    sampleSize: rows.length,
    ece,
    brierScore: Math.round(brier * 1e6) / 1e6,
    drift,
    bins,
    selectivity,
    evAlignment,
    recommendedThresholds,
  }
}

// ─── Log drift event to DB ───────────────────────────────────────────────────

export async function logDriftEvent(
  supabase: SupabaseClient,
  report: Cp3Report
): Promise<void> {
  await supabase.from("cp3_drift_events").insert({
    drift_state: report.drift,
    ece: report.ece,
    sample_size: report.sampleSize,
    window_days: report.windowDays,
    payload: {
      brierScore: report.brierScore,
      selectivity: report.selectivity,
      recommendedThresholds: report.recommendedThresholds,
    },
  })
}
