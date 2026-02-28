const QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote"
const OPTIONS_URL = "https://query1.finance.yahoo.com/v7/finance/options"

function toISODateFromEpoch(epoch: number): string {
  return new Date(epoch * 1000).toISOString().slice(0, 10)
}

export async function fetchYahooQuote(symbol: string): Promise<{ symbol: string; price: number; ts: string }> {
  const res = await fetch(`${QUOTE_URL}?symbols=${encodeURIComponent(symbol)}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Yahoo quote failed: ${res.status}`)
  }

  const data = await res.json()
  const row = data?.quoteResponse?.result?.[0]
  if (!row?.regularMarketPrice) {
    throw new Error("Yahoo quote missing regularMarketPrice")
  }

  return {
    symbol: String(row.symbol ?? symbol).toUpperCase(),
    price: Number(row.regularMarketPrice),
    ts: new Date().toISOString(),
  }
}

export async function fetchYahooExpirations(symbol: string): Promise<string[]> {
  const res = await fetch(`${OPTIONS_URL}/${encodeURIComponent(symbol)}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Yahoo expirations failed: ${res.status}`)
  }

  const data = await res.json()
  const dates = data?.optionChain?.result?.[0]?.expirationDates
  if (!Array.isArray(dates)) {
    throw new Error("Yahoo expirations missing expirationDates")
  }

  return dates.map((epoch: number) => toISODateFromEpoch(epoch))
}
