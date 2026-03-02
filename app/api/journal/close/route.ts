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
      .select("id, outcome, credit_received")
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
    // Assumption: realized PnL is net credit retained after paying exit price.
    const realizedPnl = Number((credit - exit_price).toFixed(2))
    const outcome = realizedPnl > 0 ? "win" : realizedPnl < 0 ? "loss" : "breakeven"

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

    return Response.json({ trade: data })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
