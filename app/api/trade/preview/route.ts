/**
 * POST /api/trade/preview
 * Thin wrapper: validates input → runTradeSwarm(action="preview")
 * Persists a preview receipt (auditable) but writes no trade row.
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

    const { ticker, theme, marketContext: userContext } = await req.json()
    if (!ticker) return Response.json({ error: "ticker is required" }, { status: 400 })

    const [{ data: portfolioStats }, { data: preferences }] = await Promise.all([
      supabase.from("portfolio_stats").select("balance").eq("user_id", user.id).single(),
      supabase.from("user_preferences").select("safety_mode").eq("user_id", user.id).single(),
    ])

    const balance = portfolioStats?.balance ?? 10000
    const safetyMode = preferences?.safety_mode ?? "training_wheels"
    const estimatedAmount = Math.round(balance * 0.015 * 100) / 100

    const { proofBundle, receiptId } = await runTradeSwarm({
      ticker,
      action: "preview",
      userId: user.id,
      amount: estimatedAmount,
      balance,
      safetyMode,
      theme,
      userContext,
    })

    const fd = proofBundle.finalDecision

    return Response.json({
      success: true,
      preview: {
        ticker,
        status: fd.action,
        trustScore: fd.trustScore,
        winLikelihood:
          proofBundle.deliberation[0]?.outputs[0]?.winLikelihoodPct ?? null,
        recommendedAmount: fd.recommendedAmount,
        bullets: fd.bullets,
        reasoning:
          proofBundle.deliberation[0]?.outputs[0]?.reasoning ?? fd.reason,
        regime: {
          trend: proofBundle.regime.trend,
          volatility: proofBundle.regime.volatility,
          momentum: proofBundle.regime.momentum,
        },
        risk: {
          maxLoss: Math.abs(proofBundle.risk.pct10),
          expectedReturn: proofBundle.risk.expectedReturn,
          confidenceInterval: proofBundle.risk.kellyFraction,
        },
      },
      proofBundle,
      receiptId,
      engine: {
        regime: proofBundle.regime,
        risk: proofBundle.risk,
        preflight: proofBundle.preflight,
      },
      meta: {
        balance,
        safetyMode,
        timestamp: new Date().toISOString(),
        requestId: proofBundle.requestId,
        warnings: proofBundle.warnings,
      },
    })
  } catch (error) {
    console.error("Preview error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
