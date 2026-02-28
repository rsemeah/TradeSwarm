import { createClient } from "@/lib/supabase/server"
import { probeMarketDataHealth } from "@/lib/engine/market-context"
import { getMarketDataCircuitStatus } from "@/lib/engine/regime"

export async function GET() {
  const startTime = Date.now()

  try {
    const supabase = await createClient()
    const [dbResult, yahooResult] = await Promise.all([
      supabase.from("trade_receipts").select("id", { count: "exact", head: true }),
      probeMarketDataHealth(),
    ])

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const [{ count: tradeCount }, { data: recentEvents, count: eventCount }] = await Promise.all([
      supabase.from("trades").select("id", { count: "exact", head: true }).gte("created_at", yesterday),
      supabase
        .from("engine_events")
        .select("name, status, created_at", { count: "exact" })
        .gte("created_at", yesterday)
        .order("created_at", { ascending: false })
        .limit(50),
    ])

    const errEvents = recentEvents?.filter((event) => event.status === "error") ?? []
    const blockedEvents = recentEvents?.filter((event) => event.status === "blocked") ?? []

    const dbOk = !dbResult.error
    const yahooOk = yahooResult.status !== "down"

    return Response.json({
      ok: dbOk && yahooOk,
      status: dbOk && yahooOk ? "operational" : "degraded",
      reasonCode: yahooOk ? null : "YAHOO_PROBE_DEGRADED",
      checks: {
        db: {
          ok: dbOk,
          receiptsTotal: dbResult.count ?? 0,
          error: dbResult.error ? String(dbResult.error) : null,
        },
        yahoo: {
          ok: yahooOk,
          status: yahooResult.status,
          latencyMs: yahooResult.latencyMs,
          symbols: yahooResult.symbols,
        },
      },
      components: {
        regime: { status: "operational", circuit: getMarketDataCircuitStatus() },
        risk: { status: "operational" },
        deliberation: { status: "operational" },
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
        status: "error",
        reasonCode: "ENGINE_HEALTH_FAILED",
        error: String(error),
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
