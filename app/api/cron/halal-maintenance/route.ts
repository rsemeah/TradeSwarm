// app/api/cron/halal-maintenance/route.ts
// Cron-maintenance endpoint for the Halal backend. Gated by ENABLE_HALAL and CRON_SECRET.
import { NextRequest, NextResponse } from 'next/server';
import {
  expireStaleScreens,
  detectComplianceDrift,
  processNextScreeningJob,
  takePortfolioSnapshot,
} from '@/lib/halal';

export async function GET(req: NextRequest) {
  if (process.env.ENABLE_HALAL !== '1') {
    return NextResponse.json({ error: 'Halal feature disabled' }, { status: 404 });
  }

  const secret = req.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const job = new URL(req.url).searchParams.get('job') ?? 'all';
  const results: Record<string, unknown> = {};

  if (job === 'all' || job === 'expire') {
    const expired = await expireStaleScreens();
    results.expired_screens = expired;
  }

  if (job === 'all' || job === 'drift') {
    // In a real implementation, list active portfolios with positions.
    results.drift_events_created = 0;
  }

  if (job === 'all' || job === 'rescreen') {
    results.rescreens_processed = 0;
    results.rescreens_failed = 0;
  }

  if (job === 'all' || job === 'snapshot') {
    results.snapshots_taken = 0;
  }

  return NextResponse.json({ ran_at: new Date().toISOString(), job, results, truth_status: 'STUBBED' });
}

export const runtime = 'edge';
