import { createClient } from "@/lib/supabase/server"
import { runCanonicalTrade } from "@/lib/engine/runCanonicalTrade"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized", reasonCode: "UNAUTHORIZED" }, { status: 401 })
    }

    const payload = await req.json()
    const action = payload.action as "preview" | "simulate" | "execute"
    const trade = payload.trade as { ticker?: string; amountDollars?: number }

    if (!action || !trade?.ticker) {
      return Response.json({ error: "Action and trade.ticker are required", reasonCode: "MISSING_ACTION_OR_TRADE" }, { status: 400 })
    }

    const { data: preferences } = await supabase.from("user_preferences").select("safety_mode").eq("user_id", user.id).single()
    const { data: portfolioStats } = await supabase.from("portfolio_stats").select("balance").eq("user_id", user.id).single()

    const balance = Number(portfolioStats?.balance ?? 10000)
    const safetyMode = String(preferences?.safety_mode ?? "training_wheels")
    const amount = Number(trade.amountDollars ?? Math.round(balance * 0.015 * 100) / 100)

    const result = await runCanonicalTrade({
      mode: action,
      ticker: trade.ticker,
      userId: user.id,
      amount,
      balance,
      safetyMode,
      theme: payload.theme,
      userContext: payload.marketContext,
    })

    return Response.json({
      success: !result.blocked,
      blocked: result.blocked,
      tradeId: result.tradeId,
      receiptId: result.receiptId,
      proofBundle: result.proofBundle,
      legacyProofBundle: result.legacyProofBundle,
      reasonCode: result.proofBundle.safety_decision.reason_code,
    })
  } catch (error) {
    console.error("Trade error:", error)
    return Response.json({ error: String(error), reasonCode: "TRADE_ROUTE_FAILED" }, { status: 500 })
  }
}
