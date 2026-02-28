/**
 * GET /api/internal/yfinance/history?ticker=NVDA&days=30
 * Returns historical daily closing prices for RV20 calculation.
 * Auth-gated internal route.
 */

import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const ticker = searchParams.get("ticker")
  const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 365)

  if (!ticker) return Response.json({ error: "ticker required" }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const range = days <= 30 ? "1mo" : days <= 90 ? "3mo" : days <= 180 ? "6mo" : "1y"
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${range}`

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return Response.json({ error: `Yahoo HTTP ${res.status}` }, { status: 502 })
    }

    const json = await res.json()
    const result = json.chart?.result?.[0]
    if (!result) return Response.json({ error: "No data" }, { status: 404 })

    const rawTimestamps: number[] = result.timestamp ?? []
    const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []

    const closes: number[] = []
    const dates: string[] = []

    for (let i = 0; i < rawCloses.length; i++) {
      const c = rawCloses[i]
      if (c !== null && c > 0) {
        closes.push(Math.round(c * 100) / 100)
        dates.push(
          new Date((rawTimestamps[i] ?? 0) * 1000).toISOString().split("T")[0]
        )
      }
    }

    return Response.json({
      symbol: ticker,
      closes: closes.slice(-days),
      dates: dates.slice(-days),
      count: Math.min(closes.length, days),
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
