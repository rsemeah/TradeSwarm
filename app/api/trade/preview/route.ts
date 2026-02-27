import { generateText, Output } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { runEngineAnalysis, preflightCheck } from "@/lib/engine"

// Schema for preview analysis
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
  // Regime data stub (will be enhanced later)
  regime: z.object({
    trend: z.enum(["bullish", "bearish", "neutral"]),
    volatility: z.enum(["low", "medium", "high"]),
    momentum: z.enum(["strong", "weak", "neutral"]),
  }).nullable(),
  // Risk data stub
  risk: z.object({
    maxLoss: z.number(),
    expectedReturn: z.number(),
    confidenceInterval: z.number(),
  }).nullable(),
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { ticker, theme, marketContext } = await req.json()

    if (!ticker) {
      return Response.json({ error: "Ticker is required" }, { status: 400 })
    }

    // Get user preferences for position sizing
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
    const estimatedAmount = balance * 0.015 // 1.5% position for preview

    // Run engine analysis (regime + risk)
    const engineAnalysis = await runEngineAnalysis(ticker, estimatedAmount, balance, 50)

    // Run AI analysis with Groq (fast preview) - now with engine context
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

    // Run preflight check
    const preflight = preview ? preflightCheck(engineAnalysis.regime, engineAnalysis.risk, preview.trustScore) : null

    // Apply safety mode position limits
    if (safetyMode === "training_wheels" && preview?.recommendedAmount) {
      preview.recommendedAmount = Math.min(preview.recommendedAmount, balance * 0.015)
    }

    return Response.json({
      success: true,
      preview,
      engine: {
        regime: engineAnalysis.regime,
        risk: engineAnalysis.risk,
        preflight,
      },
      meta: {
        balance,
        safetyMode,
        timestamp: new Date().toISOString(),
        model: "groq/llama-3.3-70b-versatile",
      },
    })
  } catch (error) {
    console.error("Preview error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
