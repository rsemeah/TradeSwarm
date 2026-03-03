import type { SupabaseClient } from "@supabase/supabase-js"

type CalibrationRow = {
  horizon_days: number
  predicted_probability: number
  realized_outcome: number
  observed_at: string
  model_combination: string
}

export type BucketMetric = {
  bucket: string
  count: number
  precision: number
  avgPredicted: number
}

export type ReliabilityPoint = {
  bucket: string
  expected: number
  observed: number
  count: number
}

export type CalibrationMetrics = {
  sampleSize: number
  brierScore: number
  byHorizon: { horizon: number; brierScore: number; sampleSize: number }[]
  precisionByBucket: BucketMetric[]
  reliability: ReliabilityPoint[]
  driftAlerts: { horizon: number; drift: number; threshold: number; flagged: boolean }[]
}

function toBucket(prob: number) {
  const lower = Math.floor(prob * 10) * 10
  const upper = Math.min(lower + 10, 100)
  return `${lower}-${upper}%`
}

function safeNum(value: number, divisor: number) {
  return divisor === 0 ? 0 : value / divisor
}

function brier(rows: CalibrationRow[]) {
  if (!rows.length) return 0
  return rows.reduce((acc, row) => acc + (row.predicted_probability - row.realized_outcome) ** 2, 0) / rows.length
}

function precisionByBucket(rows: CalibrationRow[]) {
  const grouped = new Map<string, { count: number; wins: number; predictedTotal: number }>()
  rows.forEach((row) => {
    const bucket = toBucket(row.predicted_probability)
    const current = grouped.get(bucket) || { count: 0, wins: 0, predictedTotal: 0 }
    current.count += 1
    current.wins += row.realized_outcome
    current.predictedTotal += row.predicted_probability
    grouped.set(bucket, current)
  })

  return Array.from(grouped.entries())
    .map(([bucket, data]) => ({
      bucket,
      count: data.count,
      precision: safeNum(data.wins, data.count),
      avgPredicted: safeNum(data.predictedTotal, data.count),
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket))
}

function driftByHorizon(current: CalibrationRow[], baseline: CalibrationRow[], threshold: number) {
  const horizons = Array.from(new Set(current.map((r) => r.horizon_days)))
  return horizons.map((horizon) => {
    const currentRows = current.filter((r) => r.horizon_days === horizon)
    const baselineRows = baseline.filter((r) => r.horizon_days === horizon)
    const currentRate = safeNum(currentRows.reduce((acc, r) => acc + r.realized_outcome, 0), currentRows.length)
    const baselineRate = safeNum(baselineRows.reduce((acc, r) => acc + r.realized_outcome, 0), baselineRows.length)
    const drift = Math.abs(currentRate - baselineRate)

    return {
      horizon,
      drift,
      threshold,
      flagged: drift > threshold,
    }
  })
}

export async function getCalibrationMetrics(supabase: SupabaseClient): Promise<CalibrationMetrics> {
  const { data: config } = await supabase
    .from("outcome_tracking_configs")
    .select("drift_threshold")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const driftThreshold = Number(config?.drift_threshold ?? 0.08)

  const now = new Date()
  const currentStart = new Date(now)
  currentStart.setDate(now.getDate() - 30)

  const baselineStart = new Date(now)
  baselineStart.setDate(now.getDate() - 60)

  const { data: currentData, error: currentError } = await supabase
    .from("model_calibration_datasets")
    .select("horizon_days,predicted_probability,realized_outcome,observed_at,model_combination")
    .gte("observed_at", currentStart.toISOString())

  if (currentError) {
    throw currentError
  }

  const { data: baselineData, error: baselineError } = await supabase
    .from("model_calibration_datasets")
    .select("horizon_days,predicted_probability,realized_outcome,observed_at,model_combination")
    .gte("observed_at", baselineStart.toISOString())
    .lt("observed_at", currentStart.toISOString())

  if (baselineError) {
    throw baselineError
  }

  const rows = (currentData || []) as CalibrationRow[]
  const baselineRows = (baselineData || []) as CalibrationRow[]

  const byHorizon = Array.from(new Set(rows.map((r) => r.horizon_days))).map((horizon) => {
    const scoped = rows.filter((r) => r.horizon_days === horizon)
    return { horizon, brierScore: brier(scoped), sampleSize: scoped.length }
  })

  const bucketMetrics = precisionByBucket(rows)

  return {
    sampleSize: rows.length,
    brierScore: brier(rows),
    byHorizon,
    precisionByBucket: bucketMetrics,
    reliability: bucketMetrics.map((b) => ({
      bucket: b.bucket,
      expected: b.avgPredicted,
      observed: b.precision,
      count: b.count,
    })),
    driftAlerts: driftByHorizon(rows, baselineRows, driftThreshold),
  }
}
