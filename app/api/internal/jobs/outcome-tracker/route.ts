import { createAdminClient } from "@/lib/supabase/admin"

function authorized(req: Request) {
  const expected = process.env.INTERNAL_JOBS_TOKEN
  if (!expected) return true
  return req.headers.get("x-internal-token") === expected
}

function getModelCombination(aiConsensus: Record<string, unknown> | null) {
  if (!aiConsensus) return "unknown"
  const candidates = ["groq", "openai", "claude"].filter((model) => aiConsensus[model] !== undefined)
  return candidates.length ? candidates.sort().join("+") : "unknown"
}

function getRiskGrade(riskData: Record<string, unknown> | null) {
  const explicitGrade = typeof riskData?.grade === "string" ? riskData.grade : null
  if (explicitGrade) return explicitGrade

  const confidence = Number(riskData?.confidence ?? 0)
  if (confidence >= 0.75) return "A"
  if (confidence >= 0.55) return "B"
  return "C"
}

function getConfidenceBucket(probability: number) {
  const lower = Math.floor(probability * 10) * 10
  const upper = Math.min(lower + 10, 100)
  return `${lower}-${upper}%`
}

export async function POST(req: Request) {
  try {
    if (!authorized(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: config } = await supabase
      .from("outcome_tracking_configs")
      .select("horizons_days")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const horizons: number[] = config?.horizons_days || [1, 5, 20]

    const { data: trades, error: tradesError } = await supabase
      .from("trades")
      .select("id,user_id,created_at,outcome,pnl,win_likelihood,trust_score,ai_consensus,regime_data,risk_data")
      .in("status", ["executed", "simulated"])
      .order("created_at", { ascending: true })

    if (tradesError) {
      throw tradesError
    }

    let labelsCreated = 0
    let datasetsCreated = 0

    for (const trade of trades || []) {
      for (const horizon of horizons) {
        const horizonMs = horizon * 24 * 60 * 60 * 1000
        if (Date.now() - new Date(trade.created_at).getTime() < horizonMs) {
          continue
        }

        const { data: existingLabel } = await supabase
          .from("trade_outcome_labels")
          .select("id")
          .eq("trade_id", trade.id)
          .eq("horizon_days", horizon)
          .maybeSingle()

        if (existingLabel) {
          continue
        }

        const predictedRaw = Number(trade.win_likelihood ?? trade.trust_score ?? 50)
        const predictedProbability = Math.max(0, Math.min(1, predictedRaw / 100))

        let realizedOutcome = 0
        if (trade.outcome === "win") realizedOutcome = 1
        if (trade.outcome === "loss") realizedOutcome = 0
        if (trade.outcome !== "win" && trade.outcome !== "loss") {
          realizedOutcome = Number(trade.pnl ?? 0) > 0 ? 1 : 0
        }

        const labelRecord = {
          trade_id: trade.id,
          user_id: trade.user_id,
          horizon_days: horizon,
          predicted_probability: predictedProbability,
          realized_outcome: realizedOutcome,
        }

        const { error: labelError } = await supabase.from("trade_outcome_labels").insert(labelRecord)
        if (labelError) throw labelError
        labelsCreated += 1

        const regimeData = (trade.regime_data || {}) as Record<string, unknown>
        const riskData = (trade.risk_data || {}) as Record<string, unknown>
        const aiConsensus = (trade.ai_consensus || {}) as Record<string, unknown>

        const datasetRecord = {
          trade_id: trade.id,
          user_id: trade.user_id,
          horizon_days: horizon,
          predicted_probability: predictedProbability,
          realized_outcome: realizedOutcome,
          regime: String(regimeData.trend || regimeData.regime || "unknown"),
          risk_grade: getRiskGrade(riskData),
          model_combination: getModelCombination(aiConsensus),
          confidence_bucket: getConfidenceBucket(predictedProbability),
        }

        const { error: datasetError } = await supabase.from("model_calibration_datasets").insert(datasetRecord)
        if (datasetError) throw datasetError
        datasetsCreated += 1
      }
    }

    return Response.json({ success: true, labelsCreated, datasetsCreated, horizons })
  } catch (error) {
    console.error("Outcome tracker job error", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
