#!/usr/bin/env node
/**
 * calibration-check.mjs
 *
 * CP3 acceptance validator.  Reads a calibration JSON artifact and verifies
 * that it meets CP3 structural and health requirements.
 *
 * Exit codes:
 *   0 — all checks passed (drift OK or WARN)
 *   1 — structural checks failed (artifact malformed)
 *   2 — drift ALERT (calibration degraded)
 *
 * Usage:
 *   pnpm calibration:check artifacts/calibration.latest.json
 *   pnpm calibration:check artifacts/calibration.2026-03-01.json
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const filePath = process.argv[2]
if (!filePath) {
  console.error("Usage: calibration-check.mjs <path-to-artifact>")
  process.exit(1)
}

let report
try {
  report = JSON.parse(readFileSync(resolve(process.cwd(), filePath), "utf8"))
} catch (err) {
  console.error(`Failed to read artifact: ${err.message}`)
  process.exit(1)
}

// ─── Structural checks ────────────────────────────────────────────────────────

const checks = []

function check(name, pass, detail = "") {
  checks.push({ name, pass, detail })
}

// 1. ECE present and numeric
check(
  "ece present and numeric",
  typeof report.ece === "number" && !isNaN(report.ece),
  `ece = ${report.ece}`
)

// 2. bins[] present and non-empty (or sample too small)
check(
  "bins[] present",
  Array.isArray(report.bins),
  `bins.length = ${report.bins?.length}`
)

if (Array.isArray(report.bins) && report.bins.length > 0) {
  const bin = report.bins[0]
  check(
    "bin has predicted, actual, count",
    typeof bin.predicted === "number" && typeof bin.actual === "number" && typeof bin.count === "number",
    JSON.stringify(bin)
  )
}

// 3. drift classification present
check(
  "drift classification present (OK|WARN|ALERT)",
  ["OK", "WARN", "ALERT"].includes(report.drift),
  `drift = ${report.drift}`
)

// 4. selectivity curve present
check(
  "selectivity[] present",
  Array.isArray(report.selectivity) && report.selectivity.length > 0,
  `selectivity.length = ${report.selectivity?.length}`
)

if (Array.isArray(report.selectivity) && report.selectivity.length > 0) {
  const top = report.selectivity[0]
  check(
    "selectivity top bucket has winRate",
    typeof top.winRate === "number",
    `top10 winRate = ${top.winRate}`
  )
}

// 5. recommendedThresholds present
check(
  "recommendedThresholds present",
  report.recommendedThresholds &&
    ["RAISE", "LOWER", "HOLD"].includes(report.recommendedThresholds.action),
  `action = ${report.recommendedThresholds?.action}`
)

check(
  "minConfidenceToExecute is numeric",
  typeof report.recommendedThresholds?.minConfidenceToExecute === "number",
  `value = ${report.recommendedThresholds?.minConfidenceToExecute}`
)

// 6. evAlignment present
check(
  "evAlignment present",
  report.evAlignment && typeof report.evAlignment.alignmentRatio === "number",
  `alignmentRatio = ${report.evAlignment?.alignmentRatio}`
)

// 7. sampleSize present
check(
  "sampleSize present",
  typeof report.sampleSize === "number",
  `sampleSize = ${report.sampleSize}`
)

// ─── Report ───────────────────────────────────────────────────────────────────

let allPass = true
for (const c of checks) {
  if (c.pass) {
    console.log(`  ✓ ${c.name}${c.detail ? `  (${c.detail})` : ""}`)
  } else {
    console.error(`  ✗ ${c.name}${c.detail ? `  (${c.detail})` : ""}`)
    allPass = false
  }
}

console.log("")
console.log(`Artifact: ${filePath}`)
console.log(`Generated: ${report.generatedAt ?? "unknown"}`)
console.log(`Sample size: ${report.sampleSize}`)
console.log(`ECE: ${report.ece}`)
console.log(`Brier score: ${report.brierScore}`)
console.log(`Drift: ${report.drift}`)
console.log(`Recommended: ${report.recommendedThresholds?.action} @ ${report.recommendedThresholds?.minConfidenceToExecute}`)

if (!allPass) {
  console.error("\nCalibration check FAILED: artifact is structurally malformed.")
  process.exit(1)
}

if (report.drift === "ALERT") {
  console.warn("\nDrift ALERT: calibration has degraded. Review and approve threshold changes before continuing.")
  process.exit(2)
}

console.log("\nCalibration check PASSED.")
