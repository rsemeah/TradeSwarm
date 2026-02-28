/**
 * GET /api/scan/:scanId
 * Returns a specific scan result with all candidates.
 */

import { createClient } from "@/lib/supabase/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { scanId } = await params

    const { data: scan, error } = await supabase
      .from("scan_results")
      .select("*, scan_candidates(*)")
      .eq("scan_id", scanId)
      .eq("user_id", user.id)
      .single()

    if (error || !scan) {
      return Response.json({ error: "Scan not found" }, { status: 404 })
    }

    const candidates = (scan.scan_candidates ?? []).sort(
      (a: { score_final: number }, b: { score_final: number }) =>
        b.score_final - a.score_final
    )

    return Response.json({
      success: true,
      scanId: scan.scan_id,
      regime: scan.regime,
      summary: scan.ranking_summary,
      candidates,
      ts: scan.ts,
    })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
