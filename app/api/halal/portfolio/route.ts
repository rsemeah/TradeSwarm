// app/api/halal/portfolio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { computePortfolioState } from '@/lib/halal';

export async function GET(req: NextRequest) {
  if (process.env.ENABLE_HALAL !== '1') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const portfolio_id = new URL(req.url).searchParams.get('portfolio_id');
    if (!portfolio_id) return NextResponse.json({ error: 'missing portfolio_id' }, { status: 400 });
    const state = await computePortfolioState(portfolio_id);
    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const runtime = 'edge';
