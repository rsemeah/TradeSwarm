export interface OptionContract {
  strike: number
  type: 'call' | 'put'
  expiry: string
  bid: number
  ask: number
  mid_ps: number
  last: number
  open_interest: number
  volume: number
  implied_vol: number
  delta: number | null
  theta: number | null
  in_the_money: boolean
}

export interface OptionChain {
  ticker: string
  underlying_price: number
  timestamp: string
  source: 'yfinance'
  expiries: string[]
  contracts: OptionContract[]
}

export interface UnderlyingData {
  ticker: string
  price: number
  avg_volume: number
  earnings_date: string | null
  timestamp: string
}

export async function fetchOptionChain(ticker: string, expiry: string): Promise<OptionChain> {
  try {
    const res = await fetch('/api/internal/yfinance/chain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, expiry }),
    })
    if (!res.ok) throw new Error(`yfinance chain ${res.status}`)
    return (await res.json()) as OptionChain
  } catch {
    return {
      ticker,
      underlying_price: 0,
      timestamp: new Date().toISOString(),
      source: 'yfinance',
      expiries: [],
      contracts: [],
    }
  }
}

export async function fetchUnderlying(ticker: string): Promise<UnderlyingData> {
  try {
    const res = await fetch('/api/internal/yfinance/underlying', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker }),
    })
    if (!res.ok) throw new Error(`yfinance underlying ${res.status}`)
    return (await res.json()) as UnderlyingData
  } catch {
    return { ticker, price: 0, avg_volume: 0, earnings_date: null, timestamp: new Date().toISOString() }
  }
}

export async function fetchHistoricalCloses(ticker: string, days = 252): Promise<number[]> {
  try {
    const res = await fetch('/api/internal/yfinance/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, days }),
    })
    if (!res.ok) throw new Error(`yfinance history ${res.status}`)
    const data = (await res.json()) as { closes: number[] }
    return data.closes
  } catch {
    return []
  }
}
