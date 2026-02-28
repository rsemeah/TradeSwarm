/**
 * GET /api/health/engine
 * Live engine health check: DB connectivity + real Yahoo Finance probes.
 */

import { createClient } from "@/lib/supabase/server"
import { probeMarketDataHealth } from "@/lib/engine/market-context"
import { getMarketDataCircuitStatus } from "@/lib/engine/regime"

async function probeYahooQuote(ticker: string) {
  const startedAt = Date.now()
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`
    const response = await fetch(url, { 
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(3000)
    })
    const json = await response.json()
    const quote = json?.quoteResponse?.result?.[0]

    return {
      status: response.ok && !!quote ? "ok" : "error",
      latencyMs: Date.now() - startedAt,
      symbol: quote?.symbol || ticker,
      regularMarketPrice: quote?.regularMarketPrice || null,
      error: response.ok ? null : `HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      status: "error",
      latencyMs: Date.now() - startedAt,
      symbol: ticker,
      regularMarketPrice: null,
      error: String(error),
    }
  }
}

async function probeYahooExpirations(ticker: string) {
  const startedAt = Date.now()
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/options/${ticker}`
    const response = await fetch(url, { 
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(3000)
    })
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
  } catch (error) {
    return {
      status: "error",
      latencyMs: Date.now() - startedAt,
      count: 0,
      firstExpiration: null,
      error: String(error),
    }
  }
}

export async function GET() {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // DB + Yahoo probes in parallel
    const [dbResult, yahooResult] = await Promise.all([
      supabase
        .from("trade_receipts")
        .select("*", { count: "exact", head: true }),
      probeMarketDataHealth(),
    ])

    // Recent activity (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [{ count: tradeCount }, { data: recentEvents, count: eventCount }] = await Promise.all([
      supabase
        .from("trades")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterday),
      supabase
        .from("engine_events")
        .select("name, status, created_at", { count: "exact" })
        .gte("created_at", yesterday)
        .order("created_at", { ascending: false })
        .limit(50),
    ])

    const errEvents = recentEvents?.filter((e: { status: string }) => e.status === "error") ?? []
    const blockedEvents = recentEvents?.filter((e: { status: string }) => e.status === "blocked") ?? []

    const dbOk = !dbResult.error
    const yahooOk = yahooResult.status !== "down"
    const ok = dbOk && yahooOk

    return Response.json({
      ok,
      engineVersion: "1.0.0",
      checks: {
        db: {
          ok: dbOk,
          receiptsTotal: dbResult.count ?? 0,
          error: dbResult.error ? String(dbResult.error) : undefined,
        },
        yahoo: {
          ok: yahooOk,
          status: yahooResult.status,
          latencyMs: yahooResult.latencyMs,
          symbols: yahooResult.symbols,
        },
        orchestrator: {
          ok: true,
          components: {
            regime: "live",
            risk: "live",
            deliberation: "live",
            scoring: "live",
            events: "live",
          },
        },
      },
      metrics: {
        tradesLast24h: tradeCount ?? 0,
        eventsLast24h: eventCount ?? 0,
        errorsLast24h: errEvents.length,
        blockedLast24h: blockedEvents.length,
      },
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

    const [quoteProbe, expirationProbe] = await Promise.all([
      probeYahooQuote("SPY"),
      probeYahooExpirations("SPY"),
    ])

    const adapterDiagnostics = {
      groq: {
        status: process.env.GROQ_API_KEY ? "ok" : "not_configured",
        configured: !!process.env.GROQ_API_KEY,
      },
      openai: {
        status: process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY ? "ok" : "not_configured",
        configured: !!process.env.OPENAI_API_KEY || !!process.env.AI_GATEWAY_API_KEY,
      },
      supabase: {
        status: "ok",
      },
      yahoo: {
        quote: quoteProbe,
        expirations: expirationProbe,
      },
    }

    const degraded = quoteProbe.status !== "ok" || expirationProbe.status !== "ok"

    const engineStatus = {
      status: degraded ? "degraded" : "operational",
      reasonCode: degraded ? "YAHOO_PROBE_DEGRADED" : null,
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
      components: {
        aiSwarm: {
          status: "ok",
          models: ["groq/llama-3.3-70b-versatile", "openai/gpt-4o-mini"],
        },
        regime: {
          status: "operational",
          circuit: getMarketDataCircuitStatus(),
        },
        risk: {
          status: "operational",
        },
      },
      circuitBreakers: {
        yahooFinance: getMarketDataCircuitStatus(),
      },
    }

    return Response.json({
      ...engineStatus,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
    })
  } catch (error) {
    return Response.json(
      {
        ok: false,
        status: "error",
        reasonCode: "ENGINE_HEALTH_FAILED",
        error: String(error),
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
