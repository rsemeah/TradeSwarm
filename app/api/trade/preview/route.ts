import { createClient } from "@/lib/supabase/server"
import { runEngineAnalysis, preflightCheck } from "@/lib/engine"
import { evaluateDegradedMode, recordStageEvent } from "@/lib/engine/events"

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
  regime: z
    .object({
      trend: z.enum(["bullish", "bearish", "neutral"]),
      volatility: z.enum(["low", "medium", "high"]),
      momentum: z.enum(["strong", "weak", "neutral"]),
    })
    .nullable(),
  risk: z
    .object({
      maxLoss: z.number(),
      expectedReturn: z.number(),
      confidenceInterval: z.number(),
    })
    .nullable(),
})
import { runTradeSwarm } from "@/lib/engine"

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

    const contextStart = Date.now()
    const { ticker, theme, marketContext } = await req.json()

    if (!ticker) {
      return Response.json({ error: "Ticker is required", reasonCode: "MISSING_TICKER", correlationId }, { status: 400 })
    }

    await recordStageEvent(supabase, {
      stage: "CONTEXT_DONE",
      status: "success",
      correlationId,
      userId: user.id,
      ticker,
      durationMs: Date.now() - contextStart,
    })

    const { data: preferences } = await supabase.from("user_preferences").select("*").eq("user_id", user.id).single()

    const { data: portfolioStats } = await supabase.from("portfolio_stats").select("*").eq("user_id", user.id).single()

    const balance = portfolioStats?.balance || 10000
    const safetyMode = preferences?.safety_mode || "training_wheels"
    const estimatedAmount = balance * 0.015

    const degradeReasons: string[] = []

    const regimeStart = Date.now()
    const engineAnalysis = await runEngineAnalysis(ticker, estimatedAmount, balance, 50)
    const regimeStatus = engineAnalysis.regime.confidence < 0.5 ? "degraded" : "success"
    if (regimeStatus === "degraded") {
      degradeReasons.push("REGIME_FAILED")
    }
    await recordStageEvent(supabase, {
      stage: "REGIME_DONE",
      status: regimeStatus,
      correlationId,
      userId: user.id,
      ticker,
      durationMs: Date.now() - regimeStart,
      reasonCode: regimeStatus === "degraded" ? "REGIME_FAILED" : undefined,
      details: { confidence: engineAnalysis.regime.confidence },
    })

    const riskStart = Date.now()
    const riskStatus = engineAnalysis.risk.maxLoss <= 0 ? "degraded" : "success"
    if (riskStatus === "degraded") {
      degradeReasons.push("RISK_FAILED")
    }
    await recordStageEvent(supabase, {
      stage: "RISK_DONE",
      status: riskStatus,
      correlationId,
      userId: user.id,
      ticker,
      durationMs: Date.now() - riskStart,
      reasonCode: riskStatus === "degraded" ? "RISK_FAILED" : undefined,
      details: { riskLevel: engineAnalysis.risk.riskLevel },
    })

    const round1Start = Date.now()
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

    await recordStageEvent(supabase, {
      stage: "ROUND1_DONE",
      status: "success",
      correlationId,
      userId: user.id,
      ticker,
      durationMs: Date.now() - round1Start,
    })

    const preview = result.output
    const preflight = preview ? preflightCheck(engineAnalysis.regime, engineAnalysis.risk, preview.trustScore) : null

    if (safetyMode === "training_wheels" && preview?.recommendedAmount) {
      preview.recommendedAmount = Math.min(preview.recommendedAmount, balance * 0.015)
    }

    const scoringStart = Date.now()
    const degradedMode = evaluateDegradedMode(degradeReasons)
    await recordStageEvent(supabase, {
      stage: "SCORING_DONE",
      status: degradedMode.isDegraded ? "degraded" : "success",
      correlationId,
      userId: user.id,
      ticker,
      durationMs: Date.now() - scoringStart,
      reasonCode: degradedMode.reasonCode || undefined,
      details: { previewStatus: preview?.status, trustScore: preview?.trustScore },
    })

    return Response.json({
      success: true,
      correlationId,
      reasonCode: degradedMode.reasonCode,
      preview,
    const { proofBundle } = await runTradeSwarm({
      mode: "preview",
      ticker,
      theme,
      marketContext,
      useSwarm: false,
      userId: user.id,
    })

    return Response.json({
      success: true,
      preview: proofBundle.decision,
      engine: {
        regime: proofBundle.regime,
        risk: proofBundle.risk,
        preflight: proofBundle.preflight,
      },
      degradedMode: {
        ...degradedMode,
        policy: {
          preview: "allowed_with_warnings",
          execute: degradedMode.executeBlocked ? "fail_closed" : "allowed",
        },
      },
      meta: {
        balance: proofBundle.meta.balance,
        safetyMode: proofBundle.meta.safetyMode,
        timestamp: proofBundle.timestamp,
        model: proofBundle.meta.modelPlan[0],
      },
      proofBundle,
    })
  } catch (error) {
    console.error("Preview error:", error)
    return Response.json({ error: String(error), reasonCode: "PREVIEW_FAILED", correlationId }, { status: 500 })
  }
}
