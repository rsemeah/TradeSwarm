import { getCalibrationMetrics } from "@/lib/calibration/analytics"
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
    const metrics = await getCalibrationMetrics(supabase)

    const { data: governance } = await supabase
      .from("model_governance_log")
      .select("new_version,change_summary,created_at")
      .order("created_at", { ascending: false })
      .limit(10)

    return Response.json({ ...metrics, governance: governance || [] })
  } catch (error) {
    console.error("Failed to load calibration metrics", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
