import { runCanonicalTrade } from "@/lib/engine/runCanonicalTrade"
import { isLocalDevBypassEnabled } from "@/lib/env/devBypass"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID()

  try {
    const supabase = await createClient()

    let userId: string

    if (isLocalDevBypassEnabled()) {
      userId = "dev-user"
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return Response.json({ error: "Unauthorized", reasonCode: "UNAUTHORIZED", correlationId }, { status: 401 })
      }

      userId = user.id
    }

    const { ticker, theme, marketContext } = await req.json()
    if (!ticker) {
      return Response.json({ error: "Ticker is required", reasonCode: "MISSING_TICKER", correlationId }, { status: 400 })
    }

    const [{ data: preferences }, { data: portfolioStats }] = await Promise.all([
      supabase.from("user_preferences").select("safety_mode").eq("user_id", userId).single(),
      supabase.from("portfolio_stats").select("balance").eq("user_id", userId).single(),
    ])

    const balance = Number(portfolioStats?.balance ?? 10000)
    const safetyMode = String(preferences?.safety_mode ?? "training_wheels")
    const amount = Math.round(balance * 0.015 * 100) / 100

    const result = await runCanonicalTrade({
      mode: "preview",
      ticker,
      userId,
      amount,
      balance,
      safetyMode,
      theme,
      userContext: marketContext,
    })

    const determinism = result.proofBundle.metadata?.determinism

    return Response.json({
      success: true,
      correlationId,
      tradeId: result.tradeId,
      trade_id: result.tradeId,
      receiptId: result.receiptId,
      blocked: result.blocked,
      determinism_hash: determinism?.determinism_hash ?? null,
      market_snapshot_hash: determinism?.market_snapshot_hash ?? null,
      random_seed: determinism?.random_seed ?? null,
      warnings: result.proofBundle.metadata?.warnings ?? [],
      preview: result.proofBundle,
      legacyPreview: result.legacyProofBundle,
    })
  } catch (error) {
    console.error("Preview error:", error)
    return Response.json({ error: String(error), reasonCode: "PREVIEW_FAILED", correlationId }, { status: 500 })
  }
}
