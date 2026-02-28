/**
 * Tier-1 scanner universe — 25 highest-priority tickers from LIQUID_UNIVERSE.
 *
 * These are selected for:
 *  • Weekly expirations (critical for 3-21 DTE scanner)
 *  • Tight bid-ask spreads on OTM options (≤ 15% relative spread)
 *  • High OI (>1k on strikes within 10% ATM)
 *
 * The full 120-ticker LIQUID_UNIVERSE lives in lib/universe.ts.
 * TODO (P1): import from lib/universe.ts and filter to this tier.
 */

import { LIQUID_UNIVERSE } from "@/lib/universe"

// Priority tier-1 tickers for the scanner (subset of LIQUID_UNIVERSE)
const TIER_1_TICKERS = new Set([
  // Index ETFs
  "SPY", "QQQ", "IWM",
  // Mega-cap tech
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA",
  // Financials
  "JPM", "GS", "BAC",
  // Sector ETFs with weekly options
  "XLF", "XLK", "XLE", "XLV",
  // High-liquidity individual names
  "AMD", "INTC", "NFLX", "CRM",
  // Commodities / macro
  "GLD", "TLT",
  // Volatility adjacent
  "UVXY",
])

export const SCANNER_UNIVERSE = LIQUID_UNIVERSE.filter((u) =>
  TIER_1_TICKERS.has(u.ticker)
)

export const SCANNER_TICKERS = SCANNER_UNIVERSE.map((u) => u.ticker)

/**
 * Liquidity gates — applied before spread generation.
 * A contract must pass ALL gates to be used in a leg.
 */
export const LIQUIDITY_GATES = {
  minAvgVolume: 500_000,        // underlying shares/day
  minOpenInterest: 100,         // OI on the specific strike
  minContractVolume: 50,        // daily volume on the contract
  maxRelativeSpread: 0.15,      // (ask - bid) / mid ≤ 15%
  minMidPricePs: 0.05,          // mid price must be ≥ $0.05
} as const
