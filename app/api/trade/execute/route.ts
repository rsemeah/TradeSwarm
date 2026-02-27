import { createClient } from "@/lib/supabase/server"
import { runTradeSwarm } from "@/lib/engine"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { ticker, theme, marketContext, trade, proofBundle } = await req.json()

    if (!proofBundle && !ticker && !trade?.ticker) {
      return Response.json({ error: "Ticker or proofBundle is required" }, { status: 400 })
    }

    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()

    const safetyMode = preferences?.safety_mode || "training_wheels"
    const maxTradesPerDay = safetyMode === "training_wheels" ? 1 : safetyMode === "normal" ? 3 : 10

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

    const { proofBundle: canonicalProofBundle, persisted } = await runTradeSwarm({
      mode: "execute",
      ticker: ticker || trade?.ticker,
      theme,
      marketContext,
      trade,
      existingProofBundle: proofBundle,
      userId: user.id,
    })

    return Response.json({
      success: true,
      trade: persisted?.trade,
      receipt: persisted?.receipt,
      message: `Executed: ${canonicalProofBundle.decision.ticker} for $${canonicalProofBundle.decision.recommendedAmount ?? 0}`,
      proofBundle: canonicalProofBundle,
    })
  } catch (error) {
    console.error("Execute error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
