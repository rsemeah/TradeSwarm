import { createClient } from "@/lib/supabase/server"
import { ENGINE_STAGES } from "@/lib/engine/events"

async function probeYahooQuote(ticker: string) {
  const startedAt = Date.now()
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`

  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
  const json = await response.json()
  const quote = json?.quoteResponse?.result?.[0]

  return {
    status: response.ok && !!quote ? "ok" : "error",
    latencyMs: Date.now() - startedAt,
    symbol: quote?.symbol || ticker,
    regularMarketPrice: quote?.regularMarketPrice || null,
    error: response.ok ? null : `HTTP ${response.status}`,
  }
}

async function probeYahooExpirations(ticker: string) {
  const startedAt = Date.now()
  const url = `https://query1.finance.yahoo.com/v7/finance/options/${ticker}`

  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
  const json = await response.json()
  const result = json?.optionChain?.result?.[0]
  const expirations = result?.expirationDates || []

  return {
    status: response.ok && expirations.length > 0 ? "ok" : "error",
    latencyMs: Date.now() - startedAt,
    count: expirations.length,
    firstExpiration: expirations[0] || null,
    error: response.ok ? null : `HTTP ${response.status}`,
  }
}
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

    const { data: successfulStageRows } = await supabase
      .from("engine_events")
      .select("event_type, created_at, payload")
      .in("event_type", [...ENGINE_STAGES])
      .order("created_at", { ascending: false })
      .limit(400)

    const lastSuccessfulStages = ENGINE_STAGES.reduce<Record<string, string | null>>((acc, stage) => {
      const match = successfulStageRows?.find(
        (row) => row.event_type === stage && (row.payload?.status === "success" || row.payload?.status === "degraded")
      )
      acc[stage] = match?.created_at || null
      return acc
    }, {})

    const successfulTrades = recentTrades?.filter((t) => t.status === "GO") || []
    const successRate = tradeCount ? (successfulTrades.length / tradeCount) * 100 : 0

    const [quoteProbe, expirationProbe] = await Promise.all([
      probeYahooQuote("SPY"),
      probeYahooExpirations("SPY"),
    ])

    const adapterDiagnostics = {
      groq: {
        status: process.env.GROQ_API_KEY ? "ok" : "error",
        configured: !!process.env.GROQ_API_KEY,
      },
      openai: {
        status: process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY ? "ok" : "error",
        configured: !!process.env.OPENAI_API_KEY || !!process.env.AI_GATEWAY_API_KEY,
      },
      supabase: {
        status: "ok",
        recentEventRows: successfulStageRows?.length || 0,
      },
      yahoo: {
        quote: quoteProbe,
        expirations: expirationProbe,
      },
    }

    const degraded = quoteProbe.status !== "ok" || expirationProbe.status !== "ok"

    return Response.json({
      status: degraded ? "degraded" : "operational",
      reasonCode: degraded ? "YAHOO_PROBE_DEGRADED" : null,
      lastActivity: recentTrades?.[0]?.created_at || null,
      timestamp: new Date().toISOString(),
      latency: Date.now() - startTime,
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
      probes: {
        yahooQuote: quoteProbe,
        yahooExpirations: expirationProbe,
      },
      adapterDiagnostics,
      lastSuccessfulStages,
      receiptsObserved: recentReceipts?.length || 0,
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
        reasonCode: "ENGINE_HEALTH_FAILED",
        error: String(error),
        timestamp: new Date().toISOString(),
        latency: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
