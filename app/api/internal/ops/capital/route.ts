import { computeCapitalSize } from "@/lib/capital/sizing"
import { createAdminClient } from "@/lib/supabase/admin"

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const supabase = createAdminClient()

    const { data: activePolicy, error } = await supabase
      .from("capital_policy")
      .select("confidence_tiers,kelly_fraction_cap,hard_cap_dollars")
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    const policy = {
      confidence_tiers: {
        high: toNumber(activePolicy?.confidence_tiers?.high, 1),
        medium: toNumber(activePolicy?.confidence_tiers?.medium, 0.7),
        low: toNumber(activePolicy?.confidence_tiers?.low, 0.4),
      },
      kelly_fraction_cap: toNumber(activePolicy?.kelly_fraction_cap, 0.25),
      hard_cap_dollars: toNumber(activePolicy?.hard_cap_dollars, 500),
    }

    const result = computeCapitalSize(
      {
        balance: toNumber(body.balance, 0),
        edge: toNumber(body.edge, 0),
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
