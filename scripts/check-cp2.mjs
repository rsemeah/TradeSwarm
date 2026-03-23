#!/usr/bin/env node

import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

async function main() {
  const reportArg = process.argv[2]
  if (!reportArg) {
    throw new Error("Usage: node scripts/check-cp2.mjs <artifact-path>")
  }

  const reportPath = resolve(reportArg)
  const payload = JSON.parse(await readFile(reportPath, "utf8"))

  if (!Number.isInteger(payload.count) || payload.count <= 0) {
    throw new Error("CP2 check failed: count must be > 0")
  }

  if (typeof payload.matchRate !== "number" || Number.isNaN(payload.matchRate) || payload.matchRate < 0 || payload.matchRate > 1) {
    throw new Error("CP2 check failed: matchRate must be a number between 0 and 1")
  }

  if (typeof payload.schema_version !== "string" || payload.schema_version.length === 0) {
    throw new Error("CP2 check failed: schema_version must be present")
  }

  const failureMessages = Array.isArray(payload.failures) ? payload.failures.map((entry) => String(entry?.error ?? "")) : []
  if (failureMessages.some((message) => message.includes("SCHEMA_VERSION_MISMATCH"))) {
    throw new Error("CP2 check failed: schema version mismatch detected in runner output")
  }

  console.log(`CP2 artifact validated: total=${payload.count} matchRate=${payload.matchRate.toFixed(4)} schema=${payload.schema_version}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
