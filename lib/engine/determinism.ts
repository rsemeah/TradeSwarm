import { sha256CanonicalJson } from "@/src/lib/determinism/hash"
import { stableJsonStringify } from "@/src/lib/determinism/stableJson"

export function stableStringify(value: unknown): string {
  return stableJsonStringify(value)
}

export function hashDeterministic(value: unknown): string {
  return sha256CanonicalJson(value)
}
