/**
 * TruthSerum — Real Implementation
 * Capital War Room | Risk Division
 *
 * Validates every trade signal before it exits Risk Division.
 * Fail-closed: any check failure = FAIL verdict. UNKNOWN = FAIL.
 *
 * Rules:
 *   1. Blocked data sources (Yahoo Finance) → immediate FAIL
 *   2. Stale quote (> maxQuoteAgeMs) → FAIL
 *   3. Halal mode + no halal verdict → FAIL
 *   4. Halal mode + HARAM verdict → FAIL
 *   5. Deliberation consensus below threshold → FAIL (simulate/execute only)
 *   6. Trust score below minimum → FAIL (simulate/execute only)
 *   7. All checks pass → PASS
 */

import { createHash } from "crypto"
import type {
  TruthSerumInput,
  TruthSerumResult,
  TruthSerumConfig,
} from "./types"
import { DEFAULT_TRUTHSERUM_CONFIG } from "./types"

export function validateWithTruthSerum(
  input: TruthSerumInput,
  config: Partial<TruthSerumConfig> = {}
): TruthSerumResult {
  const cfg: TruthSerumConfig = { ...DEFAULT_TRUTHSERUM_CONFIG, ...config }
  const failReasons: string[] = []
  const warnings: string[] = []
  const now = Date.now()

  // ── Rule 1: Blocked data source ──────────────────────────────────────────
  if ((cfg.blockedSources as string[]).includes(input.dataSource)) {
    failReasons.push(
      `UNTRUSTED_DATA_SOURCE: "${input.dataSource}" is blocked. Use POLYGON_REALTIME or ALPACA_FEED.`
    )
  }

  // ── Rule 2: Quote freshness ───────────────────────────────────────────────
  const quoteAge = now - new Date(input.quoteTimestamp).getTime()
  if (isNaN(quoteAge)) {
    failReasons.push(`INVALID_TIMESTAMP: quoteTimestamp "${input.quoteTimestamp}" is not a valid ISO 8601 date.`)
  } else if (quoteAge > cfg.maxQuoteAgeMs) {
    failReasons.push(
      `STALE_QUOTE: Quote is ${Math.round(quoteAge / 1000)}s old. Maximum allowed: ${cfg.maxQuoteAgeMs / 1000}s.`
    )
  } else if (quoteAge > cfg.maxQuoteAgeMs * 0.8) {
    warnings.push(`Quote age ${Math.round(quoteAge / 1000)}s — approaching staleness threshold.`)
  }

  // ── Rule 3 & 4: Halal gate ────────────────────────────────────────────────
  if (input.halalMode) {
    if (!input.halalVerdict || input.halalVerdict === "UNKNOWN") {
      failReasons.push("HALAL_VERDICT_MISSING: Halal mode is active but no halal verdict was provided. Fail-closed.")
    } else if (input.halalVerdict === "HARAM") {
      failReasons.push(`HARAM_TICKER: "${input.ticker}" has been screened as HARAM. Trade blocked.`)
    }
  }

  // ── Rules 5 & 6: Deliberation + trust score (simulate/execute only) ───────
  if (input.action !== "preview") {
    if (input.deliberationConsensus === undefined || input.deliberationConsensus === null) {
      failReasons.push("MISSING_CONSENSUS: deliberationConsensus is required for simulate/execute actions.")
    } else if (input.deliberationConsensus < cfg.minDeliberationConsensus) {
      failReasons.push(
        `LOW_CONSENSUS: Deliberation consensus ${(input.deliberationConsensus * 100).toFixed(1)}% is below minimum ${(cfg.minDeliberationConsensus * 100).toFixed(1)}%.`
      )
    }

    if (input.trustScore === undefined || input.trustScore === null) {
      failReasons.push("MISSING_TRUST_SCORE: trustScore is required for simulate/execute actions.")
    } else if (input.trustScore < cfg.minTrustScore) {
      failReasons.push(
        `LOW_TRUST_SCORE: Trust score ${input.trustScore} is below minimum ${cfg.minTrustScore}.`
      )
    }
  }

  // ── Receipt hash ──────────────────────────────────────────────────────────
  const canonical = JSON.stringify({
    ticker: input.ticker,
    dataSource: input.dataSource,
    quoteTimestamp: input.quoteTimestamp,
    engineVersion: input.engineVersion,
    requestId: input.requestId,
    halalMode: input.halalMode,
    halalVerdict: input.halalVerdict ?? null,
    deliberationConsensus: input.deliberationConsensus ?? null,
    action: input.action,
    trustScore: input.trustScore ?? null,
  })

  const receiptHash = createHash("sha256").update(canonical).digest("hex")

  const verdict = failReasons.length === 0 ? "PASS" : "FAIL"

  return {
    verdict,
    receiptHash,
    timestamp: new Date().toISOString(),
    failReasons,
    warnings,
    inputSnapshot: { ...input },
  }
}
