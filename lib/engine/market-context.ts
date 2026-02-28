/**
 * Market Context Builder
 * Fetches underlying quote + options chain from Yahoo Finance with
 * in-memory caching, abort timeouts, and provider health diagnostics.
 */

import type {
  MarketContext,
  UnderlyingQuote,
  OptionsChain,
  ProviderHealth,
  TradeAction,
} from "@/lib/types/proof"
import { HEALTH_PROBE_TICKERS } from "@/lib/universe"

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const quoteCache = new Map<string, CacheEntry<UnderlyingQuote>>()

// ─── Yahoo Finance quote fetch ─────────────────────────────────────────────

async function fetchYahooQuote(
  ticker: string
): Promise<{ data: UnderlyingQuote | null; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=60d`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return { data: null, latencyMs: Date.now() - start, error: `HTTP ${res.status}` }
    }

    const json = await res.json()
    const result = json.chart?.result?.[0]
    if (!result) {
      return { data: null, latencyMs: Date.now() - start, error: "No chart result" }
    }

    const meta = result.meta
    const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close || []
    const rawVolumes: (number | null)[] = result.indicators?.quote?.[0]?.volume || []

    const closes = rawCloses.filter((c): c is number => c !== null)
    const volumes = rawVolumes.filter((v): v is number => v !== null)

    const sma50 =
      closes.length >= 2
        ? closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(closes.length, 50)
        : meta.regularMarketPrice

    const sma200 =
      closes.length >= 2
        ? closes.slice(-200).reduce((a, b) => a + b, 0) / Math.min(closes.length, 200)
        : sma50

    const recentVols = volumes.slice(-20)
    const avgVolume =
      recentVols.length > 0
        ? recentVols.reduce((a, b) => a + b, 0) / recentVols.length
        : meta.regularMarketVolume

    const prevClose =
      meta.previousClose ?? meta.regularMarketPreviousClose ?? meta.regularMarketPrice
    const changePercent = ((meta.regularMarketPrice - prevClose) / prevClose) * 100

    const data: UnderlyingQuote = {
      symbol: ticker,
      price: meta.regularMarketPrice,
      previousClose: prevClose,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: meta.regularMarketVolume,
      avgVolume: Math.round(avgVolume),
      sma50: Math.round(sma50 * 100) / 100,
      sma200: Math.round(sma200 * 100) / 100,
      fetchedAt: new Date().toISOString(),
      source: "yahoo",
    }

    return { data, latencyMs: Date.now() - start }
  } catch (err) {
    return { data: null, latencyMs: Date.now() - start, error: String(err) }
  }
}

// ─── Yahoo Finance options chain fetch ────────────────────────────────────

async function fetchOptionsChain(
  ticker: string
): Promise<{ data: OptionsChain | null; error?: string }> {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/options/${ticker}`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) return { data: null, error: `HTTP ${res.status}` }

    const json = await res.json()
    const chain = json.optionChain?.result?.[0]
    if (!chain) return { data: null, error: "No option chain" }

    const expirations: string[] = (chain.expirationDates || [])
      .slice(0, 6)
      .map((ts: number) => new Date(ts * 1000).toISOString().split("T")[0])

    const opts = chain.options?.[0]
    const callVolume: number =
      opts?.calls?.reduce((s: number, c: { volume?: number }) => s + (c.volume || 0), 0) ?? 0
    const putVolume: number =
      opts?.puts?.reduce((s: number, p: { volume?: number }) => s + (p.volume || 0), 0) ?? 0
    const putCallRatio = callVolume > 0 ? Math.round((putVolume / callVolume) * 100) / 100 : null

    return {
      data: {
        expirations,
        putCallRatio,
        callVolume: callVolume || null,
        putVolume: putVolume || null,
        fetchedAt: new Date().toISOString(),
      },
    }
  } catch (err) {
    return { data: null, error: String(err) }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function buildMarketContext(params: {
  ticker: string
  action: TradeAction
  requestId: string
  theme?: string
  userContext?: string
}): Promise<MarketContext> {
  const { ticker, action, requestId } = params
  const now = new Date().toISOString()

  // Cache hit: return cached quote + fresh options
  const cached = quoteCache.get(ticker)
  if (cached && Date.now() < cached.expiresAt) {
    const optionsResult = await fetchOptionsChain(ticker)
    return {
      requestId,
      ticker,
      action,
      quote: cached.data,
      chain: optionsResult.data,
      providerHealth: {
        status: optionsResult.data ? "ok" : "degraded",
        latencyMs: 0,
        cached: true,
        fetchedAt: cached.data.fetchedAt,
      },
      theme: params.theme,
      userContext: params.userContext,
      ts: now,
    }
  }

  // Fetch in parallel
  const start = Date.now()
  const [quoteResult, optionsResult] = await Promise.all([
    fetchYahooQuote(ticker),
    fetchOptionsChain(ticker),
  ])
  const latencyMs = Date.now() - start

  // Determine provider health
  let status: ProviderHealth["status"]
  if (!quoteResult.data) {
    status = "down"
  } else if (!optionsResult.data) {
    status = "degraded"
  } else {
    status = "ok"
  }

  // Cache successful quote
  if (quoteResult.data) {
    quoteCache.set(ticker, {
      data: quoteResult.data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })
  }

  return {
    requestId,
    ticker,
    action,
    quote: quoteResult.data,
    chain: optionsResult.data,
    providerHealth: {
      status,
      latencyMs,
      cached: false,
      error: quoteResult.error,
      fetchedAt: now,
    },
    theme: params.theme,
    userContext: params.userContext,
    ts: now,
  }
}

/**
 * Health probe — tests Yahoo Finance connectivity using canary symbols.
 * Used by /api/health/engine.
 */
export async function probeMarketDataHealth(): Promise<{
  status: "ok" | "degraded" | "down"
  latencyMs: number
  symbols: { symbol: string; ok: boolean; latencyMs: number }[]
}> {
  const results = await Promise.all(
    HEALTH_PROBE_TICKERS.map(async (sym) => {
      const { data, latencyMs } = await fetchYahooQuote(sym)
      return { symbol: sym, ok: !!data, latencyMs }
    })
  )

  const allOk = results.every((r) => r.ok)
  const anyOk = results.some((r) => r.ok)
  const avgLatency = Math.round(
    results.reduce((s, r) => s + r.latencyMs, 0) / results.length
  )

  return {
    status: allOk ? "ok" : anyOk ? "degraded" : "down",
    latencyMs: avgLatency,
    symbols: results,
  }
}
