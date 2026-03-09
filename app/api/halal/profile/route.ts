// app/api/halal/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  if (process.env.ENABLE_HALAL !== '1') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const user_id = new URL(req.url).searchParams.get('user_id');
  if (!user_id) return NextResponse.json({ error: 'missing user_id' }, { status: 400 });
  // STUB: return no active profile
  return NextResponse.json({ profile: null, truth_status: 'STUBBED' });
}

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_HALAL !== '1') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  // STUB: echo patch
  return NextResponse.json({ profile: body, truth_status: 'STUBBED' });
}

export const runtime = 'edge';
