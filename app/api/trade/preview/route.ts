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

    const { ticker, theme, marketContext } = await req.json()

    if (!ticker) {
      return Response.json({ error: "Ticker is required" }, { status: 400 })
    }

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
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
