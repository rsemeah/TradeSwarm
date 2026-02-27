import { createClient } from "@/lib/supabase/server"
import { runTradeSwarm } from "@/lib/engine"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { ticker, theme, marketContext, trade, proofBundle } = await req.json()

    if (!proofBundle && !ticker && !trade?.ticker) {
      return Response.json({ error: "Ticker or proofBundle is required" }, { status: 400 })
    }

    const { proofBundle: canonicalProofBundle, persisted } = await runTradeSwarm({
      mode: "simulate",
      ticker: ticker || trade?.ticker,
      theme,
      marketContext,
      trade,
      existingProofBundle: proofBundle,
      userId: user.id,
    })

    return Response.json({
      success: true,
      trade: persisted?.trade,
      receipt: persisted?.receipt,
      message: `Simulated: ${canonicalProofBundle.decision.ticker} for $${canonicalProofBundle.decision.recommendedAmount ?? 0}`,
      isSimulation: true,
      proofBundle: canonicalProofBundle,
    })
  } catch (error) {
    console.error("Simulate error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
