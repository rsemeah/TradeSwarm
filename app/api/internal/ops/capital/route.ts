import { computeCapitalSize } from "@/lib/capital/sizing"
import { createAdminClient } from "@/lib/supabase/admin"

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

async function loadActivePolicy() {
  const supabase = createAdminClient()
  const { data: activePolicy, error } = await supabase
    .from("capital_policy")
    .select("confidence_tiers,kelly_fraction_cap,hard_cap_dollars,drift_warn_throttle,drawdown_brake_floor,daily_loss_limit_total,max_trades_per_day,feed_staleness_max_sec,kill_switch_active")
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return {
    confidence_tiers: {
      high: toNumber(activePolicy?.confidence_tiers?.high, 1),
      medium: toNumber(activePolicy?.confidence_tiers?.medium, 0.7),
      low: toNumber(activePolicy?.confidence_tiers?.low, 0.4),
    },
    kelly_fraction_cap: toNumber(activePolicy?.kelly_fraction_cap, 0.25),
    hard_cap_dollars: toNumber(activePolicy?.hard_cap_dollars, 500),
    drift_warn_throttle: toNumber(activePolicy?.drift_warn_throttle, 0.6),
    drawdown_brake_floor: toNumber(activePolicy?.drawdown_brake_floor, 0),
    daily_loss_limit_total: toNumber(activePolicy?.daily_loss_limit_total, 500),
    max_trades_per_day: toNumber(activePolicy?.max_trades_per_day, 10),
    feed_staleness_max_sec: toNumber(activePolicy?.feed_staleness_max_sec, 120),
    kill_switch_active: Boolean(activePolicy?.kill_switch_active),
  }
}

export async function GET() {
  try {
    const policy = await loadActivePolicy()
    return Response.json({ policy })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const policy = await loadActivePolicy()

    const result = computeCapitalSize(
      {
        balance: toNumber(body.balance, 0),
        edge: toNumber(body.edge, 1),
        winProbability: toNumber(body.winProbability, 0),
        confidenceTier: body.confidenceTier === "high" || body.confidenceTier === "medium" || body.confidenceTier === "low"
          ? body.confidenceTier
          : "low",
        throttleMultiplier: toNumber(body.throttleMultiplier, 1),
      },
      policy,
    )

    return Response.json({ policy, sizing: result })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
