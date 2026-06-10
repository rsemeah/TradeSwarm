/**
 * CCXT Crypto Market Data Adapter (T05)
 * Capital War Room | Data Division
 *
 * Provides unified crypto OHLCV data via CCXT library.
 * Default exchange: Coinbase Advanced Trade (matches execution broker)
 * Fallback: Binance (for broader coverage)
 *
 * Install: npm install ccxt
 *
 * TruthSerum tag: CCXT_FEED
 */

// Dynamic import to avoid build errors if ccxt is not installed
let ccxt: typeof import("ccxt") | null = null

async function getCcxt() {
  if (!ccxt) {
    try {
      ccxt = await import("ccxt")
    } catch {
      throw new Error("ccxt package not installed. Run: npm install ccxt")
    }
  }
  return ccxt
}

export interface CryptoBar {
  timestamp: string    // ISO 8601
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface CryptoQuote {
  ticker: string       // e.g. BTC/USD
  price: number
  bid: number
  ask: number
  volume24h: number
  timestamp: string    // ISO 8601
  dataSource: "CCXT_FEED"
  exchange: string
}

/**
 * getCryptoBars — OHLCV bars for a crypto pair
 * Sprint 1 gate: getCryptoBars('BTC') must return an OHLCV array
 *
 * @param ticker  Base symbol, e.g. "BTC", "ETH" — USD pair assumed
 * @param timeframe  "1m" | "5m" | "1h" | "4h" | "1d"
 * @param limit  Number of bars (default 100)
 * @param exchange  Exchange id (default "coinbase")
 */
export async function getCryptoBars(
  ticker: string,
  timeframe: string = "1h",
  limit: number = 100,
  exchangeId: string = "coinbase"
): Promise<CryptoBar[]> {
  const lib = await getCcxt()
  const ExchangeClass = (lib as Record<string, unknown>)[exchangeId] as new () => import("ccxt").Exchange
  if (!ExchangeClass) {
    throw new Error(`CCXT exchange "${exchangeId}" not found. Available: ${Object.keys(lib).filter(k => typeof (lib as Record<string, unknown>)[k] === "function").slice(0, 10).join(", ")}...`)
  }

  const exchange = new ExchangeClass()
  const symbol = ticker.toUpperCase().includes("/") ? ticker.toUpperCase() : `${ticker.toUpperCase()}/USD`

  await exchange.loadMarkets()

  if (!exchange.has["fetchOHLCV"]) {
    throw new Error(`Exchange ${exchangeId} does not support fetchOHLCV`)
  }

  const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit)

  return ohlcv.map(([ts, open, high, low, close, volume]) => ({
    timestamp: new Date(ts as number).toISOString(),
    open: open as number,
    high: high as number,
    low: low as number,
    close: close as number,
    volume: volume as number,
  }))
}

/**
 * getCryptoQuote — Latest ticker for a crypto pair
 */
export async function getCryptoQuote(
  ticker: string,
  exchangeId: string = "coinbase"
): Promise<CryptoQuote> {
  const lib = await getCcxt()
  const ExchangeClass = (lib as Record<string, unknown>)[exchangeId] as new () => import("ccxt").Exchange
  const exchange = new ExchangeClass()
  const symbol = ticker.toUpperCase().includes("/") ? ticker.toUpperCase() : `${ticker.toUpperCase()}/USD`

  await exchange.loadMarkets()
  const ticker_data = await exchange.fetchTicker(symbol)

  return {
    ticker: symbol,
    price: ticker_data.last ?? 0,
    bid: ticker_data.bid ?? 0,
    ask: ticker_data.ask ?? 0,
    volume24h: ticker_data.quoteVolume ?? ticker_data.baseVolume ?? 0,
    timestamp: new Date(ticker_data.timestamp ?? Date.now()).toISOString(),
    dataSource: "CCXT_FEED",
    exchange: exchangeId,
  }
}
