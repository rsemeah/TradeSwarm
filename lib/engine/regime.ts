/**
 * Regime Detection Module
 * Analyzes market conditions using free Yahoo Finance data
 */

export type Trend = "bullish" | "bearish" | "neutral"
export type Volatility = "low" | "medium" | "high"
export type Momentum = "strong" | "weak" | "neutral"

export interface RegimeSnapshot {
  trend: Trend
  volatility: Volatility
  momentum: Momentum
  signals: {
    sma20: number
    sma50: number
    rsi14: number
    atr14: number
    priceChange5d: number
    volumeRatio: number
  }
  confidence: number
  timestamp: string
}

interface QuoteData {
  regularMarketPrice: number
  regularMarketPreviousClose: number
  regularMarketVolume: number
  averageVolume: number
  fiftyDayAverage: number
  twoHundredDayAverage: number
}

/**
 * Fetch basic quote data from Yahoo Finance
 */
async function fetchQuoteData(ticker: string): Promise<QuoteData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=60d`
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    })

    if (!response.ok) {
      console.error(`Yahoo Finance error for ${ticker}:`, response.status)
      return null
    }

    const data = await response.json()
    const result = data.chart?.result?.[0]
    
    if (!result) return null

    const meta = result.meta
    const closes = result.indicators?.quote?.[0]?.close || []
    const volumes = result.indicators?.quote?.[0]?.volume || []

    // Calculate averages from historical data
    const recentCloses = closes.filter((c: number | null) => c !== null).slice(-50)
    const recentVolumes = volumes.filter((v: number | null) => v !== null).slice(-20)

    const sma50 = recentCloses.length >= 50
      ? recentCloses.reduce((a: number, b: number) => a + b, 0) / recentCloses.length
      : meta.regularMarketPrice

    const avgVolume = recentVolumes.length > 0
      ? recentVolumes.reduce((a: number, b: number) => a + b, 0) / recentVolumes.length
      : meta.regularMarketVolume

    return {
      regularMarketPrice: meta.regularMarketPrice,
      regularMarketPreviousClose: meta.previousClose || meta.regularMarketPrice,
      regularMarketVolume: meta.regularMarketVolume,
      averageVolume: avgVolume,
      fiftyDayAverage: sma50,
      twoHundredDayAverage: meta.twoHundredDayAverage || sma50,
    }
  } catch (error) {
    console.error(`Failed to fetch quote for ${ticker}:`, error)
    return null
  }
}

/**
 * Calculate RSI from price data
 */
function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50

  const changes = closes.slice(1).map((price, i) => price - closes[i])
  const recentChanges = changes.slice(-period)

  const gains = recentChanges.filter((c) => c > 0)
  const losses = recentChanges.filter((c) => c < 0).map((c) => Math.abs(c))

  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

/**
 * Calculate ATR (Average True Range) for volatility
 */
function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < period) return 0

  const trueRanges: number[] = []
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    )
    trueRanges.push(tr)
  }

  const recentTR = trueRanges.slice(-period)
  return recentTR.reduce((a, b) => a + b, 0) / recentTR.length
}

/**
 * Detect market regime for a given ticker
 */
export async function detectRegime(ticker: string): Promise<RegimeSnapshot> {
  const quote = await fetchQuoteData(ticker)

  // Fallback to neutral regime if data unavailable
  if (!quote) {
    return {
      trend: "neutral",
      volatility: "medium",
      momentum: "neutral",
      signals: {
        sma20: 0,
        sma50: 0,
        rsi14: 50,
        atr14: 0,
        priceChange5d: 0,
        volumeRatio: 1,
      },
      confidence: 0.3,
      timestamp: new Date().toISOString(),
    }
  }

  // Calculate signals
  const price = quote.regularMarketPrice
  const priceChange = ((price - quote.regularMarketPreviousClose) / quote.regularMarketPreviousClose) * 100
  const volumeRatio = quote.regularMarketVolume / quote.averageVolume

  // Trend detection
  let trend: Trend = "neutral"
  if (price > quote.fiftyDayAverage * 1.02) {
    trend = "bullish"
  } else if (price < quote.fiftyDayAverage * 0.98) {
    trend = "bearish"
  }

  // Volatility (simplified - using price vs average ratio)
  const priceDeviation = Math.abs(price - quote.fiftyDayAverage) / quote.fiftyDayAverage
  let volatility: Volatility = "medium"
  if (priceDeviation < 0.03) {
    volatility = "low"
  } else if (priceDeviation > 0.08) {
    volatility = "high"
  }

  // Momentum (volume + price direction)
  let momentum: Momentum = "neutral"
  if (priceChange > 1 && volumeRatio > 1.2) {
    momentum = "strong"
  } else if (priceChange < -1 && volumeRatio > 1.2) {
    momentum = "strong" // Strong selling pressure
  } else if (Math.abs(priceChange) < 0.5 && volumeRatio < 0.8) {
    momentum = "weak"
  }

  // Confidence based on data quality
  const confidence = quote.averageVolume > 100000 ? 0.8 : 0.5

  return {
    trend,
    volatility,
    momentum,
    signals: {
      sma20: quote.fiftyDayAverage * 0.98, // Approximation
      sma50: quote.fiftyDayAverage,
      rsi14: 50 + priceChange * 5, // Simplified RSI approximation
      atr14: price * priceDeviation,
      priceChange5d: priceChange,
      volumeRatio,
    },
    confidence,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Get regime context string for AI prompts
 */
export function regimeToContext(regime: RegimeSnapshot): string {
  return `Market Regime: ${regime.trend} trend, ${regime.volatility} volatility, ${regime.momentum} momentum. ` +
    `Price change: ${regime.signals.priceChange5d.toFixed(2)}%, Volume ratio: ${regime.signals.volumeRatio.toFixed(2)}x average. ` +
    `Confidence: ${(regime.confidence * 100).toFixed(0)}%.`
}
