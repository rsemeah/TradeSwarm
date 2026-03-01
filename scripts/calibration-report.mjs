#!/usr/bin/env node
/**
 * calibration-report.mjs
 *
 * CP3 standalone calibration report generator.
 * Connects directly to Supabase, computes the CP3 report, and writes a JSON
 * artifact.  Does NOT require the Next.js server to be running.
 *
 * Usage:
 *   pnpm calibration:report
 *   pnpm calibration:report --window 200 --out artifacts/calibration.latest.json
 *
 * Required env vars (from .env.local or environment):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js"
import { writeFileSync, mkdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// ─── Parse CLI args ───────────────────────────────────────────────────────────

const args = process.argv.slice(2)
function arg(name, fallback) {
  const idx = args.indexOf(`--${name}`)
  return idx !== -1 ? args[idx + 1] : fallback
}

const windowDays = Math.min(365, Math.max(10, Number(arg("window", "200"))))
const outPath = resolve(process.cwd(), arg("out", `artifacts/calibration.${new Date().toISOString().slice(0, 10)}.json`))

// ─── Load env (support .env.local for local runs) ────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, "../.env.local")
try {
  const { readFileSync } = await import("node:fs")
  const lines = readFileSync(envPath, "utf8").split("\n")
  for (const line of lines) {
    const [key, ...rest] = line.split("=")
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join("=").replace(/^["']|["']$/g, "").trim()
    }
  }
} catch {
  // .env.local not present — rely on shell environment
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
  process.exit(1)
}

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})

// ─── Compute CP3 metrics ──────────────────────────────────────────────────────

const ECE_WARN = 0.05
const ECE_ALERT = 0.10
const SELECTIVITY_PERCENTILES = [10, 25, 50, 75, 100]

function boundedBucket(prob) {
  const lower = Math.floor(prob * 10) * 10
  const upper = Math.min(lower + 10, 100)
  return { lower, upper, range: `${lower}-${upper}%` }
}

function computeEceBins(rows) {
  const total = rows.length
  if (!total) return { ece: 0, bins: [] }

  const grouped = new Map()
  for (const row of rows) {
    const { lower, upper, range } = boundedBucket(row.predicted_probability)
    const entry = grouped.get(range) ?? { lower, upper, predicted: 0, actual: 0, count: 0 }
    entry.predicted += row.predicted_probability
    entry.actual += row.realized_outcome
    entry.count += 1
    grouped.set(range, entry)
  }

  let ece = 0
  const bins = []
  for (const [range, data] of grouped) {
    const avgPredicted = data.predicted / data.count
    const avgActual = data.actual / data.count
    const weight = data.count / total
    const contribution = weight * Math.abs(avgPredicted - avgActual)
    ece += contribution
    bins.push({
      range,
      lowerBound: data.lower / 100,
      upperBound: data.upper / 100,
      predicted: Math.round(avgPredicted * 1e5) / 1e5,
      actual: Math.round(avgActual * 1e5) / 1e5,
      count: data.count,
      contribution: Math.round(contribution * 1e5) / 1e5,
    })
  }

  bins.sort((a, b) => a.lowerBound - b.lowerBound)
  return { ece: Math.round(ece * 1e6) / 1e6, bins }
}

function computeSelectivity(rows) {
  if (!rows.length) return []
  const sorted = [...rows].sort((a, b) => b.predicted_probability - a.predicted_probability)
  const total = sorted.length
  return SELECTIVITY_PERCENTILES.map((pct) => {
    const cutoff = Math.max(1, Math.round((pct / 100) * total))
    const slice = sorted.slice(0, cutoff)
    const wins = slice.reduce((acc, r) => acc + r.realized_outcome, 0)
    return { topPct: pct, winRate: Math.round((wins / slice.length) * 1e4) / 1e4, count: slice.length }
  })
}

function computeEvAlignment(tv2Rows) {
  const rows = tv2Rows.filter(
    (r) => r.confidence_at_entry != null && r.credit_received != null && r.max_risk != null && r.realized_pnl != null
  )
  if (!rows.length) return { expectedEV: 0, realizedEV: 0, alignmentRatio: 1, sampleSize: 0 }
  const expectedEV = rows.reduce((acc, r) => acc + r.confidence_at_entry * r.credit_received - (1 - r.confidence_at_entry) * r.max_risk, 0)
  const realizedEV = rows.reduce((acc, r) => acc + r.realized_pnl, 0)
  const alignmentRatio = expectedEV === 0 ? 1 : Math.round((realizedEV / expectedEV) * 1e4) / 1e4
  return {
    expectedEV: Math.round(expectedEV * 100) / 100,
    realizedEV: Math.round(realizedEV * 100) / 100,
    alignmentRatio,
    sampleSize: rows.length,
  }
}

function classifyDrift(ece) {
  if (ece >= ECE_ALERT) return "ALERT"
  if (ece >= ECE_WARN) return "WARN"
  return "OK"
}

function recommendThresholds(drift, ece, currentMin) {
  if (drift === "ALERT") {
    return {
      minConfidenceToExecute: Math.min(0.85, Math.round((currentMin + 0.10) * 100) / 100),
      action: "RAISE",
      reason: `ECE ${(ece * 100).toFixed(1)}% exceeds alert threshold — raise confidence floor`,
    }
  }
  if (drift === "WARN") {
    return {
      minConfidenceToExecute: Math.min(0.85, Math.round((currentMin + 0.05) * 100) / 100),
      action: "RAISE",
      reason: `ECE ${(ece * 100).toFixed(1)}% in warning zone — minor raise recommended`,
    }
  }
  return {
    minConfidenceToExecute: currentMin,
    action: "HOLD",
    reason: `ECE ${(ece * 100).toFixed(1)}% within tolerance — no change needed`,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const since = new Date()
since.setDate(since.getDate() - windowDays)

console.log(`[cp3] Pulling calibration data: last ${windowDays} days since ${since.toISOString().slice(0, 10)}`)

const [{ data: datasetRows, error: dsErr }, { data: tv2Rows, error: tv2Err }, { data: policyRow }] =
  await Promise.all([
    supabase
      .from("model_calibration_datasets")
      .select("predicted_probability,realized_outcome")
      .gte("observed_at", since.toISOString()),
    supabase
      .from("trades_v2")
      .select("confidence_at_entry,credit_received,max_risk,realized_pnl")
      .neq("outcome", "open")
      .not("outcome", "is", null)
      .gte("created_at", since.toISOString()),
    supabase
      .from("calibration_policy")
      .select("min_confidence_to_execute")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

if (dsErr) { console.error("Dataset query failed:", dsErr); process.exit(1) }
if (tv2Err) { console.error("trades_v2 query failed:", tv2Err); process.exit(1) }

const rows = datasetRows ?? []
const tv2 = tv2Rows ?? []
const currentMin = Number(policyRow?.min_confidence_to_execute ?? 0.55)

console.log(`[cp3] ${rows.length} calibration rows, ${tv2.length} closed trades_v2 rows`)

const { ece, bins } = computeEceBins(rows)
const selectivity = computeSelectivity(rows)
const evAlignment = computeEvAlignment(tv2)
const drift = classifyDrift(ece)
const recommendedThresholds = recommendThresholds(drift, ece, currentMin)

const brierScore =
  rows.length === 0
    ? 0
    : Math.round(
        (rows.reduce((acc, r) => acc + (r.predicted_probability - r.realized_outcome) ** 2, 0) / rows.length) * 1e6
      ) / 1e6

const report = {
  generatedAt: new Date().toISOString(),
  windowDays,
  sampleSize: rows.length,
  ece,
  brierScore,
  drift,
  bins,
  selectivity,
  evAlignment,
  recommendedThresholds,
}

// ─── Write artifact ───────────────────────────────────────────────────────────

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(report, null, 2))

console.log(`[cp3] Report written to ${outPath}`)
console.log(`[cp3] ECE: ${ece} | Brier: ${brierScore} | Drift: ${drift} | Samples: ${rows.length}`)
console.log(`[cp3] Recommended: ${recommendedThresholds.action} — ${recommendedThresholds.reason}`)

if (drift === "ALERT") {
  console.warn("[cp3] WARNING: DRIFT ALERT — calibration degraded beyond threshold")
  process.exit(2)
}
