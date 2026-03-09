// app/api/halal/screen/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runHalalScreen } from '@/lib/halal';

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_HALAL !== '1') return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const body = await req.json();
    const result = await runHalalScreen(body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const runtime = 'edge';
