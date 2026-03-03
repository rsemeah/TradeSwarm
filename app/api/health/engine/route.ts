import { createClient } from "@/lib/supabase/server"
import { probeMarketDataHealth } from "@/lib/engine/market-context"
import { getMarketDataCircuitStatus } from "@/lib/engine/regime"

async function probeYahooQuote(ticker: string) {
  const startedAt = Date.now()
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(3000) })
    const json = await res.json()
    const q = json?.quoteResponse?.result?.[0]
    return { status: res.ok && !!q ? "ok" : "error", latencyMs: Date.now() - startedAt, symbol: q?.symbol ?? ticker, regularMarketPrice: q?.regularMarketPrice ?? null, error: res.ok ? null : `HTTP ${res.status}` }
  } catch (err) {
    return { status: "error", latencyMs: Date.now() - startedAt, symbol: ticker, regularMarketPrice: null, error: String(err) }
  }
}

async function probeYahooExpirations(ticker: string) {
  const startedAt = Date.now()
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/options/${ticker}`
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(3000) })
    const json = await res.json()
    const expirations = json?.optionChain?.result?.[0]?.expirationDates ?? []
    return { status: res.ok && expirations.length > 0 ? "ok" : "error", latencyMs: Date.now() - startedAt, count: expirations.length, firstExpiration: expirations[0] ?? null }
  } catch (err) {
    return { status: "error", latencyMs: Date.now() - startedAt, count: 0, firstExpiration: null }
  }
}

export async function GET() {
  const startTime = Date.now()
  try {
    const supabase = await createClient()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [dbCount, marketProbe, tradesRes, eventsRes, receiptsRes, quoteProbe, expirationProbe] = await Promise.all([
      supabase.from("trade_receipts").select("id", { count: "exact", head: true }),
      probeMarketDataHealth(),
      supabase.from("trades").select("*", { count: "exact" }).gte("created_at", yesterday).order("created_at", { ascending: false }).limit(10),
      supabase.from("engine_events").select("name, status, created_at", { count: "exact" }).gte("created_at", yesterday).order("created_at", { ascending: false }).limit(50),
      supabase.from("trade_receipts").select("*", { count: "exact" }).gte("created_at", yesterday),
      probeYahooQuote("SPY"),
      probeYahooExpirations("SPY"),
    ])

    const recentEvents = eventsRes.data ?? []
    const recentTrades = tradesRes.data ?? []
    const errEvents = recentEvents.filter((e: any) => e.status === "error")
    const blockedEvents = recentEvents.filter((e: any) => e.status === "blocked")
    const successfulTrades = recentTrades.filter((t: any) => t.status === "GO")

    const dbOk = !dbCount.error
    const yahooOk = marketProbe?.status !== "down"
    const degraded = quoteProbe.status !== "ok" || expirationProbe.status !== "ok"
    const ok = dbOk && yahooOk && !degraded

    return Response.json(
      {
        ok,
        status: degraded ? "degraded" : ok ? "operational" : "degraded",
        reasonCode: degraded ? "YAHOO_PROBE_DEGRADED" : null,
        engineVersion: "1.0.0",
        checks: {
          db: { ok: dbOk, receiptsTotal: dbCount.count ?? 0, error: dbCount.error ? String(dbCount.error) : null },
          yahoo: { ok: yahooOk, status: marketProbe?.status ?? "unknown", latencyMs: marketProbe?.latencyMs ?? null, quote: quoteProbe, expirations: expirationProbe },
        },
        components: { regime: { status: "operational", circuit: getMarketDataCircuitStatus() }, risk: { status: "operational" }, deliberation: { status: "operational" } },
        metrics: {
          tradesLast24h: tradesRes.count ?? 0,
          receiptsLast24h: receiptsRes.count ?? 0,
          eventsLast24h: eventsRes.count ?? 0,
          errorsLast24h: errEvents.length,
          blockedLast24h: blockedEvents.length,
          successRate: tradesRes.count ? Math.round((successfulTrades.length / tradesRes.count) * 100) : 0,
        },
        adapterDiagnostics: {
          groq: { status: process.env.GROQ_API_KEY ? "ok" : "not_configured", configured: !!process.env.GROQ_API_KEY },
          openai: { status: process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY ? "ok" : "not_configured", configured: !!process.env.OPENAI_API_KEY || !!process.env.AI_GATEWAY_API_KEY },
          supabase: { status: "ok" },
        },
        circuitBreakers: { yahooFinance: getMarketDataCircuitStatus() },
        lastActivity: recentTrades[0]?.created_at || null,
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime,
      },
      { status: ok ? 200 : 200 }
    )
  } catch (error) {
    return Response.json({ ok: false, status: "error", reasonCode: "ENGINE_HEALTH_FAILED", error: String(error), timestamp: new Date().toISOString(), latencyMs: Date.now() - startTime }, { status: 500 })
  }
}
