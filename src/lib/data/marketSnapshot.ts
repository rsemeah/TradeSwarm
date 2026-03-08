import crypto from "crypto"

// Deterministic JSON stringify by sorting keys recursively
export function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, (key, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((acc: Record<string, unknown>, k) => {
          acc[k] = (value as Record<string, unknown>)[k]
          return acc
        }, {})
    }
    return value
  })
}

export function hashSnapshot(snapshot: unknown): string {
  const s = stableStringify(snapshot)
  return crypto.createHash("sha256").update(s).digest("hex")
}
