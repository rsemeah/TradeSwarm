import type { SupabaseClient } from "@supabase/supabase-js"

export interface ConvergenceMetrics {
  total: number
  matches: number
  matchRate: number
  mismatchesByClassification: Record<string, number>
  lastRunAtUtc: string | null
}

interface ReplayMetricRow {
  total: number | null
  matches: number | null
  match_rate: number | null
  mismatches_by_classification: Record<string, number> | null
  last_run_at: string | null
}

export async function getConvergenceMetrics(supabase: SupabaseClient): Promise<ConvergenceMetrics> {
  const { data, error } = await supabase.from("replay_convergence_metrics").select("total,matches,match_rate,mismatches_by_classification,last_run_at").single()

  if (error) {
    throw error
  }

  const row = (data ?? {
    total: 0,
    matches: 0,
    match_rate: 0,
    mismatches_by_classification: {},
    last_run_at: null,
  }) as ReplayMetricRow

  return {
    total: Number(row.total ?? 0),
    matches: Number(row.matches ?? 0),
    matchRate: Number(row.match_rate ?? 0),
    mismatchesByClassification: row.mismatches_by_classification ?? {},
    lastRunAtUtc: row.last_run_at,
  }
}
