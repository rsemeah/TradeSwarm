import { createClient } from "@/lib/supabase/server"
import { runCanonicalTrade } from "@/lib/engine/runCanonicalTrade"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { ticker, theme, amount: requestedAmount, marketContext } = await req.json()
    if (!ticker) {
      return Response.json({ error: "ticker is required" }, { status: 400 })
    }

    const [{ data: portfolioStats }, { data: preferences }] = await Promise.all([
      supabase.from("portfolio_stats").select("balance").eq("user_id", user.id).single(),
      supabase.from("user_preferences").select("safety_mode").eq("user_id", user.id).single(),
    ])

    const balance = Number(portfolioStats?.balance ?? 10000)
    const safetyMode = String(preferences?.safety_mode ?? "training_wheels")
    const amount = Number(requestedAmount ?? Math.round(balance * 0.015 * 100) / 100)

    const result = await runCanonicalTrade({
      mode: "simulate",
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
      tradeId: result.tradeId,
      receiptId: result.receiptId,
      proofBundle: result.proofBundle,
      legacyProofBundle: result.legacyProofBundle,
      isSimulation: true,
      measurements: result.measurements,
    })
  } catch (error) {
    console.error("Simulate error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
