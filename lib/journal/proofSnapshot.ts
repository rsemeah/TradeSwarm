export type JournalProofSnapshot = {
  iv_at_entry: number
  delta_source: string
  macro_flags: Record<string, boolean>
  underlying_price: number
  regime_inputs: Record<string, unknown>
  monte_carlo_seed: number
}

export function isValidProofSnapshot(value: unknown): value is JournalProofSnapshot {
  if (!value || typeof value !== "object") return false
  const snapshot = value as Record<string, unknown>
  if (typeof snapshot.iv_at_entry !== "number") return false
  if (typeof snapshot.delta_source !== "string") return false
  if (typeof snapshot.underlying_price !== "number") return false
  if (typeof snapshot.monte_carlo_seed !== "number") return false
  if (!snapshot.macro_flags || typeof snapshot.macro_flags !== "object" || Array.isArray(snapshot.macro_flags)) return false
  if (!snapshot.regime_inputs || typeof snapshot.regime_inputs !== "object" || Array.isArray(snapshot.regime_inputs)) return false

  for (const value of Object.values(snapshot.macro_flags as Record<string, unknown>)) {
    if (typeof value !== "boolean") return false
  }

  return true
}
