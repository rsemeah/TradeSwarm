import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { trade_id, exit_price } = await req.json()
    if (!trade_id || typeof exit_price !== "number") {
      return Response.json({ error: "trade_id and exit_price are required" }, { status: 400 })
    }

    const { data: trade, error: fetchError } = await supabase
      .from("trades_v2")
      .select("id, outcome, credit_received, max_risk, engine_score_at_entry, regime_at_entry, strategy_type")
      .eq("id", trade_id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !trade) {
      return Response.json({ error: "Trade not found" }, { status: 404 })
    }

    if (trade.outcome !== "open") {
      return Response.json({ error: "Trade already closed" }, { status: 400 })
    }

    const credit = Number(trade.credit_received ?? 0)
    // Realized PnL is net credit retained after paying exit price.
    const realizedPnl = Number((credit - exit_price).toFixed(2))
    const outcome = realizedPnl > 0 ? "win" : realizedPnl < 0 ? "loss" : "breakeven"
    const realizedOutcome = realizedPnl > 0 ? 1 : 0

    const { data, error: updateError } = await supabase
      .from("trades_v2")
      .update({
        exit_price,
        realized_pnl: realizedPnl,
        outcome,
      })
      .eq("id", trade_id)
      .eq("user_id", user.id)
      .select("id, outcome, realized_pnl")
      .single()

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 400 })
    }

    // CP3: immediately write a calibration dataset row on close so the report
    // reflects this outcome without waiting for the nightly outcome-tracker job.
    const engineScore = Number(trade.engine_score_at_entry ?? 0)
    const predictedProbability = Math.max(0, Math.min(1, engineScore / 100))

    if (predictedProbability > 0) {
      const lower = Math.floor(predictedProbability * 10) * 10
      const upper = Math.min(lower + 10, 100)
      const confidenceBucket = `${lower}-${upper}%`

      await supabase.from("model_calibration_datasets").insert({
        trade_id,
        user_id: user.id,
        horizon_days: 0,
        predicted_probability: predictedProbability,
        realized_outcome: realizedOutcome,
        regime: String(trade.regime_at_entry ?? "unknown"),
        risk_grade: "B",
        model_combination: "trades_v2",
        confidence_bucket: confidenceBucket,
      })
    }

    return Response.json({ trade: data })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
