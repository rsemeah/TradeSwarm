/**
 * GET /api/internal/yfinance/chain?ticker=NVDA&expiration=2024-01-19
 * Returns parsed options chain for a given ticker + expiration.
 * `expiration` is optional — defaults to nearest expiry.
 * Auth-gated internal route.
 */

import { createClient } from "@/lib/supabase/server"

interface RawOption {
  strike?: number
  bid?: number
  ask?: number
  volume?: number
  openInterest?: number
  impliedVolatility?: number
  delta?: number
  inTheMoney?: boolean
}

function parseOptions(raw: RawOption[]) {
  return raw.map((o) => ({
    strike: o.strike ?? 0,
    bid: o.bid ?? 0,
    ask: o.ask ?? 0,
    mid: Math.round(((o.bid ?? 0) + (o.ask ?? 0)) * 50) / 100, // (bid+ask)/2 rounded to 2dp
    volume: o.volume ?? 0,
    openInterest: o.openInterest ?? 0,
    impliedVolatility: o.impliedVolatility ?? null,
    delta: o.delta ?? null,
    inTheMoney: o.inTheMoney ?? false,
  }))
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const ticker = searchParams.get("ticker")
  const expiration = searchParams.get("expiration") // YYYY-MM-DD, optional

  if (!ticker) return Response.json({ error: "ticker required" }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    let url = `https://query1.finance.yahoo.com/v7/finance/options/${ticker}`
    if (expiration) {
      const ts = Math.floor(new Date(expiration + "T16:00:00Z").getTime() / 1000)
      url += `?date=${ts}`
    }

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return Response.json({ error: `Yahoo HTTP ${res.status}` }, { status: 502 })
    }

    const json = await res.json()
    const chain = json.optionChain?.result?.[0]
    if (!chain) return Response.json({ error: "No chain data" }, { status: 404 })

    const expirationDates: string[] = (chain.expirationDates ?? []).map(
      (ts: number) => new Date(ts * 1000).toISOString().split("T")[0]
    )

    const opts = chain.options?.[0]
    const underlyingPrice: number = chain.quote?.regularMarketPrice ?? null

    // ATM IV: average of 3 nearest-ATM calls
    const calls = parseOptions(opts?.calls ?? [])
    const puts = parseOptions(opts?.puts ?? [])

    let atmIv: number | null = null
    if (underlyingPrice && calls.length > 0) {
      const atmCalls = [...calls]
        .sort((a, b) => Math.abs(a.strike - underlyingPrice) - Math.abs(b.strike - underlyingPrice))
        .slice(0, 3)
        .filter((c) => c.impliedVolatility !== null)
      if (atmCalls.length > 0) {
        atmIv =
          atmCalls.reduce((s, c) => s + (c.impliedVolatility ?? 0), 0) / atmCalls.length
      }
    }

    const expiryTs = chain.expirationDates?.[0]
    const expiryDate = expiryTs
      ? new Date(expiryTs * 1000).toISOString().split("T")[0]
      : null

    return Response.json({
      symbol: ticker,
      expiration: expiryDate,
      expirations: expirationDates,
      underlyingPrice,
      atmIv,
      calls,
      puts,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
