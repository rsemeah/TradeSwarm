// app/api/halal/drift/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { detectComplianceDrift } from '@/lib/halal';

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_HALAL !== '1') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const { portfolio_id, profile_id, held_tickers } = await req.json();
    const res = await detectComplianceDrift(portfolio_id, profile_id, held_tickers ?? []);
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const runtime = 'edge';
