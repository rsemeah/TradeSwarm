export const ENGINE_STAGES = [
  "CONTEXT_DONE",
  "REGIME_DONE",
  "RISK_DONE",
  "ROUND1_DONE",
  "ROUND2_DONE",
  "ARBITRATION_DONE",
  "SCORING_DONE",
  "RECEIPT_WRITTEN",
] as const

export type EngineStage = (typeof ENGINE_STAGES)[number]
export type StageStatus = "success" | "failed" | "degraded"

export interface StageEventInput {
  stage: EngineStage
  status: StageStatus
  correlationId: string
  userId?: string | null
  ticker?: string | null
  durationMs: number
  reasonCode?: string
  details?: Record<string, unknown>
}

export async function recordStageEvent(supabase: any, input: StageEventInput) {
  const { error } = await supabase.from("engine_events").insert({
    user_id: input.userId ?? null,
    event_type: input.stage,
    ticker: input.ticker ?? null,
    duration_ms: input.durationMs,
    payload: {
      status: input.status,
      correlationId: input.correlationId,
      reasonCode: input.reasonCode ?? null,
      ...(input.details || {}),
    },
  })

  if (error) {
    console.error(`Failed to write engine event ${input.stage}:`, error.message || error)
  }
}

export interface DegradedModeDecision {
  isDegraded: boolean
  executeBlocked: boolean
  warnings: string[]
  reasonCode: string | null
}

const CRITICAL_FAILURE_REASON_CODES = new Set([
  "CONTEXT_FAILED",
  "REGIME_FAILED",
  "RISK_FAILED",
  "ROUND1_FAILED",
  "SCORING_FAILED",
])

export function evaluateDegradedMode(reasonCodes: string[]): DegradedModeDecision {
  const filtered = reasonCodes.filter(Boolean)
  const executeBlocked = filtered.some((code) => CRITICAL_FAILURE_REASON_CODES.has(code))

  return {
    isDegraded: filtered.length > 0,
    executeBlocked,
    warnings: filtered.map((code) => `Engine degraded: ${code}`),
    reasonCode: filtered[0] || null,
  }
}
