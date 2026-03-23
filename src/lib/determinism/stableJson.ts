function normalizeValue(value: unknown): unknown {
  if (value === undefined) return undefined
  if (value === null) return null

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      const normalized = normalizeValue(item)
      return normalized === undefined ? null : normalized
    })
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))

    const normalizedObject: Record<string, unknown> = {}
    for (const [key, raw] of entries) {
      const normalized = normalizeValue(raw)
      if (normalized !== undefined) {
        normalizedObject[key] = normalized
      }
    }
    return normalizedObject
  }

  return value
}

export function canonicalizeJson(value: unknown): unknown {
  return normalizeValue(value)
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(canonicalizeJson(value))
}
