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

    const { ticker, theme, marketContext } = await req.json()
    if (!ticker) {
      return Response.json({ error: "Ticker is required", reasonCode: "MISSING_TICKER", correlationId }, { status: 400 })
    }

    const [{ data: preferences }, { data: portfolioStats }] = await Promise.all([
      supabase.from("user_preferences").select("safety_mode").eq("user_id", user.id).single(),
      supabase.from("portfolio_stats").select("balance").eq("user_id", user.id).single(),
    ])

    const balance = Number(portfolioStats?.balance ?? 10000)
    const safetyMode = String(preferences?.safety_mode ?? "training_wheels")
    const amount = Math.round(balance * 0.015 * 100) / 100

    const result = await runCanonicalTrade({
      mode: "preview",
      ticker,
      userId: user.id,
      amount,
      balance,
      safetyMode,
      theme,
      userContext: marketContext,
    })

    return Response.json({
      success: true,
      correlationId,
      preview: result.proofBundle,
      legacyPreview: result.legacyProofBundle,
      receiptId: result.receiptId,
      blocked: result.blocked,
    })
  } catch (error) {
    console.error("Preview error:", error)
    return Response.json({ error: String(error), reasonCode: "PREVIEW_FAILED", correlationId }, { status: 500 })
  }
}
