import { createClient } from "@/lib/supabase/server"
import type { EngineEventMinimal, EngineStatus } from "@/lib/types/proof"

interface EmitParams {
  requestId: string
  userId?: string
  name: string
  stage: string
  status: EngineStatus
  ticker?: string
  payload?: Record<string, unknown>
  durationMs?: number
}

export async function emitEngineEvent(params: EmitParams): Promise<EngineEventMinimal> {
  const id = crypto.randomUUID()
  const ts = new Date().toISOString()

  const event: EngineEventMinimal = {
    id,
    requestId: params.requestId,
    name: params.name,
    stage: params.stage,
    status: params.status,
    durationMs: params.durationMs,
    ts,
  }

  try {
    const supabase = await createClient()
    await supabase.from("engine_events").insert({
      id,
      request_id: params.requestId,
      user_id: params.userId ?? null,
      name: params.name,
      stage: params.stage,
      status: params.status,
      ticker: params.ticker ?? null,
      payload: params.payload ?? {},
      duration_ms: params.durationMs ?? null,
      created_at: ts,
    })
  } catch (error) {
    console.error("[engine_events] persist failed:", error)
  }

  return event
}

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

export async function recordStageEvent(supabase: { from: (table: string) => { insert: (payload: Record<string, unknown>) => PromiseLike<{ error: { message?: string } | null }> } }, input: StageEventInput) {
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
