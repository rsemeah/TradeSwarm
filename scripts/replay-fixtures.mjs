#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const DEFAULTS = {
  count: 50,
  mode: "simulate",
  ticker: "SPY",
  amount: 200,
  baseUrl: "http://localhost:3000",
  bucket: "v1",
}

function parseArgs(argv) {
  const args = { ...DEFAULTS }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    const next = argv[index + 1]

    if (token === "--count" && next) {
      args.count = Number(next)
      index += 1
    } else if (token === "--mode" && next) {
      args.mode = next
      index += 1
    } else if (token === "--ticker" && next) {
      args.ticker = next
      index += 1
    } else if (token === "--amount" && next) {
      args.amount = Number(next)
      index += 1
    } else if (token === "--out" && next) {
      args.out = next
      index += 1
    } else if (token === "--baseUrl" && next) {
      args.baseUrl = next
      index += 1
    } else if (token === "--bucket" && next) {
      args.bucket = next
      index += 1
    } else if (token === "--internalToken" && next) {
      args.internalToken = next
      index += 1
    } else if (token === "--authToken" && next) {
      args.authToken = next
      index += 1
    }
  }

  if (!Number.isInteger(args.count) || args.count <= 0) {
    throw new Error("--count must be a positive integer")
  }

  if (!["preview", "simulate", "execute"].includes(args.mode)) {
    throw new Error("--mode must be preview|simulate|execute")
  }

  if (!Number.isFinite(args.amount) || args.amount <= 0) {
    throw new Error("--amount must be a positive number")
  }

  return args
}

function extractTradeId(payload) {
  if (!payload || typeof payload !== "object") return null
  return payload.tradeId ?? payload.trade_id ?? payload?.report?.tradeId ?? payload?.report?.trade_id ?? null
}

function extractSchemaVersion(payload) {
  if (!payload || typeof payload !== "object") return null
  return payload?.proofBundle?.version ?? payload?.preview?.version ?? payload?.schema_version ?? null
}

function buildOutPath(inputOut) {
  if (inputOut) return resolve(inputOut)
  const now = new Date().toISOString().replaceAll(":", "-")
  return resolve(`artifacts/replay-fixtures.${now}.json`)
}

async function callJson(url, init) {
  const res = await fetch(url, init)
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }

  if (!res.ok) {
    const reason = typeof body?.error === "string" ? body.error : `${res.status} ${res.statusText}`
    throw new Error(`HTTP ${res.status} @ ${url}: ${reason}`)
  }

  return body
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const outPath = buildOutPath(args.out)

  const headers = {
    "Content-Type": "application/json",
  }

  if (args.internalToken) headers["x-internal-token"] = args.internalToken
  if (args.authToken) headers.Authorization = `Bearer ${args.authToken}`

  let schemaVersion = null
  let engineVersion = null
  let matches = 0
  let total = 0
  const failures = []
  const mismatches = []

  for (let i = 1; i <= args.count; i += 1) {
    const replayKey = `cp2-${String(i).padStart(4, "0")}-${args.bucket}`
    const tradeUrl = `${args.baseUrl}/api/trade/${args.mode}`

    try {
      const tradePayload = await callJson(tradeUrl, {
        method: "POST",
        headers: {
          ...headers,
          "Idempotency-Key": replayKey,
        },
        body: JSON.stringify({
          ticker: args.ticker,
          amount: args.amount,
          replay: 1,
        }),
      })

      const observedSchema = extractSchemaVersion(tradePayload) ?? "unknown"
      if (!schemaVersion) {
        schemaVersion = observedSchema
      } else if (schemaVersion !== observedSchema) {
        throw new Error(`SCHEMA_VERSION_MISMATCH expected=${schemaVersion} actual=${observedSchema}`)
      }

      engineVersion = tradePayload?.proofBundle?.metadata?.determinism?.engine_version ?? tradePayload?.preview?.metadata?.determinism?.engine_version ?? engineVersion

      const tradeId = extractTradeId(tradePayload)
      if (!tradeId) {
        throw new Error("Missing tradeId in trade response; replay requires a persisted trade")
      }

      const replayUrl = `${args.baseUrl}/api/internal/ops/replay/${tradeId}`
      const replayPayload = await callJson(replayUrl, {
        method: "GET",
        headers,
      })

      const report = replayPayload?.report ?? replayPayload
      if (typeof report?.match !== "boolean") {
        throw new Error("Replay report missing boolean field: match")
      }

      total += 1
      if (report.match) {
        matches += 1
      } else {
        mismatches.push({
          i,
          tradeId,
          mismatchClassification: report.mismatchClassification ?? "unknown",
          diffs: Array.isArray(report.diffs) ? report.diffs : [],
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push({ i, replayKey, error: message })
      if (message.includes("SCHEMA_VERSION_MISMATCH")) {
        break
      }
    }
  }

  const matchRate = total > 0 ? matches / total : null
  const artifact = {
    version: "cp2-fixtures-v1",
    createdAtUtc: new Date().toISOString(),
    schema_version: schemaVersion ?? "unknown",
    engine_version: engineVersion ?? "unknown",
    count: total,
    matches,
    matchRate,
    failures,
    mismatches,
  }

  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8")

  const matchRateLabel = typeof matchRate === "number" ? matchRate.toFixed(4) : "NaN"
  console.log(`CP2 matchRate=${matchRateLabel} (${matches}/${total}) out=${outPath}`)

  const hasSchemaMismatch = failures.some((entry) => String(entry.error).includes("SCHEMA_VERSION_MISMATCH"))
  if (total === 0 || matchRate === null || hasSchemaMismatch || failures.length === args.count) {
    process.exitCode = 1
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
