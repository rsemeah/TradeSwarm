/**
 * POST /api/scan
 * Triggers a full universe scan. Returns ranked candidates with proof bundles.
 * Results are persisted to scan_results + scan_candidates tables.
 *
 * Rate: max 1 scan per 5 minutes per user (enforced via last_scan_at check).
 */

import { createClient } from "@/lib/supabase/server"
import { runFullScan } from "@/lib/scanner/scan"

const SCAN_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    // Cooldown check: prevent scan spam
    const { data: lastScan } = await supabase
      .from("scan_results")
      .select("ts")
      .eq("user_id", user.id)
      .order("ts", { ascending: false })
      .limit(1)
      .single()

    if (lastScan?.ts) {
      const elapsed = Date.now() - new Date(lastScan.ts).getTime()
      if (elapsed < SCAN_COOLDOWN_MS) {
        const waitSec = Math.ceil((SCAN_COOLDOWN_MS - elapsed) / 1000)
        return Response.json(
          { error: `Scan cooldown active. Wait ${waitSec}s.` },
          { status: 429 }
        )
      }
    }

    const bundle = await runFullScan(user.id)

    return Response.json({
      success: true,
      scanId: bundle.scanId,
      candidates: bundle.candidates,
      regime: bundle.regime,
      summary: bundle.rankingSummary,
      ts: bundle.ts,
    })
  } catch (error) {
    console.error("Scan error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    // Return the most recent scan
    const { data: scan } = await supabase
      .from("scan_results")
      .select("*, scan_candidates(*)")
      .eq("user_id", user.id)
      .order("ts", { ascending: false })
      .limit(1)
      .single()

    if (!scan) {
      return Response.json({ scan: null, message: "No scans yet" })
    }

    return Response.json({
      success: true,
      scanId: scan.scan_id,
      regime: scan.regime,
      summary: scan.ranking_summary,
      candidates: scan.scan_candidates ?? [],
      ts: scan.ts,
    })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
