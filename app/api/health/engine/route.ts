import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // Get recent engine events (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: recentTrades, count: tradeCount } = await supabase
      .from("trades")
      .select("*", { count: "exact" })
      .gte("created_at", yesterday)
      .order("created_at", { ascending: false })
      .limit(10)

    const { data: recentReceipts, count: receiptCount } = await supabase
      .from("trade_receipts")
      .select("*", { count: "exact" })
      .gte("executed_at", yesterday)
      .limit(10)

    // Calculate success rate
    const successfulTrades = recentTrades?.filter((t) => t.status === "GO") || []
    const successRate = tradeCount ? (successfulTrades.length / tradeCount) * 100 : 0

    // Engine status
    const engineStatus = {
      status: "operational",
      lastActivity: recentTrades?.[0]?.created_at || null,
      uptime: "100%", // Placeholder for V1
      metrics: {
        tradesLast24h: tradeCount || 0,
        receiptsLast24h: receiptCount || 0,
        successRate: Math.round(successRate),
        avgTrustScore: recentTrades?.length
          ? Math.round(
              recentTrades.reduce((sum, t) => sum + (t.trust_score || 0), 0) / recentTrades.length
            )
          : 0,
      },
      components: {
        aiSwarm: {
          status: "ok",
          models: ["groq/llama-3.3-70b-versatile", "openai/gpt-4o-mini"],
        },
        regime: {
          status: "stub", // Will be enhanced
          lastUpdate: null,
        },
        risk: {
          status: "stub", // Will be enhanced
          lastCalculation: null,
        },
      },
    }

    return Response.json({
      ...engineStatus,
      timestamp: new Date().toISOString(),
      latency: Date.now() - startTime,
    })
  } catch (error) {
    return Response.json(
      {
        status: "error",
        error: String(error),
        timestamp: new Date().toISOString(),
        latency: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
