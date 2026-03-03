import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error, count } = await supabase
    .from('trade_receipts')
    .select('id, ticker, created_at, proof_bundle', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }

  return NextResponse.json({ ok: true, receipts: data ?? [], total: count ?? 0 })
}
