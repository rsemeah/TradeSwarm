/**
 * Engine Event Emitter
 * Persists deterministic stage events to engine_events table and returns
 * a minimal event object for inclusion in the proof bundle.
 * Non-fatal: DB errors are logged but never block the engine.
 */

import { createClient } from "@/lib/supabase/server"
import type { EngineEventMinimal, EngineStatus } from "@/lib/types/proof"

interface EmitParams {
  requestId: string
  userId?: string
  name: string          // canonical event name e.g. REGIME_DONE
  stage: string         // preflight | regime | risk | deliberation | scoring | persist
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
  } catch (err) {
    // Non-fatal — event loss is acceptable; never block the engine
    console.error("[engine_events] persist failed:", err)
  }

  return event
}
