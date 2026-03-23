import { createHash } from "node:crypto"
import type { EngineInputV1 } from "@/src/types/EngineInput.v1"
import { stableJsonStringify } from "@/src/lib/determinism/stableJson"
import { stripVolatileFields } from "@/src/lib/determinism/volatile"

export function sha256CanonicalJson(value: unknown): string {
  return createHash("sha256").update(stableJsonStringify(value)).digest("hex")
}

export function computeInputHash(input: EngineInputV1): string {
  return sha256CanonicalJson(stripVolatileFields(input))
}

export function computeOutputHash(output: unknown): string {
  return sha256CanonicalJson(stripVolatileFields(output))
}
