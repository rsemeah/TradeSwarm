/**
 * GET /api/internal/yfinance/underlying?ticker=NVDA
 * Returns underlying quote data for the scanner adapter.
 * Auth-gated internal route — not meant for direct client use.
 */

import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const ticker = searchParams.get("ticker")
  if (!ticker) return Response.json({ error: "ticker required" }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=60d`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return Response.json({ error: `Yahoo HTTP ${res.status}` }, { status: 502 })
    }

    const json = await res.json()
    const result = json.chart?.result?.[0]
    if (!result) return Response.json({ error: "No chart data" }, { status: 404 })

    const meta = result.meta
    const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []
    const rawVolumes: (number | null)[] = result.indicators?.quote?.[0]?.volume ?? []

    const closes = rawCloses.filter((c): c is number => c !== null)
    const volumes = rawVolumes.filter((v): v is number => v !== null)

    const sma50 =
      closes.length > 0
        ? closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(closes.length, 50)
        : meta.regularMarketPrice

    const sma200 =
      closes.length > 0
        ? closes.slice(-200).reduce((a, b) => a + b, 0) / Math.min(closes.length, 200)
        : sma50

    const recentVols = volumes.slice(-20)
    const avgVolume =
      recentVols.length > 0
        ? recentVols.reduce((a, b) => a + b, 0) / recentVols.length
        : meta.regularMarketVolume ?? 0

    const prevClose =
      meta.previousClose ?? meta.regularMarketPreviousClose ?? meta.regularMarketPrice
    const changePercent =
      prevClose > 0 ? ((meta.regularMarketPrice - prevClose) / prevClose) * 100 : 0

    return Response.json({
      symbol: ticker,
      price: meta.regularMarketPrice,
      previousClose: prevClose,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: meta.regularMarketVolume ?? 0,
      avgVolume: Math.round(avgVolume),
      sma50: Math.round(sma50 * 100) / 100,
      sma200: Math.round(sma200 * 100) / 100,
      closes,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
