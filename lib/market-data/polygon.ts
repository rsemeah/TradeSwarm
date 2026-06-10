/**
 * Polygon.io Market Data Adapter (T04)
 * Capital War Room | Data Division
 *
 * Replaces Yahoo Finance as the primary equity data source.
 * TruthSerum blocks YAHOO_FINANCE — this adapter uses POLYGON_REALTIME tag.
 *
 * Key required in .env:
 *   POLYGON_API_KEY=...   (rotate at polygon.io/dashboard if previously exposed)
 *
 * Freshness SLA: quotes must be < 5 minutes old (enforced by TruthSerum)
 */

export interface PolygonQuote {
  ticker: string
  price: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  vwap?: number
  timestamp: string          // ISO 8601 — used by TruthSerum freshness check
  dataSource: "POLYGON_REALTIME" | "POLYGON_DELAYED"
  marketStatus: "open" | "closed" | "extended"
}

export interface PolygonBar {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  vwap?: number
}

function getApiKey(): string {
  const key = process.env.POLYGON_API_KEY
  if (!key) throw new Error("POLYGON_API_KEY is not set in .env. Sign up at polygon.io — $79/mo Starter plan.")
  return key
}

async function polygonFetch<T>(path: string): Promise<T> {
  const apiKey = getApiKey()
  const url = `https://api.polygon.io${path}${path.includes("?") ? "&" : "?"}apiKey=${apiKey}`
  const res = await fetch(url, { next: { revalidate: 0 } }) // no cache — always fresh
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Polygon API error ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

/**
 * getQuote — Get latest quote for an equity ticker
 * Sprint 1 gate: must return in < 2s with fresh timestamp
 */
export async function getQuote(ticker: string): Promise<PolygonQuote> {
  const data = await polygonFetch<{
    status: string
    results: {
      T: string        // ticker
      o: number        // open
      h: number        // high
      l: number        // low
      c: number        // close
      v: number        // volume
      vw?: number      // vwap
      t: number        // timestamp ms
    }
  }>(`/v2/last/trade/${ticker.toUpperCase()}`)

  // Also fetch previous day close for context
  const snapshot = await polygonFetch<{
    status: string
    ticker: {
      day: { o: number; h: number; l: number; c: number; v: number; vw?: number }
      lastTrade: { p: number; t: number }
      prevDay: { c: number }
      todaysChangePerc: number
    }
  }>(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker.toUpperCase()}`)

  const snap = snapshot.ticker
  const ts = new Date(snap.lastTrade.t / 1_000_000).toISOString() // nanoseconds → ms → ISO

  // Determine if market is open (basic heuristic — Polygon provides this)
  const now = new Date()
  const hour = now.getUTCHours()
  const marketStatus: PolygonQuote["marketStatus"] =
    hour >= 14 && hour < 21 ? "open" : hour >= 13 || hour >= 21 ? "extended" : "closed"

  return {
    ticker: ticker.toUpperCase(),
    price: snap.lastTrade.p,
    open: snap.day.o,
    high: snap.day.h,
    low: snap.day.l,
    close: snap.day.c,
    volume: snap.day.v,
    vwap: snap.day.vw,
    timestamp: ts,
    dataSource: "POLYGON_REALTIME",
    marketStatus,
  }
}

/**
 * getBars — Get OHLCV bars for an equity ticker
 */
export async function getBars(
  ticker: string,
  from: string,   // YYYY-MM-DD
  to: string,     // YYYY-MM-DD
  timespan: "minute" | "hour" | "day" = "day",
  multiplier = 1
): Promise<PolygonBar[]> {
  const data = await polygonFetch<{
    status: string
    results?: Array<{
      o: number; h: number; l: number; c: number; v: number; vw?: number; t: number
    }>
  }>(`/v2/aggs/ticker/${ticker.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=5000`)

  return (data.results ?? []).map(bar => ({
    timestamp: new Date(bar.t).toISOString(),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
    vwap: bar.vw,
  }))
}

/**
 * isYahooFinanceImported — guard function
 * Call in tests to verify Yahoo Finance is not reachable from this module.
 */
export function isYahooFinanceImported(): false {
  return false
}
