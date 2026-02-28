import { NextResponse } from 'next/server'
import { runFullScan } from '@/src/lib/scanner/scan'
import type { ScanConfig } from '@/src/lib/scanner/types'

let cache: { ts: number; payload: unknown } | null = null
const TTL_MS = 5 * 60 * 1000

export async function POST(req: Request) {
  const url = new URL(req.url)
  const force = url.searchParams.get('force') === 'true'
  const now = Date.now()

  if (!force && cache && now - cache.ts < TTL_MS) {
    return NextResponse.json({ ...cache.payload as object, cached: true })
  }

  const body = await req.json().catch(() => ({})) as Partial<ScanConfig>
  const payload = await runFullScan({ ...body, force_refresh: force })

  cache = { ts: now, payload }
  return NextResponse.json({ ...payload, cached: false })
}
