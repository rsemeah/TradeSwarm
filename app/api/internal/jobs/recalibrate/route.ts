import { createAdminClient } from "@/lib/supabase/admin"
import { updateThresholds } from "@/lib/calibration/updateThresholds"

function authorized(req: Request) {
  const expected = process.env.INTERNAL_JOBS_TOKEN
  if (!expected) return true
  return req.headers.get("x-internal-token") === expected
}

type DatasetRow = {
  model_combination: string
  predicted_probability: number
  realized_outcome: number
}

function brier(rows: DatasetRow[]) {
  if (!rows.length) return 1
  return rows.reduce((acc, row) => acc + (row.predicted_probability - row.realized_outcome) ** 2, 0) / rows.length
}

export async function POST(req: Request) {
  try {
    if (!authorized(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const thresholdUpdate = await updateThresholds()
    const supabase = createAdminClient()

    const start = new Date()
    start.setDate(start.getDate() - thresholdUpdate.windowDays)

    const { data: dataset, error: datasetError } = await supabase
      .from("model_calibration_datasets")
      .select("model_combination,predicted_probability,realized_outcome")
      .gte("observed_at", start.toISOString())

    if (datasetError) throw datasetError

    const rows = (dataset || []) as DatasetRow[]
    if (!rows.length) {
      return Response.json({ success: true, message: "No data available for recalibration", thresholdUpdate })
    }

    const grouped = new Map<string, DatasetRow[]>()
    rows.forEach((row) => {
      const current = grouped.get(row.model_combination) || []
      current.push(row)
      grouped.set(row.model_combination, current)
    })

    const inverseScores = Array.from(grouped.entries()).map(([key, values]) => {
      const modelBrier = brier(values)
      return { key, brier: modelBrier, inverse: 1 / Math.max(modelBrier, 0.0001) }
    })

    const inverseTotal = inverseScores.reduce((acc, score) => acc + score.inverse, 0)
    const normalizedWeights = inverseScores.reduce<Record<string, number>>((acc, score) => {
      acc[score.key] = Number((score.inverse / inverseTotal).toFixed(4))
      return acc
    }, {})

    const { data: currentConfig } = await supabase
      .from("model_weight_configs")
      .select("id,version,weights")
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextVersion = (currentConfig?.version || 0) + 1

    if (currentConfig?.id) {
      await supabase.from("model_weight_configs").update({ is_active: false }).eq("id", currentConfig.id)
    }

    const { data: insertedConfig, error: insertConfigError } = await supabase
      .from("model_weight_configs")
      .insert({
        version: nextVersion,
        weights: normalizedWeights,
        config_meta: {
          source: "periodic_recalibration",
          thresholdUpdate,
        },
        is_active: true,
        created_by: "recalibration_job",
      })
      .select("id,version")
      .single()

    if (insertConfigError) throw insertConfigError

    await supabase.from("model_governance_log").insert({
      weight_config_id: insertedConfig.id,
      previous_version: currentConfig?.version || null,
      new_version: insertedConfig.version,
      triggered_by: "recalibration_job",
      change_summary: "Updated model weights and calibration thresholds from rolling dataset",
      metrics_snapshot: {
        sampleSize: rows.length,
        previousWeights: currentConfig?.weights || null,
        newWeights: normalizedWeights,
        thresholdUpdate,
      },
    })

    return Response.json({
      success: true,
      version: nextVersion,
      sampleSize: rows.length,
      weights: normalizedWeights,
      thresholdUpdate,
    })
  } catch (error) {
    console.error("Recalibration job error", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
