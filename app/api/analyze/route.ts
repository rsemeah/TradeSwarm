import { runTradeSwarm } from "@/lib/engine"

export async function POST(req: Request) {
  try {
    const { ticker, theme, marketContext, useSwarm = true } = await req.json()

    if (!ticker) {
      return Response.json({ error: "Ticker is required" }, { status: 400 })
    }

    const { proofBundle } = await runTradeSwarm({
      mode: "analyze",
      ticker,
      theme,
      marketContext,
      useSwarm,
    })

    return Response.json({
      success: true,
      analysis: proofBundle.decision,
      consensus: proofBundle.consensus,
      modelResults: proofBundle.modelResults,
      aiConsensus: {
        groq: proofBundle.modelResults.find((m) => m.model.includes("groq"))
          ? {
              decision: proofBundle.modelResults.find((m) => m.model.includes("groq"))!.status,
              confidence: proofBundle.modelResults.find((m) => m.model.includes("groq"))!.trustScore,
              reasoning: proofBundle.modelResults.find((m) => m.model.includes("groq"))!.reasoning,
            }
          : undefined,
        openai: proofBundle.modelResults.find((m) => m.model.includes("openai"))
          ? {
              decision: proofBundle.modelResults.find((m) => m.model.includes("openai"))!.status,
              confidence: proofBundle.modelResults.find((m) => m.model.includes("openai"))!.trustScore,
              reasoning: proofBundle.modelResults.find((m) => m.model.includes("openai"))!.reasoning,
            }
          : undefined,
        finalVerdict: proofBundle.consensus?.finalDecision || proofBundle.decision.status,
        consensusStrength: proofBundle.consensus?.confidenceScore || proofBundle.decision.trustScore,
      },
      proofBundle,
    })
  } catch (error) {
    console.error("Analysis error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
