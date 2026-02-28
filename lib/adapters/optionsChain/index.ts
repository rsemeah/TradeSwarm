/**
 * Options chain adapter — wraps /api/internal/yfinance/* routes.
 *
 * Called by the scanner at runtime (server-side only).
 * Uses absolute URLs so it works in Vercel edge / Node environments.
 */

import type { RawChain } from "@/lib/scanner/types"

function baseUrl(): string {
  // In Vercel: VERCEL_URL is set. Locally: localhost:3000.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.INTERNAL_API_URL ?? "http://localhost:3000"
}

async function internalGet(path: string, cookie: string): Promise<unknown> {
  const res = await fetch(`${baseUrl()}${path}`, {
    headers: { Cookie: cookie },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Internal fetch ${path} → ${res.status}`)
  return res.json()
}

export async function fetchOptionChain(params: {
  ticker: string
  expiration: string   // YYYY-MM-DD
  cookie: string
}): Promise<RawChain | null> {
  try {
    const data = (await internalGet(
      `/api/internal/yfinance/chain?ticker=${params.ticker}&expiration=${params.expiration}`,
      params.cookie
    )) as Record<string, unknown>

    if (!data || typeof data !== "object") return null

    return data as unknown as RawChain
  } catch {
    return null
  }
}

export async function fetchUnderlying(params: {
  ticker: string
  cookie: string
}): Promise<{
  price: number
  avgVolume: number
  closes: number[]
  fetchedAt: string
} | null> {
  try {
    const data = (await internalGet(
      `/api/internal/yfinance/underlying?ticker=${params.ticker}`,
      params.cookie
    )) as Record<string, unknown>

    if (!data) return null

    return {
      price: data.price as number,
      avgVolume: data.avgVolume as number,
      closes: (data.closes as number[]) ?? [],
      fetchedAt: data.fetchedAt as string,
    }
  } catch {
    return null
  }
}

export async function fetchHistoricalCloses(params: {
  ticker: string
  days: number
  cookie: string
}): Promise<number[]> {
  try {
    const data = (await internalGet(
      `/api/internal/yfinance/history?ticker=${params.ticker}&days=${params.days}`,
      params.cookie
    )) as Record<string, unknown>

    return (data?.closes as number[]) ?? []
  } catch {
    return []
  }
}
