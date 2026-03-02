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

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // DB + Yahoo probes in parallel
    const [dbResult, yahooResult, tradesResult, receiptsResult] = await Promise.all([
      supabase
        .from("trade_receipts")
        .select("*", { count: "exact", head: true }),
      probeMarketDataHealth(),
      supabase
        .from("trades")
        .select("*", { count: "exact" })
        .gte("created_at", yesterday)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("trade_receipts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterday),
    ])

    const recentTrades = tradesResult.data || []
    const tradeCount = tradesResult.count || 0
    const receiptCount = receiptsResult.count || 0

    const successfulTrades = recentTrades.filter((t) => t.status === "GO")
    const successRate = tradeCount ? (successfulTrades.length / tradeCount) * 100 : 0

    const [quoteProbe, expirationProbe] = await Promise.all([
      probeYahooQuote("SPY"),
      probeYahooExpirations("SPY"),
    ])

    const dbOk = !dbResult.error
    const yahooOk = yahooResult.status !== "down" && quoteProbe.status === "ok"
    const degraded = quoteProbe.status !== "ok" || expirationProbe.status !== "ok"

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
        status: dbOk ? "ok" : "error",
      },
      yahoo: {
        quote: quoteProbe,
        expirations: expirationProbe,
      },
    }

    return Response.json({
      // Locked contract fields (MUST be present)
      ok: dbOk && yahooOk,
      service: "engine",
      ts: new Date().toISOString(),
      // Extended fields
      status: degraded ? "degraded" : "operational",
      engineVersion: "1.0.0",
      reasonCode: degraded ? "YAHOO_PROBE_DEGRADED" : null,
      lastActivity: recentTrades[0]?.created_at || null,
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
      },
      metrics: {
        tradesLast24h: tradeCount,
        receiptsLast24h: receiptCount,
        successRate: Math.round(successRate),
        avgTrustScore: recentTrades.length
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
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
    })
  } catch (error) {
    return Response.json(
      {
        // Locked contract fields (MUST be present)
        ok: false,
        service: "engine",
        ts: new Date().toISOString(),
        // Extended fields
        status: "error",
        reasonCode: "ENGINE_HEALTH_FAILED",
        error: String(error),
        latencyMs: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
