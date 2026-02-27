import { generateText, Output } from "ai"
import { z } from "zod"

const LearnWhySchema = z.object({
  headline: z.string(),
  eli5: z.string(),
  technicalExplanation: z.string(),
  keyFactors: z.array(z.object({
    factor: z.string(),
    impact: z.enum(["positive", "negative", "neutral"]),
    explanation: z.string(),
  })),
  whatWouldChange: z.string(),
  alternatives: z.array(z.object({
    ticker: z.string(),
    reason: z.string(),
  })).nullable(),
})

export async function POST(req: Request) {
  try {
    const { ticker, status, strategy, bullets, trustScore } = await req.json()

    if (!ticker || !status) {
      return Response.json({ error: "Ticker and status required" }, { status: 400 })
    }

    const result = await generateText({
      model: "groq/llama-3.3-70b-versatile",
      system: `You are a trading coach explaining why a trade was blocked or put on hold.
Be educational and clear. Help the user understand market conditions and risk management.
Use simple language first, then provide technical details for those who want them.`,
      prompt: `Explain why this trade received a "${status}" status:

Ticker: ${ticker}
Strategy: ${strategy || "Options spread"}
Trust Score: ${trustScore || "Unknown"}/100
Current Assessment:
- Why: ${bullets?.why || "N/A"}
- Risk: ${bullets?.risk || "N/A"}
- Amount: ${bullets?.amount || "N/A"}

Provide:
1. A clear headline summarizing the decision
2. ELI5 (explain like I'm 5) version
3. Technical explanation for advanced users
4. Key factors that influenced this decision (3-5 factors)
5. What would need to change for this to become a GO
6. Alternative tickers in the same sector that might be better (if any)`,
      output: Output.object({ schema: LearnWhySchema }),
    })

    return Response.json({
      success: true,
      explanation: result.output,
    })
  } catch (error) {
    console.error("Learn Why error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
