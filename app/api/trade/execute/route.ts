import { createClient } from "@/lib/supabase/server"
import { runCanonicalTrade } from "@/lib/engine/runCanonicalTrade"

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID()

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized", reasonCode: "UNAUTHORIZED", correlationId }, { status: 401 })
    }

    const { ticker, theme, amount: requestedAmount, marketContext } = await req.json()
    if (!ticker) {
      return Response.json({ error: "ticker is required", reasonCode: "MISSING_TICKER", correlationId }, { status: 400 })
    }

    const [{ data: preferences }, { data: portfolioStats }] = await Promise.all([
      supabase.from("user_preferences").select("safety_mode").eq("user_id", user.id).single(),
      supabase.from("portfolio_stats").select("balance").eq("user_id", user.id).single(),
    ])

    const safetyMode = String(preferences?.safety_mode ?? "training_wheels")
    const balance = Number(portfolioStats?.balance ?? 10000)

    const maxTradesPerDay = safetyMode === "training_wheels" ? 1 : safetyMode === "normal" ? 3 : 10
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

    const amount = Number(requestedAmount ?? Math.round(balance * 0.015 * 100) / 100)

    const result = await runCanonicalTrade({
      mode: "execute",
      ticker,
      userId: user.id,
      amount,
      balance,
      safetyMode,
      theme,
      userContext: marketContext,
    })

    return Response.json({
      success: !result.blocked,
      blocked: result.blocked,
      reasonCode: result.proofBundle.safety_decision.reason_code,
      correlationId,
      tradeId: result.tradeId,
      receiptId: result.receiptId,
      proofBundle: result.proofBundle,
      legacyProofBundle: result.legacyProofBundle,
    })
  } catch (error) {
    console.error("Execute error:", error)
    return Response.json({ error: String(error), reasonCode: "EXECUTE_FAILED", correlationId }, { status: 500 })
  }
}
