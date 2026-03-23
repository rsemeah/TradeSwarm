import { getConvergenceMetrics } from "@/lib/engine/convergence"
import { createAdminClient } from "@/lib/supabase/admin"

function authorized(req: Request) {
  const expected = process.env.INTERNAL_JOBS_TOKEN
  if (!expected) return true
  return req.headers.get("x-internal-token") === expected
}

export async function GET(req: Request) {
  try {
    if (!authorized(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const metrics = await getConvergenceMetrics(supabase)

    return Response.json({
      ok: true,
      total: metrics.total,
      matches: metrics.matches,
      matchRate: metrics.matchRate,
      mismatchesByClassification: metrics.mismatchesByClassification,
      lastRunAtUtc: metrics.lastRunAtUtc,
    })
  } catch (error) {
    console.error("Failed to load convergence metrics", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
