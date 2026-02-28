import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { trade, aiConsensus, regime, risk } = await req.json()

    if (!trade) {
      return Response.json({ error: "Trade data is required" }, { status: 400 })
    }

    const tradeRecord = {
      user_id: user.id,
      ticker: trade.ticker,
      strategy: trade.strategy || "options_spread",
      action: "simulate",
      amount: trade.amountDollars || 0,
      trust_score: trade.trustScore,
      status: trade.status,
      is_paper: true,
      reasoning: trade.bullets?.why || "",
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
      console.error("Trade simulate error:", insertError)
      return Response.json({ error: "Failed to record simulation" }, { status: 500 })
    }

    const executedAt = new Date().toISOString()
    const receiptRecord = {
      trade_id: insertedTrade.id,
      user_id: user.id,
      ticker: trade.ticker,
      action: "simulate",
      amount: trade.amountDollars,
      trust_score: trade.trustScore,
      executed_at: executedAt,
      ai_consensus: aiConsensus,
      regime_snapshot: regime,
      risk_snapshot: risk,
    }

    await supabase.from("trade_receipts").insert(receiptRecord)

    const { data: stats } = await supabase
      .from("portfolio_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    await supabase.from("portfolio_stats").upsert({
      user_id: user.id,
      simulations_completed: (stats?.simulations_completed || 0) + 1,
      updated_at: new Date().toISOString(),
    })

    return Response.json({
      success: true,
      trade: insertedTrade,
      receipt: receiptRecord,
      message: `Simulated: ${trade.ticker} for $${trade.amountDollars}`,
      isSimulation: true,
    })
  } catch (error) {
    console.error("Simulate error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
