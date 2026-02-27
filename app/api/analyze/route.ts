import { generateText, Output } from "ai"
import { z } from "zod"

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
  try {
    const { ticker, theme, marketContext, useSwarm = true } = await req.json()

    if (!ticker) {
      return Response.json({ error: "Ticker is required" }, { status: 400 })
    }

    // Models to use - Groq is free and primary, others optional for swarm consensus
    // Only use multi-model if AI_GATEWAY_API_KEY is set (for OpenAI/Anthropic)
    const hasGatewayKey = !!process.env.AI_GATEWAY_API_KEY
    const models = useSwarm && hasGatewayKey
      ? ["groq/llama-3.3-70b-versatile", "openai/gpt-4o-mini", "anthropic/claude-3-5-haiku-latest"]
      : ["groq/llama-3.3-70b-versatile"] // Groq-only mode (free tier)

    // Run analyses in parallel
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
      return Response.json(
        { error: "All models failed to analyze", details: results.map((r) => r.error) },
        { status: 500 }
      )
    }

    // Get consensus if multiple models succeeded
    let finalAnalysis: z.infer<typeof TradeAnalysisSchema>
    let consensus: z.infer<typeof SwarmConsensusSchema> | null = null

    if (successfulAnalyses.length > 1 && useSwarm) {
      consensus = await getSwarmConsensus(successfulAnalyses)
      // Use the analysis from the model that matches consensus, or the highest trust score
      const matchingAnalysis = successfulAnalyses.find(
        (a) => a.analysis.status === consensus!.finalDecision
      )
      finalAnalysis = matchingAnalysis?.analysis || successfulAnalyses[0].analysis
      finalAnalysis.trustScore = consensus.confidenceScore
    } else {
      finalAnalysis = successfulAnalyses[0].analysis
    }

    return Response.json({
      success: true,
      analysis: finalAnalysis,
      consensus,
      modelResults: successfulAnalyses.map((r) => ({
        model: r.model,
        status: r.analysis.status,
        trustScore: r.analysis.trustScore,
      })),
    })
  } catch (error) {
    console.error("Analysis error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
