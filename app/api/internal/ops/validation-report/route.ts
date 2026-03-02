import { createAdminClient } from "@/lib/supabase/admin"
import { collectInstitutionalValidation, shouldFreezeExecution } from "@/lib/engine/institutionalValidation"
import { getCalibrationMetrics } from "@/lib/calibration/analytics"

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
    const [validation, calibration] = await Promise.all([
      collectInstitutionalValidation(supabase),
      getCalibrationMetrics(supabase),
    ])

    return Response.json({
      generatedAt: new Date().toISOString(),
      freezeRecommended: shouldFreezeExecution(validation),
      validation,
      calibration,
    })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
