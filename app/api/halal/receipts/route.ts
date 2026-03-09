// app/api/halal/receipts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { buildShariaReceipt } from '@/lib/halal';

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_HALAL !== '1') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const body = await req.json();
    const id = await buildShariaReceipt(body);
    return NextResponse.json({ receipt_id: id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const runtime = 'edge';
