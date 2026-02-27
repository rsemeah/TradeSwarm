import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, trade } = await req.json()

    if (!action || !trade) {
      return Response.json({ error: "Action and trade are required" }, { status: 400 })
    }

    // Get user's current portfolio/preferences
    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()

    const safetyMode = preferences?.safety_mode || "training_wheels"
    const maxTradesPerDay = safetyMode === "training_wheels" ? 1 : safetyMode === "normal" ? 3 : 10

    // Check daily trade limit
    const today = new Date().toISOString().split("T")[0]
    const { count: tradesToday } = await supabase
      .from("trades")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00`)

    if ((tradesToday || 0) >= maxTradesPerDay && action === "execute") {
      return Response.json(
        { error: `Daily limit reached (${maxTradesPerDay} trades in ${safetyMode} mode)` },
        { status: 400 }
      )
    }

    // Record the trade
    const tradeRecord = {
      user_id: user.id,
      ticker: trade.ticker,
      strategy: trade.strategy,
      action: action, // "execute" or "simulate"
      amount: trade.amountDollars || 0,
      trust_score: trade.trustScore,
      status: trade.status,
      is_paper: safetyMode === "training_wheels" || action === "simulate",
      reasoning: trade.bullets?.why || "",
    }

    const { data: insertedTrade, error: insertError } = await supabase
      .from("trades")
      .insert(tradeRecord)
      .select()
      .single()

    if (insertError) {
      console.error("Trade insert error:", insertError)
      return Response.json({ error: "Failed to record trade" }, { status: 500 })
    }

    // Update paper trades count if in training wheels
    if (safetyMode === "training_wheels") {
      await supabase
        .from("portfolio_stats")
        .upsert({
          user_id: user.id,
          paper_trades_completed: (preferences?.paper_trades_completed || 0) + 1,
          updated_at: new Date().toISOString(),
        })
    }

    return Response.json({
      success: true,
      trade: insertedTrade,
      message: action === "execute" 
        ? `Trade executed: ${trade.ticker} for $${trade.amountDollars}` 
        : `Simulation recorded: ${trade.ticker}`,
    })
  } catch (error) {
    console.error("Trade error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
