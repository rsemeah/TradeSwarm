/**
 * POST /api/trade/simulate
 * Thin wrapper: validates input → runTradeSwarm(action="simulate")
 * Simulations are unlimited (no daily cap). Always paper.
 */

import { createClient } from "@/lib/supabase/server"
import { runTradeSwarm } from "@/lib/engine/orchestrator"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { ticker, theme, amount: requestedAmount } = await req.json()
    if (!ticker) return Response.json({ error: "ticker is required" }, { status: 400 })

    const [{ data: portfolioStats }, { data: preferences }] = await Promise.all([
      supabase.from("portfolio_stats").select("balance").eq("user_id", user.id).single(),
      supabase.from("user_preferences").select("safety_mode").eq("user_id", user.id).single(),
    ])

    const balance = portfolioStats?.balance ?? 10000
    const safetyMode = preferences?.safety_mode ?? "training_wheels"
    const amount = requestedAmount ?? Math.round(balance * 0.015 * 100) / 100

    const { proofBundle, receiptId } = await runTradeSwarm({
      ticker,
      action: "simulate",
      userId: user.id,
      amount,
      balance,
      safetyMode,
      theme,
    })

    // Update simulation counter
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
      .select("simulations_completed")
      .eq("user_id", user.id)
      .single()

    await supabase.from("portfolio_stats").upsert({
      user_id: user.id,
      simulations_completed: (stats?.simulations_completed ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })

    const fd = proofBundle.finalDecision

    return Response.json({
      success: true,
      receiptId,
      proofBundle,
      isSimulation: true,
      message: `Simulated: ${ticker} | Trust ${fd.trustScore}/100 | ${fd.action}`,
      warnings: proofBundle.warnings,
    })
  } catch (error) {
    console.error("Simulate error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
