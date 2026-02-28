/**
 * GET /api/health/engine
 * Live engine health check: DB connectivity + real Yahoo Finance probes.
 */

import { createClient } from "@/lib/supabase/server"
import { probeMarketDataHealth } from "@/lib/engine/market-context"

export async function GET() {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // DB + Yahoo probes in parallel
    const [dbResult, yahooResult] = await Promise.all([
      supabase
        .from("trade_receipts")
        .select("*", { count: "exact", head: true }),
      probeMarketDataHealth(),
    ])

    // Recent activity (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [{ count: tradeCount }, { data: recentEvents, count: eventCount }] = await Promise.all([
      supabase
        .from("trades")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterday),
      supabase
        .from("engine_events")
        .select("name, status, created_at", { count: "exact" })
        .gte("created_at", yesterday)
        .order("created_at", { ascending: false })
        .limit(50),
    ])

    const errEvents = recentEvents?.filter((e) => e.status === "error") ?? []
    const blockedEvents = recentEvents?.filter((e) => e.status === "blocked") ?? []

    const dbOk = !dbResult.error
    const yahooOk = yahooResult.status !== "down"
    const ok = dbOk && yahooOk

    return Response.json({
      ok,
      engineVersion: "1.0.0",
      checks: {
        db: {
          ok: dbOk,
          receiptsTotal: dbResult.count ?? 0,
          error: dbResult.error ? String(dbResult.error) : undefined,
        },
        yahoo: {
          ok: yahooOk,
          status: yahooResult.status,
          latencyMs: yahooResult.latencyMs,
          symbols: yahooResult.symbols,
        },
        orchestrator: {
          ok: true,
          components: {
            regime: "live",
            risk: "live",
            deliberation: "live",
            scoring: "live",
            events: "live",
          },
        },
      },
      metrics: {
        tradesLast24h: tradeCount ?? 0,
        eventsLast24h: eventCount ?? 0,
        errorsLast24h: errEvents.length,
        blockedLast24h: blockedEvents.length,
      },
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
    })
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: String(error),
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
