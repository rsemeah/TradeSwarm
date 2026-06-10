/**
 * TruthSerum — Types & Configuration
 * Capital War Room | Risk Division
 *
 * All trade signals must pass TruthSerum validation before exiting Risk Division.
 * Fail-closed: UNKNOWN verdict = FAIL. No exceptions.
 */

export type TruthSerumVerdict = "PASS" | "FAIL" | "UNKNOWN"

export type DataSourceTag =
  | "POLYGON_REALTIME"
  | "POLYGON_DELAYED"
  | "ALPACA_FEED"
  | "COINBASE_FEED"
  | "CCXT_FEED"
  | "YAHOO_FINANCE"       // BLOCKED — TruthSerum rejects this source
  | "MANUAL_OVERRIDE"
  | "SYNTHETIC_TEST"

export interface TruthSerumInput {
  ticker: string
  dataSource: DataSourceTag
  quoteTimestamp: string           // ISO 8601
  engineVersion: string
  requestId: string
  halalMode: boolean
  halalVerdict?: "HALAL" | "HARAM" | "UNKNOWN"
  deliberationConsensus?: number   // 0–1, required if action !== "preview"
  action: "preview" | "simulate" | "execute"
  trustScore?: number              // 0–100 from orchestrator scoring
}

export interface TruthSerumResult {
  verdict: TruthSerumVerdict
  receiptHash: string              // SHA-256 of canonical input
  timestamp: string                // ISO 8601
  failReasons: string[]            // empty if PASS
  warnings: string[]               // non-blocking observations
  inputSnapshot: TruthSerumInput   // immutable copy for audit trail
}

export interface TruthSerumConfig {
  maxQuoteAgeMs: number            // default: 300_000 (5 min)
  minDeliberationConsensus: number // default: 0.60
  minTrustScore: number            // default: 40
  blockedSources: DataSourceTag[]  // default: ["YAHOO_FINANCE"]
  requireHalalVerdict: boolean     // default: false (true when halalMode=true)
}

export const DEFAULT_TRUTHSERUM_CONFIG: TruthSerumConfig = {
  maxQuoteAgeMs: 300_000,
  minDeliberationConsensus: 0.60,
  minTrustScore: 40,
  blockedSources: ["YAHOO_FINANCE"],
  requireHalalVerdict: false,
}
