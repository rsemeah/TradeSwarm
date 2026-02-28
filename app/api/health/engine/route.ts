import { createClient } from "@/lib/supabase/server"
import { fetchYahooExpirations, fetchYahooQuote } from "@/lib/market-data/yahoo"
import { getMarketDataCircuitStatus } from "@/lib/engine/regime"
import { getCircuitState } from "@/lib/adapters/http"

export async function GET() {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: recentTrades, count: tradeCount } = await supabase
      .from("trades")
      .select("*", { count: "exact" })
      .gte("created_at", yesterday)
      .order("created_at", { ascending: false })
      .limit(10)

    const { count: receiptCount } = await supabase
      .from("trade_receipts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday)

    const successfulTrades = recentTrades?.filter((t) => t.status === "GO") || []
    const successRate = tradeCount ? (successfulTrades.length / tradeCount) * 100 : 0

    let marketData = { ok: true, reason: null as string | null, quoteLatencyMs: 0, expirationsLatencyMs: 0 }

    try {
      const quoteStart = Date.now()
      await fetchYahooQuote("NVDA")
      marketData.quoteLatencyMs = Date.now() - quoteStart

      const expStart = Date.now()
      await fetchYahooExpirations("NVDA")
      marketData.expirationsLatencyMs = Date.now() - expStart
    } catch (error) {
      marketData = {
        ok: false,
        reason: `Yahoo fetch failed: ${String(error)}`,
        quoteLatencyMs: 0,
        expirationsLatencyMs: 0,
      }
    }

    const engineStatus = {
      status: marketData.ok ? "operational" : "degraded",
      lastActivity: recentTrades?.[0]?.created_at || null,
      uptime: "100%",
      metrics: {
        tradesLast24h: tradeCount || 0,
        receiptsLast24h: receiptCount || 0,
        successRate: Math.round(successRate),
        avgTrustScore: recentTrades?.length
          ? Math.round(recentTrades.reduce((sum, t) => sum + (t.trust_score || 0), 0) / recentTrades.length)
          : 0,
      },
      components: {
        aiSwarm: {
          status: "ok",
          models: ["groq/llama-3.3-70b-versatile", "openai/gpt-4o-mini"],
        },
        marketData,
        regime: {
          status: "basic",
        },
        risk: {
          status: "basic",
          status: "operational",
          circuit: getMarketDataCircuitStatus(),
        },
        risk: {
          status: "operational",
          lastCalculation: null,
        },
      },
      circuitBreakers: {
        yahooFinance: getMarketDataCircuitStatus(),
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
