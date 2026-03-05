import YahooFinance from "yahoo-finance2"
import { hashSnapshot } from "./marketSnapshot"

const yf = new YahooFinance()

export async function getQuote(symbol: string) {
  const quote = await yf.quote(symbol)

  return {
    symbol,
    price: quote?.regularMarketPrice ?? null,
    change: quote?.regularMarketChange ?? null,
    changePercent: quote?.regularMarketChangePercent ?? null,
    volume: quote?.regularMarketVolume ?? null,
    marketCap: quote?.marketCap ?? null,
    raw: quote,
  }
}

export async function getOptions(symbol: string) {
  const result = await yf.options(symbol)
  // result.options is an array of expirations with contracts for each expiry
  return result?.options ?? []
}

export async function getMarketSnapshot(symbol: string) {
  const [quote, options] = await Promise.all([getQuote(symbol), getOptions(symbol)])
  const snapshot = {
    symbol,
    quote,
    options,
    fetchedAt: new Date().toISOString(),
  }

  return { snapshot, snapshotHash: hashSnapshot(snapshot) }
}
