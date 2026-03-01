/**
 * GET /api/internal/ops/calibration
 *
 * CP3 acceptance-test endpoint.
 * Returns the full CP3 report: ECE, bins, drift state,
 * selectivity curve, EV alignment, and recommended thresholds.
 *
 * curl -s http://localhost:3000/api/internal/ops/calibration | jq
 */

import { buildCp3Report, logDriftEvent } from "@/lib/calibration/cp3"
import { getActivePolicy } from "@/lib/calibration/policyGate"
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

    const url = new URL(req.url)
    const windowDays = Math.min(
      365,
      Math.max(10, Number(url.searchParams.get("window") ?? 200))
    )

    const supabase = createAdminClient()

    const [report, policy] = await Promise.all([
      buildCp3Report(supabase, windowDays),
      getActivePolicy(supabase),
    ])

    // Log drift event if WARN or ALERT (async, non-blocking)
    if (report.drift !== "OK") {
      logDriftEvent(supabase, report).catch((err) =>
        console.warn("cp3 drift log failed:", err)
      )
    }

    return Response.json({
      ...report,
      policy: {
        minConfidenceToExecute: policy.minConfidenceToExecute,
        maxRiskPct: policy.maxRiskPct,
        haltOnDriftAlert: policy.haltOnDriftAlert,
      },
    })
  } catch (error) {
    console.error("CP3 calibration endpoint error", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
