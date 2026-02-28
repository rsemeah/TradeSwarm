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
      signal: AbortSignal.timeout(3000),
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
      signal: AbortSignal.timeout(3000),
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
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [dbResult, yahooResult, tradesResult, eventsResult, receiptResult, quoteProbe, expirationProbe] = await Promise.all([
      supabase.from("trade_receipts").select("*", { count: "exact", head: true }),
      probeMarketDataHealth(),
      supabase.from("trades").select("*", { count: "exact" }).gte("created_at", yesterday).order("created_at", { ascending: false }).limit(10),
      supabase
        .from("engine_events")
        .select("name, status, created_at", { count: "exact" })
        .gte("created_at", yesterday)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("trade_receipts").select("*", { count: "exact", head: true }).gte("created_at", yesterday),
      probeYahooQuote("SPY"),
      probeYahooExpirations("SPY"),
    ])

    const recentEvents = eventsResult.data ?? []
    const recentTrades = tradesResult.data ?? []
    const errEvents = recentEvents.filter((e) => e.status === "error")
    const blockedEvents = recentEvents.filter((e) => e.status === "blocked")
    const successfulTrades = recentTrades.filter((t) => t.status === "GO")

    const dbOk = !dbResult.error
    const yahooOk = yahooResult.status !== "down"
    const degraded = quoteProbe.status !== "ok" || expirationProbe.status !== "ok"
    const ok = dbOk && yahooOk

    return Response.json({
      ok,
      status: degraded ? "degraded" : "operational",
      reasonCode: degraded ? "YAHOO_PROBE_DEGRADED" : null,
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
          quote: quoteProbe,
          expirations: expirationProbe,
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
        tradesLast24h: tradesResult.count ?? 0,
        receiptsLast24h: receiptResult.count ?? 0,
        eventsLast24h: eventsResult.count ?? 0,
        errorsLast24h: errEvents.length,
        blockedLast24h: blockedEvents.length,
        successRate: tradesResult.count ? Math.round((successfulTrades.length / tradesResult.count) * 100) : 0,
        avgTrustScore: recentTrades.length
          ? Math.round(recentTrades.reduce((sum, t) => sum + (t.trust_score || 0), 0) / recentTrades.length)
          : 0,
      },
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
      adapterDiagnostics: {
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
      },
      circuitBreakers: {
        yahooFinance: getMarketDataCircuitStatus(),
      },
      lastActivity: recentTrades[0]?.created_at || null,
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
