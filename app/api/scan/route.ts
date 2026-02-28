import { NextRequest, NextResponse } from 'next/server'
import { runScan } from '@/src/lib/scanner/scan'

export async function GET(req: NextRequest) {
  const includeTierA = req.nextUrl.searchParams.get('tierA') === '1'
  const forceRefresh = req.nextUrl.searchParams.get('forceRefresh') === '1'
  const result = await runScan({ includeTierA, forceRefresh })
  return NextResponse.json(result)
}
