// app/api/halal/proposal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { submitHalalProposal } from '@/lib/halal';

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_HALAL !== '1') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const body = await req.json();
    const res = await submitHalalProposal(body);
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const runtime = 'edge';
