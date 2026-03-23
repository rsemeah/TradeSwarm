const VOLATILE_FIELDS = new Set([
  "as_of",
  "fetchedAt",
  "cached",
  "cache_hit",
  "timestamp",
  "created_utc",
  "generated_at",
  "computed_at",
])

export function stripVolatileFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripVolatileFields(item)) as T
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (VOLATILE_FIELDS.has(key)) continue
      if (raw === undefined) continue
      result[key] = stripVolatileFields(raw)
    }
    return result as T
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    return null as T
  }

  return value
}
