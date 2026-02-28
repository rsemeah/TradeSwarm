import { NextResponse } from 'next/server'
import { getCachedScan } from '@/src/lib/scanner/scan'

export async function GET(_: Request, context: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await context.params
  const result = getCachedScan(scanId)
  if (!result) return NextResponse.json({ error: 'scan_not_found' }, { status: 404 })
  return NextResponse.json(result)
}
