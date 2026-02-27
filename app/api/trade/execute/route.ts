import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { trade, aiConsensus, regime, risk } = await req.json()

    if (!trade) {
      return Response.json({ error: "Trade data is required" }, { status: 400 })
    }

    // Get user preferences
    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()

    const safetyMode = preferences?.safety_mode || "training_wheels"
    const maxTradesPerDay = safetyMode === "training_wheels" ? 1 : safetyMode === "normal" ? 3 : 10

    // Check daily limit
    const today = new Date().toISOString().split("T")[0]
    const { count: tradesToday } = await supabase
      .from("trades")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00`)

    if ((tradesToday || 0) >= maxTradesPerDay) {
      return Response.json(
        { error: `Daily limit reached (${maxTradesPerDay} trades in ${safetyMode} mode)` },
        { status: 400 }
      )
    }

    // Record the executed trade
    const tradeRecord = {
      user_id: user.id,
      ticker: trade.ticker,
      strategy: trade.strategy || "options_spread",
      action: "execute",
      amount: trade.amountDollars || 0,
      trust_score: trade.trustScore,
      status: trade.status,
      is_paper: safetyMode === "training_wheels",
      reasoning: trade.bullets?.why || "",
      // JSONB columns for V1
      ai_consensus: aiConsensus || null,
      regime_data: regime || null,
      risk_data: risk || null,
    }

    const { data: insertedTrade, error: insertError } = await supabase
      .from("trades")
      .insert(tradeRecord)
      .select()
      .single()

    if (insertError) {
      console.error("Trade execute error:", insertError)
      return Response.json({ error: "Failed to execute trade" }, { status: 500 })
    }

    // Create receipt
    const receiptRecord = {
      trade_id: insertedTrade.id,
      user_id: user.id,
      ticker: trade.ticker,
      action: "execute",
      amount: trade.amountDollars,
      trust_score: trade.trustScore,
      ai_consensus: aiConsensus,
      regime_snapshot: regime,
      risk_snapshot: risk,
      scoring: trade.scoring || null,
      executed_at: new Date().toISOString(),
    }

    await supabase.from("trade_receipts").insert(receiptRecord)

    // Update stats
    const { data: stats } = await supabase
      .from("portfolio_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    await supabase.from("portfolio_stats").upsert({
      user_id: user.id,
      paper_trades_completed: (stats?.paper_trades_completed || 0) + 1,
      total_trades: (stats?.total_trades || 0) + 1,
      updated_at: new Date().toISOString(),
    })

    return Response.json({
      success: true,
      trade: insertedTrade,
      receipt: receiptRecord,
      message: `Executed: ${trade.ticker} for $${trade.amountDollars}`,
    })
  } catch (error) {
    console.error("Execute error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
