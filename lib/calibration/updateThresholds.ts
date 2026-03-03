import { createAdminClient } from "@/lib/supabase/admin"

interface RegimeBucket {
  wins: number
  total: number
}

interface ConfidenceBucket {
  predicted: number
  actual: number
  total: number
}

interface UpdateThresholdsResult {
  windowDays: number
  driftTolerance: number
  sampleSize: number
  regimeWinRates: Record<string, number>
  bucketDrift: Record<string, number>
  suggestedTightening: boolean
  suggestedMinTrustScore: number
}

export async function updateThresholds(): Promise<UpdateThresholdsResult> {
  const supabase = createAdminClient()

  const { data: config } = await supabase
    .from("outcome_tracking_configs")
    .select("recalibration_window_days,drift_threshold")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const windowDays = Number(config?.recalibration_window_days ?? 90)
  const driftTolerance = Number(config?.drift_threshold ?? 0.08)

  const start = new Date()
  start.setDate(start.getDate() - windowDays)

  const { data: dataset, error } = await supabase
    .from("model_calibration_datasets")
    .select("regime,predicted_probability,realized_outcome,confidence_bucket")
    .gte("observed_at", start.toISOString())

  if (error) throw error

  const rows = (dataset ?? []) as Array<{
    regime: string | null
    predicted_probability: number
    realized_outcome: number
    confidence_bucket: string
  }>

  const regimeStats = new Map<string, RegimeBucket>()
  const bucketStats = new Map<string, ConfidenceBucket>()

  for (const row of rows) {
    const regime = row.regime ?? "unknown"
    const regimeCurrent = regimeStats.get(regime) ?? { wins: 0, total: 0 }
    regimeCurrent.wins += row.realized_outcome === 1 ? 1 : 0
    regimeCurrent.total += 1
    regimeStats.set(regime, regimeCurrent)

    const bucket = row.confidence_bucket || "unknown"
    const bucketCurrent = bucketStats.get(bucket) ?? { predicted: 0, actual: 0, total: 0 }
    bucketCurrent.predicted += Number(row.predicted_probability)
    bucketCurrent.actual += Number(row.realized_outcome)
    bucketCurrent.total += 1
    bucketStats.set(bucket, bucketCurrent)
  }

  const regimeWinRates = Array.from(regimeStats.entries()).reduce<Record<string, number>>((acc, [regime, stats]) => {
    acc[regime] = stats.total > 0 ? Number((stats.wins / stats.total).toFixed(4)) : 0
    return acc
  }, {})

  const bucketDrift = Array.from(bucketStats.entries()).reduce<Record<string, number>>((acc, [bucket, stats]) => {
    const predicted = stats.total > 0 ? stats.predicted / stats.total : 0
    const actual = stats.total > 0 ? stats.actual / stats.total : 0
    acc[bucket] = Number(Math.abs(predicted - actual).toFixed(4))
    return acc
  }, {})

  const maxDrift = Math.max(0, ...Object.values(bucketDrift))
  const suggestedTightening = maxDrift > driftTolerance
  const suggestedMinTrustScore = suggestedTightening ? 60 : 50

  const eventPayload = {
    windowDays,
    driftTolerance,
    sampleSize: rows.length,
    regimeWinRates,
    bucketDrift,
    suggestedTightening,
    suggestedMinTrustScore,
  }

  try {
    await supabase.from("engine_events").insert({
      request_id: crypto.randomUUID(),
      user_id: null,
      name: "CALIBRATION_THRESHOLDS_UPDATED",
      stage: "calibration",
      status: "ok",
      ticker: null,
      payload: eventPayload,
      duration_ms: null,
    })
  } catch {
    await supabase.from("engine_events").insert({
      user_id: null,
      event_type: "analysis_completed",
      payload: eventPayload,
      ticker: null,
    })
  }

  return {
    windowDays,
    driftTolerance,
    sampleSize: rows.length,
    regimeWinRates,
    bucketDrift,
    suggestedTightening,
    suggestedMinTrustScore,
  }
}
