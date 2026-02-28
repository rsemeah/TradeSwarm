/**
 * POST /api/trade/preview
 * Thin wrapper: validates input → runTradeSwarm(action="preview")
 * Persists a preview receipt (auditable) but writes no trade row.
 */

import { createClient } from "@/lib/supabase/server"
import { runTradeSwarm } from "@/lib/engine/orchestrator"
const PreviewSchema = z.object({
  ticker: z.string(),
  status: z.enum(["GO", "WAIT", "NO"]),
  trustScore: z.number().min(0).max(100),
  winLikelihood: z.number().min(0).max(100).nullable(),
  recommendedAmount: z.number().nullable(),
  bullets: z.object({
    why: z.string(),
    risk: z.string(),
    amount: z.string(),
  }),
  reasoning: z.string(),
})

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID()

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

    if (!user) {
      return Response.json({ error: "Unauthorized", reasonCode: "UNAUTHORIZED", correlationId }, { status: 401 })
    }

    const { ticker, theme, marketContext } = await req.json()

    if (!ticker) {
      return Response.json({ error: "Ticker is required", reasonCode: "MISSING_TICKER", correlationId }, { status: 400 })
    }

    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()

    const { data: portfolioStats } = await supabase
      .from("portfolio_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    const balance = portfolioStats?.balance || 10000
    const safetyMode = preferences?.safety_mode || "training_wheels"
    const estimatedAmount = balance * 0.015

    const engineAnalysis = await runEngineAnalysis(ticker, estimatedAmount, balance, 50)

    const result = await generateText({
      model: "groq/llama-3.3-70b-versatile",
      system: `You are a trading analyst AI for TradeSwarm. Analyze options trade setups focusing on risk management.
Current user balance: $${balance}
Safety mode: ${safetyMode} (${safetyMode === "training_wheels" ? "conservative, max 1.5% position" : "standard"})
${engineAnalysis.marketContext}
${engineAnalysis.riskContext}
Be conservative - only GO when conditions are clearly favorable.`,
      prompt: `Quick preview analysis for:
Ticker: ${ticker}
Theme: ${theme || "General"}
Context: ${marketContext || "Normal conditions"}

Market regime detected: ${engineAnalysis.regime.trend} trend, ${engineAnalysis.regime.volatility} volatility, ${engineAnalysis.regime.momentum} momentum.
Risk assessment: ${engineAnalysis.risk.riskLevel} risk, max loss $${engineAnalysis.risk.maxLoss}.

Provide rapid assessment with status, trust score, bullets, and position sizing.`,
      output: Output.object({ schema: PreviewSchema }),
    })

    const preview = result.output
    const preflight = preview ? preflightCheck(engineAnalysis.regime, engineAnalysis.risk, preview.trustScore) : null

    if (safetyMode === "training_wheels" && preview?.recommendedAmount) {
      preview.recommendedAmount = Math.min(preview.recommendedAmount, balance * 0.015)
    }

    return Response.json({
      success: true,
      correlationId,
      preview,
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
    return Response.json({ error: String(error), reasonCode: "PREVIEW_FAILED", correlationId }, { status: 500 })
  }
}
