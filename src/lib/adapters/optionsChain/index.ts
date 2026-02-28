export interface SnapshotLeg {
  strike: number
  bid: number
  ask: number
  mid: number
  iv: number
  volume: number
  openInterest: number
  delta?: number
}

export interface OptionSnapshot {
  symbol: string
  expiration: number
  underlyingPrice: number
  putShort: SnapshotLeg
  putLong: SnapshotLeg
  callShort: SnapshotLeg
  callLong: SnapshotLeg
}

function mid(bid: number, ask: number): number {
  return Number(((bid + ask) / 2).toFixed(2))
}

function makeLeg(strike: number, iv: number, side: 'put' | 'call', underlying: number, distance: number): SnapshotLeg {
  const extrinsic = Math.max(0.2, 1.8 - distance * 0.22)
  const intrinsic = side === 'put' ? Math.max(0, strike - underlying) : Math.max(0, underlying - strike)
  const m = Number((intrinsic + extrinsic).toFixed(2))
  return {
    strike,
    bid: Number((m - 0.05).toFixed(2)),
    ask: Number((m + 0.05).toFixed(2)),
    mid: m,
    iv,
    volume: Math.round(150 + Math.random() * 1500),
    openInterest: Math.round(500 + Math.random() * 5000),
    delta: side === 'put' ? -0.2 : 0.2,
  }
}

export async function fetchOptionSnapshot(symbol: string): Promise<OptionSnapshot | null> {
  const quote = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`, {
    cache: 'no-store',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })

  if (!quote.ok) return null
  const json = await quote.json()
  const price = Number(json?.quoteResponse?.result?.[0]?.regularMarketPrice)
  if (!price || Number.isNaN(price)) return null

  const expiration = Math.floor(Date.now() / 1000) + 21 * 86_400
  const strike = Math.round(price)
  const width = Math.max(2, Math.round(price * 0.02))
  const iv = 0.22

  return {
    symbol,
    expiration,
    underlyingPrice: price,
    putShort: makeLeg(strike - width, iv, 'put', price, 1),
    putLong: makeLeg(strike - width * 2, iv + 0.01, 'put', price, 2),
    callShort: makeLeg(strike + width, iv, 'call', price, 1),
    callLong: makeLeg(strike + width * 2, iv + 0.01, 'call', price, 2),
  }
}
