import { createHash } from "node:crypto"

const VOLATILE_KEYS = new Set(["timestamp", "fetchedAt", "as_of", "cache", "cacheHit", "cache_hit"])

function normalizeValue(value: unknown): unknown {
  if (value === undefined) return null

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item))
  }

  if (value && typeof value === "object") {
    const normalizedEntries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !VOLATILE_KEYS.has(key))
      .map(([key, entryValue]) => [key, normalizeValue(entryValue)] as const)

    return Object.fromEntries(normalizedEntries)
  }

  return value
}

export function stableStringify(value: unknown): string {
  const normalized = normalizeValue(value)

  if (normalized === null || typeof normalized !== "object") {
    return JSON.stringify(normalized)
  }

  if (Array.isArray(normalized)) {
    return `[${normalized.map((item) => stableStringify(item)).join(",")}]`
  }

  const entries = Object.entries(normalized as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)

  return `{${entries.join(",")}}`
}

export function hashDeterministic(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex")
}
