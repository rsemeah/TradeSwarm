import { createClient } from "@/lib/supabase/server"

type EquityPoint = { date: string; cumulative_pnl: number }

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: trades, error } = await supabase
      .from("trades_v2")
      .select("entry_date, outcome, realized_pnl")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: true })

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    const rows = trades ?? []
    const closedTrades = rows.filter((trade) => trade.outcome !== "open")
    const wins = closedTrades.filter((trade) => Number(trade.realized_pnl ?? 0) > 0)
    const losses = closedTrades.filter((trade) => Number(trade.realized_pnl ?? 0) < 0)

    const totalTrades = rows.length
    const closedCount = closedTrades.length
    const winRate = closedCount > 0 ? wins.length / closedCount : 0

    const avgWin = wins.length > 0
      ? wins.reduce((sum, trade) => sum + Number(trade.realized_pnl ?? 0), 0) / wins.length
      : 0

    const avgLoss = losses.length > 0
      ? losses.reduce((sum, trade) => sum + Number(trade.realized_pnl ?? 0), 0) / losses.length
      : 0

    const expectancy = (winRate * avgWin) + ((1 - winRate) * avgLoss)

    let cumulative = 0
    let peak = 0
    let maxDrawdown = 0
    const equityCurve: EquityPoint[] = []

    for (const trade of rows) {
      cumulative += Number(trade.realized_pnl ?? 0)
      if (cumulative > peak) peak = cumulative
      const drawdown = peak - cumulative
      if (drawdown > maxDrawdown) maxDrawdown = drawdown

      equityCurve.push({
        date: trade.entry_date,
        cumulative_pnl: Number(cumulative.toFixed(2)),
      })
    }

    return Response.json({
      total_trades: totalTrades,
      win_rate: Number(winRate.toFixed(4)),
      avg_win: Number(avgWin.toFixed(2)),
      avg_loss: Number(avgLoss.toFixed(2)),
      expectancy: Number(expectancy.toFixed(2)),
      max_drawdown: Number(maxDrawdown.toFixed(2)),
      equity_curve: equityCurve,
    })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
