import { getConvergenceMetrics } from "@/lib/engine/measurement"

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

    const { searchParams } = new URL(req.url)
    const rawWindow = Number(searchParams.get("window") ?? "50")
    const window = Number.isFinite(rawWindow) ? Math.min(Math.max(rawWindow, 1), 500) : 50
    const metrics = await getConvergenceMetrics(window)

    return Response.json({ success: true, window, ...metrics })
  } catch (error) {
    console.error("Convergence query failed", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
