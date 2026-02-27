import { generateText, Output } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { recordStageEvent } from "@/lib/engine/events"

// Schema for trade analysis output
const TradeAnalysisSchema = z.object({
  ticker: z.string(),
  status: z.enum(["GO", "WAIT", "NO"]),
  trustScore: z.number().min(0).max(100),
  winLikelihoodPct: z.number().min(0).max(100).nullable(),
  recommendedAmount: z.number().nullable(),
  bullets: z.object({
    why: z.string(),
    risk: z.string(),
    amount: z.string(),
  }),
  reasoning: z.string(),
})

const SwarmConsensusSchema = z.object({
  finalDecision: z.enum(["GO", "WAIT", "NO"]),
  confidenceScore: z.number().min(0).max(100),
  consensus: z.string(),
  dissent: z.string().nullable(),
})

// Multi-model swarm analysis
async function analyzeWithModel(
  model: string,
  ticker: string,
  theme: string,
  marketContext: string
) {
  const systemPrompt = `You are a trading analyst AI. Analyze options trade setups with a focus on risk management.
You evaluate: momentum, volatility, liquidity, market regime, and options pricing.
Be conservative - only recommend GO when conditions are clearly favorable.
For personal paper trading practice.`

  const userPrompt = `Analyze this potential trade:
Ticker: ${ticker}
Theme/Sector: ${theme}
Market Context: ${marketContext}

Provide your analysis with:
1. Status recommendation (GO if strong setup, WAIT if conditions improving, NO if unfavorable)
2. Trust score 0-100 (how confident you are)
3. Win likelihood percentage (if applicable)
4. Recommended amount as percentage of portfolio (1-5% max)
5. Clear bullet points for WHY, RISK, and AMOUNT
6. Brief reasoning for your decision`

  try {
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      output: Output.object({ schema: TradeAnalysisSchema }),
    })

    return { model, analysis: result.output, error: null }
  } catch (error) {
    return { model, analysis: null, error: String(error) }
  }
}

async function getSwarmConsensus(
  analyses: { model: string; analysis: z.infer<typeof TradeAnalysisSchema> }[]
) {
  const analysisText = analyses
    .map(
      (a) =>
        `${a.model}: Status=${a.analysis.status}, Trust=${a.analysis.trustScore}, Reasoning: ${a.analysis.reasoning}`
    )
    .join("\n")

  // Use Groq for consensus if no gateway key, otherwise use GPT-4o-mini
  const consensusModel = process.env.AI_GATEWAY_API_KEY 
    ? "openai/gpt-4o-mini" 
    : "groq/llama-3.3-70b-versatile"
  
  const result = await generateText({
    model: consensusModel,
    system:
      "You synthesize multiple AI trading analyses into a final consensus. Be conservative.",
    prompt: `Given these analyses from different AI models, determine the final consensus:

${analysisText}

Provide:
1. Final decision (GO/WAIT/NO) - lean conservative if there's disagreement
2. Confidence score 0-100
3. Brief consensus summary
4. Note any dissenting opinions`,
    output: Output.object({ schema: SwarmConsensusSchema }),
  })

  return result.output
}

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID()
  const requestStartedAt = Date.now()

  try {
    const supabase = await createClient()
    const { ticker, theme, marketContext, useSwarm = true } = await req.json()

    if (!ticker) {
      return Response.json({ error: "Ticker is required" }, { status: 400 })
    }

    await recordStageEvent(supabase, {
      stage: "CONTEXT_DONE",
      status: "success",
      correlationId,
      ticker,
      durationMs: Date.now() - requestStartedAt,
      details: { theme: theme || "General" },
    })

    // Models to use - Groq is free and primary, OpenAI as second opinion
    // Check which API keys are available
    const hasOpenAI = !!process.env.AI_GATEWAY_API_KEY || !!process.env.OPENAI_API_KEY
    
    // Use Groq + OpenAI for dual-model consensus (both fast and accurate)
    const models = useSwarm && hasOpenAI
      ? ["groq/llama-3.3-70b-versatile", "openai/gpt-4o-mini"]
      : ["groq/llama-3.3-70b-versatile"] // Groq-only mode (free tier)

    // Run analyses in parallel
    const round1Start = Date.now()
    const results = await Promise.all(
      models.map((model) =>
        analyzeWithModel(model, ticker, theme || "General", marketContext || "Normal market conditions")
      )
    )

    // Filter successful analyses
    const successfulAnalyses = results.filter((r) => r.analysis !== null) as {
      model: string
      analysis: z.infer<typeof TradeAnalysisSchema>
    }[]

    if (successfulAnalyses.length === 0) {
      await recordStageEvent(supabase, {
        stage: "ROUND1_DONE",
        status: "failed",
        correlationId,
        ticker,
        durationMs: Date.now() - round1Start,
        reasonCode: "ROUND1_FAILED",
      })
      return Response.json(
        {
          error: "All models failed to analyze",
          reasonCode: "ROUND1_FAILED",
          details: results.map((r) => r.error),
          correlationId,
        },
        { status: 500 }
      )
    }

    await recordStageEvent(supabase, {
      stage: "ROUND1_DONE",
      status: "success",
      correlationId,
      ticker,
      durationMs: Date.now() - round1Start,
      details: {
        successfulModels: successfulAnalyses.map((analysis) => analysis.model),
      },
    })

    // Get consensus if multiple models succeeded
    let finalAnalysis: z.infer<typeof TradeAnalysisSchema>
    let consensus: z.infer<typeof SwarmConsensusSchema> | null = null

    if (successfulAnalyses.length > 1 && useSwarm) {
      const round2Start = Date.now()
      consensus = await getSwarmConsensus(successfulAnalyses)
      await recordStageEvent(supabase, {
        stage: "ROUND2_DONE",
        status: "success",
        correlationId,
        ticker,
        durationMs: Date.now() - round2Start,
      })

      // Use the analysis from the model that matches consensus, or the highest trust score
      const arbitrationStart = Date.now()
      const matchingAnalysis = successfulAnalyses.find(
        (a) => a.analysis.status === consensus!.finalDecision
      )
      finalAnalysis = matchingAnalysis?.analysis || successfulAnalyses[0].analysis
      finalAnalysis.trustScore = consensus.confidenceScore

      await recordStageEvent(supabase, {
        stage: "ARBITRATION_DONE",
        status: "success",
        correlationId,
        ticker,
        durationMs: Date.now() - arbitrationStart,
        details: { finalDecision: consensus.finalDecision },
      })
    } else {
      finalAnalysis = successfulAnalyses[0].analysis

      await recordStageEvent(supabase, {
        stage: "ROUND2_DONE",
        status: "degraded",
        correlationId,
        ticker,
        durationMs: 0,
        reasonCode: "ROUND2_SKIPPED",
      })
      await recordStageEvent(supabase, {
        stage: "ARBITRATION_DONE",
        status: "degraded",
        correlationId,
        ticker,
        durationMs: 0,
        reasonCode: "ARBITRATION_SKIPPED",
      })
    }

    await recordStageEvent(supabase, {
      stage: "SCORING_DONE",
      status: "success",
      correlationId,
      ticker,
      durationMs: Date.now() - requestStartedAt,
      details: { trustScore: finalAnalysis.trustScore, status: finalAnalysis.status },
    })

    return Response.json({
      success: true,
      correlationId,
      analysis: finalAnalysis,
      consensus,
      modelResults: successfulAnalyses.map((r) => ({
        model: r.model,
        status: r.analysis.status,
        trustScore: r.analysis.trustScore,
        reasoning: r.analysis.reasoning,
      })),
      // For receipt drawer AI breakdown
      aiConsensus: successfulAnalyses.length > 1 ? {
        groq: successfulAnalyses.find(a => a.model.includes("groq")) ? {
          decision: successfulAnalyses.find(a => a.model.includes("groq"))!.analysis.status,
          confidence: successfulAnalyses.find(a => a.model.includes("groq"))!.analysis.trustScore,
          reasoning: successfulAnalyses.find(a => a.model.includes("groq"))!.analysis.reasoning,
        } : undefined,
        openai: successfulAnalyses.find(a => a.model.includes("openai")) ? {
          decision: successfulAnalyses.find(a => a.model.includes("openai"))!.analysis.status,
          confidence: successfulAnalyses.find(a => a.model.includes("openai"))!.analysis.trustScore,
          reasoning: successfulAnalyses.find(a => a.model.includes("openai"))!.analysis.reasoning,
        } : undefined,
        finalVerdict: consensus?.finalDecision || finalAnalysis.status,
        consensusStrength: consensus?.confidenceScore || finalAnalysis.trustScore,
      } : undefined,
    })
  } catch (error) {
    console.error("Analysis error:", error)
    return Response.json({ error: String(error), reasonCode: "ANALYSIS_FAILED", correlationId }, { status: 500 })
  }
}
