// app/api/halal/purification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { estimatePurification } from '@/lib/halal';

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_HALAL !== '1') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const { dividendPerShare, haramRevenuePct } = await req.json();
    const est = estimatePurification(Number(dividendPerShare), Number(haramRevenuePct));
    return NextResponse.json({ purification_estimate: est });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const runtime = 'edge';
