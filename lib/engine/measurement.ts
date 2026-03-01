import { appendFile, mkdir } from "node:fs/promises"
import { createAdminClient } from "@/lib/supabase/admin"

interface EdgeRejectionPayload {
  trade_id?: string | null
  schema_version: string
  engine_version: string
  input_hash: string
  market_snapshot_hash: string
  rejection_reason: string
  threshold_used: Record<string, unknown>
  trade_candidate: Record<string, unknown>
}

interface ReplayConvergencePayload {
  trade_id: string
  run_id: string
  schema_version: string
  engine_version: string
  input_hash: string
  output_hash: string
  match: boolean
  divergence_field?: string | null
  divergence_path?: string | null
}

export async function persistEdgeRejection(payload: EdgeRejectionPayload): Promise<"supabase" | "file_fallback"> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("edge_rejections").insert(payload)
    if (error) throw error
    return "supabase"
  } catch {
    await mkdir(".truth", { recursive: true })
    await appendFile(".truth/edge_rejections.ndjson", `${JSON.stringify({ ...payload, created_at: new Date().toISOString() })}\n`, "utf8")
    return "file_fallback"
  }
}

export async function persistReplayConvergence(payload: ReplayConvergencePayload): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from("replay_convergence").insert(payload)
  if (error) throw error
}

export async function getConvergenceMetrics(window: number): Promise<{ total_replays: number; match_rate: number; mismatches: Array<{ divergence_field: string; count: number }> }> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("replay_convergence")
    .select("match,divergence_field")
    .order("created_at", { ascending: false })
    .limit(window)

  if (error) throw error

  const rows = data ?? []
  const total = rows.length
  const matches = rows.filter((row) => row.match).length
  const buckets = rows
    .filter((row) => !row.match)
    .reduce<Record<string, number>>((acc, row) => {
      const key = row.divergence_field ?? "unknown"
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})

  return {
    total_replays: total,
    match_rate: total === 0 ? 0 : matches / total,
    mismatches: Object.entries(buckets)
      .map(([divergence_field, count]) => ({ divergence_field, count: Number(count) }))
      .sort((a, b) => b.count - a.count),
  }
}
