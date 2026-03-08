import { createHash } from "node:crypto"

const VOLATILE_KEYS = new Set(["timestamp", "ts", "request_id", "requestId", "trace_id", "traceId", "latency_ms"])

export interface MarketSnapshotRecord {
  provider: string
  asOf: string
  schemaVersion: number
  payload: Record<string, unknown>
  snapshotHash: string
}

function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableSort)
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !VOLATILE_KEYS.has(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, stableSort(nested)])

    return Object.fromEntries(entries)
  }

  return value
}

export function computeSnapshotHash(payload: Record<string, unknown>, schemaVersion: number): string {
  const canonicalPayload = stableSort(payload)
  const digestInput = JSON.stringify({ schemaVersion, payload: canonicalPayload })
  return createHash("sha256").update(digestInput).digest("hex")
}

export function buildMarketSnapshot(provider: string, asOf: string, schemaVersion: number, payload: Record<string, unknown>): MarketSnapshotRecord {
  const snapshotHash = computeSnapshotHash(payload, schemaVersion)
  return { provider, asOf, schemaVersion, payload, snapshotHash }
}

export function assertExecutableSnapshot(snapshot: Pick<MarketSnapshotRecord, "snapshotHash" | "schemaVersion"> | null, expectedSchemaVersion: number): void {
  if (!snapshot?.snapshotHash) {
    throw new Error("snapshot_missing")
  }

  if (snapshot.schemaVersion !== expectedSchemaVersion) {
    throw new Error("snapshot_schema_mismatch")
  }
}

export function attachMarketSnapshotHash<T extends Record<string, unknown>>(proofBundle: T, snapshotHash: string): T & { market_snapshot_hash: string } {
  return {
    ...proofBundle,
    market_snapshot_hash: snapshotHash,
  }
}
