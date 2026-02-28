/**
 * POST /api/trade/execute
 * Thin wrapper: validates input + daily limit → runTradeSwarm(action="execute")
 * Writes trade row + receipt. Fail-closed: blocked trades return success=false.
 */

import { createClient } from "@/lib/supabase/server"
import { runTradeSwarm } from "@/lib/engine/orchestrator"

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID()

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { ticker, theme, amount: requestedAmount } = await req.json()
    if (!ticker) return Response.json({ error: "ticker is required" }, { status: 400 })

    const [{ data: preferences }, { data: portfolioStats }] = await Promise.all([
      supabase.from("user_preferences").select("safety_mode").eq("user_id", user.id).single(),
      supabase.from("portfolio_stats").select("balance").eq("user_id", user.id).single(),
    ])

    if (!user) {
      return Response.json({ error: "Unauthorized", reasonCode: "UNAUTHORIZED", correlationId }, { status: 401 })
    }

    const { trade, aiConsensus, regime, risk } = await req.json()

    if (!trade) {
      return Response.json({ error: "Trade data is required", reasonCode: "MISSING_TRADE", correlationId }, { status: 400 })
    }

    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()

    const safetyMode = preferences?.safety_mode ?? "training_wheels"
    const balance = portfolioStats?.balance ?? 10000
    const maxTradesPerDay =
      safetyMode === "training_wheels" ? 1 : safetyMode === "normal" ? 3 : 10

    // Daily limit check
    const today = new Date().toISOString().split("T")[0]
    const { count: tradesToday } = await supabase
      .from("trades")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00`)

    if ((tradesToday ?? 0) >= maxTradesPerDay) {
      return Response.json(
        {
          error: `Daily limit reached (${maxTradesPerDay} trades in ${safetyMode} mode)`,
          reasonCode: "DAILY_LIMIT_REACHED",
          correlationId,
        },
        { status: 400 }
      )
    }

    const amount = requestedAmount ?? Math.round(balance * 0.015 * 100) / 100

    const { proofBundle, receiptId, tradeId } = await runTradeSwarm({
      ticker,
      action: "execute",
      userId: user.id,
      amount,
      balance,
      safetyMode,
      theme,
    })

    const fd = proofBundle.finalDecision

    // Blocked by engine (fail-closed)
    if (fd.action === "NO" && !tradeId) {
      return Response.json({
        success: false,
        blocked: true,
        reason: fd.reason,
        proofBundle,
        warnings: proofBundle.warnings,
      })
    }
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
      return Response.json({ error: "Failed to execute trade", reasonCode: "TRADE_INSERT_FAILED", correlationId }, { status: 500 })
    }

    const executedAt = new Date().toISOString()
    const receiptRecord = {
      trade_id: insertedTrade.id,
      user_id: user.id,
      ticker: trade.ticker,
      action: "execute",
      amount: trade.amountDollars,
      trust_score: trade.trustScore,
      executed_at: executedAt,
      ai_consensus: aiConsensus,
      regime_snapshot: regime,
      risk_snapshot: risk,
    }

    const { error: receiptError } = await supabase.from("trade_receipts").insert(receiptRecord)

    const { data: stats } = await supabase
      .from("portfolio_stats")
      .select("paper_trades_completed, total_trades")
      .eq("user_id", user.id)
      .single()

    await supabase.from("portfolio_stats").upsert({
      user_id: user.id,
      paper_trades_completed: (stats?.paper_trades_completed ?? 0) + 1,
      total_trades: (stats?.total_trades ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })

    return Response.json({
      success: true,
      tradeId,
      receiptId,
      proofBundle,
      message: `Executed: ${ticker} | Trust ${fd.trustScore}/100 | ${fd.action}`,
      warnings: proofBundle.warnings,
      reasonCode: receiptError ? "RECEIPT_WRITE_FAILED" : null,
      correlationId,
      trade: insertedTrade,
      receipt: receiptRecord,
      message: `Executed: ${trade.ticker} for $${trade.amountDollars}`,
    })
  } catch (error) {
    console.error("Execute error:", error)
    return Response.json({ error: String(error), reasonCode: "EXECUTE_FAILED", correlationId }, { status: 500 })
  }
}
