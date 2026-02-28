/**
 * Fixed liquid universe — Option A.
 *
 * 120 institutional-grade US equities + ETFs selected for:
 *   • Tight bid-ask spreads (< 0.05% typical)
 *   • High options open interest (> 10k OI on front month)
 *   • Consistent options markets (weekly expirations available)
 *   • Average daily volume > 5M shares
 *
 * Structure: { ticker, sector, description }
 * The scanner ranks candidates from THIS list — never from dynamic
 * "highest volume today" lookups, which create regime whiplash.
 */

export interface UniverseTicker {
  ticker: string
  sector: string
  description: string
}

export const LIQUID_UNIVERSE: UniverseTicker[] = [
  // ─── Index ETFs (highest priority — always in universe) ──────────────────
  { ticker: "SPY",  sector: "etf",         description: "S&P 500 ETF" },
  { ticker: "QQQ",  sector: "etf",         description: "Nasdaq 100 ETF" },
  { ticker: "IWM",  sector: "etf",         description: "Russell 2000 ETF" },
  { ticker: "DIA",  sector: "etf",         description: "Dow Jones ETF" },
  { ticker: "VIX",  sector: "volatility",  description: "CBOE Volatility Index" },
  { ticker: "GLD",  sector: "etf",         description: "Gold ETF" },
  { ticker: "TLT",  sector: "etf",         description: "20+ Year Treasury ETF" },
  { ticker: "XLF",  sector: "etf",         description: "Financials Sector ETF" },
  { ticker: "XLE",  sector: "etf",         description: "Energy Sector ETF" },
  { ticker: "XLK",  sector: "etf",         description: "Technology Sector ETF" },
  { ticker: "XLV",  sector: "etf",         description: "Health Care Sector ETF" },
  { ticker: "XLI",  sector: "etf",         description: "Industrials Sector ETF" },
  { ticker: "XLC",  sector: "etf",         description: "Communication Services ETF" },
  { ticker: "ARKK", sector: "etf",         description: "ARK Innovation ETF" },
  { ticker: "HYG",  sector: "etf",         description: "High Yield Corporate Bond ETF" },

  // ─── Mega-cap Technology ─────────────────────────────────────────────────
  { ticker: "AAPL", sector: "technology",  description: "Apple Inc" },
  { ticker: "MSFT", sector: "technology",  description: "Microsoft Corp" },
  { ticker: "NVDA", sector: "technology",  description: "NVIDIA Corp" },
  { ticker: "GOOGL",sector: "technology",  description: "Alphabet Inc Class A" },
  { ticker: "GOOG", sector: "technology",  description: "Alphabet Inc Class C" },
  { ticker: "META", sector: "technology",  description: "Meta Platforms" },
  { ticker: "AMZN", sector: "technology",  description: "Amazon.com" },
  { ticker: "TSLA", sector: "technology",  description: "Tesla Inc" },
  { ticker: "AMD",  sector: "technology",  description: "Advanced Micro Devices" },
  { ticker: "INTC", sector: "technology",  description: "Intel Corp" },
  { ticker: "AVGO", sector: "technology",  description: "Broadcom Inc" },
  { ticker: "QCOM", sector: "technology",  description: "Qualcomm Inc" },
  { ticker: "ORCL", sector: "technology",  description: "Oracle Corp" },
  { ticker: "CRM",  sector: "technology",  description: "Salesforce Inc" },
  { ticker: "ADBE", sector: "technology",  description: "Adobe Inc" },
  { ticker: "NFLX", sector: "technology",  description: "Netflix Inc" },
  { ticker: "NOW",  sector: "technology",  description: "ServiceNow Inc" },
  { ticker: "PANW", sector: "technology",  description: "Palo Alto Networks" },
  { ticker: "CRWD", sector: "technology",  description: "CrowdStrike Holdings" },
  { ticker: "SNOW", sector: "technology",  description: "Snowflake Inc" },
  { ticker: "PLTR", sector: "technology",  description: "Palantir Technologies" },
  { ticker: "SMCI", sector: "technology",  description: "Super Micro Computer" },
  { ticker: "MU",   sector: "technology",  description: "Micron Technology" },
  { ticker: "MRVL", sector: "technology",  description: "Marvell Technology" },
  { ticker: "ARM",  sector: "technology",  description: "Arm Holdings" },

  // ─── Financials ───────────────────────────────────────────────────────────
  { ticker: "JPM",  sector: "financials",  description: "JPMorgan Chase" },
  { ticker: "BAC",  sector: "financials",  description: "Bank of America" },
  { ticker: "GS",   sector: "financials",  description: "Goldman Sachs" },
  { ticker: "MS",   sector: "financials",  description: "Morgan Stanley" },
  { ticker: "BRK.B",sector: "financials",  description: "Berkshire Hathaway B" },
  { ticker: "V",    sector: "financials",  description: "Visa Inc" },
  { ticker: "MA",   sector: "financials",  description: "Mastercard Inc" },
  { ticker: "AXP",  sector: "financials",  description: "American Express" },
  { ticker: "C",    sector: "financials",  description: "Citigroup" },
  { ticker: "WFC",  sector: "financials",  description: "Wells Fargo" },
  { ticker: "COF",  sector: "financials",  description: "Capital One Financial" },
  { ticker: "PYPL", sector: "financials",  description: "PayPal Holdings" },
  { ticker: "SQ",   sector: "financials",  description: "Block Inc" },
  { ticker: "HOOD", sector: "financials",  description: "Robinhood Markets" },

  // ─── Healthcare & Biotech ─────────────────────────────────────────────────
  { ticker: "JNJ",  sector: "healthcare",  description: "Johnson & Johnson" },
  { ticker: "UNH",  sector: "healthcare",  description: "UnitedHealth Group" },
  { ticker: "LLY",  sector: "healthcare",  description: "Eli Lilly" },
  { ticker: "ABBV", sector: "healthcare",  description: "AbbVie Inc" },
  { ticker: "MRK",  sector: "healthcare",  description: "Merck & Co" },
  { ticker: "PFE",  sector: "healthcare",  description: "Pfizer Inc" },
  { ticker: "AMGN", sector: "healthcare",  description: "Amgen Inc" },
  { ticker: "GILD", sector: "healthcare",  description: "Gilead Sciences" },
  { ticker: "BMY",  sector: "healthcare",  description: "Bristol-Myers Squibb" },
  { ticker: "MRNA", sector: "healthcare",  description: "Moderna Inc" },
  { ticker: "BIIB", sector: "healthcare",  description: "Biogen Inc" },
  { ticker: "REGN", sector: "healthcare",  description: "Regeneron Pharma" },
  { ticker: "ISRG", sector: "healthcare",  description: "Intuitive Surgical" },

  // ─── Consumer ─────────────────────────────────────────────────────────────
  { ticker: "WMT",  sector: "consumer",    description: "Walmart Inc" },
  { ticker: "COST", sector: "consumer",    description: "Costco Wholesale" },
  { ticker: "TGT",  sector: "consumer",    description: "Target Corp" },
  { ticker: "HD",   sector: "consumer",    description: "Home Depot" },
  { ticker: "LOW",  sector: "consumer",    description: "Lowe's Companies" },
  { ticker: "MCD",  sector: "consumer",    description: "McDonald's Corp" },
  { ticker: "SBUX", sector: "consumer",    description: "Starbucks Corp" },
  { ticker: "NKE",  sector: "consumer",    description: "Nike Inc" },
  { ticker: "DIS",  sector: "consumer",    description: "Walt Disney Co" },
  { ticker: "ABNB", sector: "consumer",    description: "Airbnb Inc" },
  { ticker: "BKNG", sector: "consumer",    description: "Booking Holdings" },
  { ticker: "LYFT", sector: "consumer",    description: "Lyft Inc" },
  { ticker: "UBER", sector: "consumer",    description: "Uber Technologies" },

  // ─── Energy ───────────────────────────────────────────────────────────────
  { ticker: "XOM",  sector: "energy",      description: "Exxon Mobil" },
  { ticker: "CVX",  sector: "energy",      description: "Chevron Corp" },
  { ticker: "COP",  sector: "energy",      description: "ConocoPhillips" },
  { ticker: "OXY",  sector: "energy",      description: "Occidental Petroleum" },
  { ticker: "SLB",  sector: "energy",      description: "SLB (Schlumberger)" },

  // ─── Industrials & Defense ────────────────────────────────────────────────
  { ticker: "CAT",  sector: "industrials", description: "Caterpillar Inc" },
  { ticker: "DE",   sector: "industrials", description: "Deere & Company" },
  { ticker: "GE",   sector: "industrials", description: "GE Aerospace" },
  { ticker: "RTX",  sector: "industrials", description: "RTX Corp" },
  { ticker: "LMT",  sector: "industrials", description: "Lockheed Martin" },
  { ticker: "BA",   sector: "industrials", description: "Boeing Co" },
  { ticker: "HON",  sector: "industrials", description: "Honeywell International" },
  { ticker: "UPS",  sector: "industrials", description: "United Parcel Service" },
  { ticker: "FDX",  sector: "industrials", description: "FedEx Corp" },

  // ─── Communication Services ───────────────────────────────────────────────
  { ticker: "T",    sector: "telecom",     description: "AT&T Inc" },
  { ticker: "VZ",   sector: "telecom",     description: "Verizon Communications" },
  { ticker: "TMUS", sector: "telecom",     description: "T-Mobile US" },
  { ticker: "SPOT", sector: "telecom",     description: "Spotify Technology" },
  { ticker: "PINS", sector: "telecom",     description: "Pinterest Inc" },
  { ticker: "SNAP", sector: "telecom",     description: "Snap Inc" },
  { ticker: "X",    sector: "telecom",     description: "X Corp / Twitter" },

  // ─── Materials & Commodities ──────────────────────────────────────────────
  { ticker: "FCX",  sector: "materials",   description: "Freeport-McMoRan" },
  { ticker: "NEM",  sector: "materials",   description: "Newmont Corp" },
  { ticker: "AA",   sector: "materials",   description: "Alcoa Corp" },
  { ticker: "CLF",  sector: "materials",   description: "Cleveland-Cliffs" },

  // ─── Real Estate ──────────────────────────────────────────────────────────
  { ticker: "AMT",  sector: "realestate",  description: "American Tower REIT" },
  { ticker: "PLD",  sector: "realestate",  description: "Prologis Inc" },
  { ticker: "SPG",  sector: "realestate",  description: "Simon Property Group" },

  // ─── Crypto-adjacent ──────────────────────────────────────────────────────
  { ticker: "COIN", sector: "crypto",      description: "Coinbase Global" },
  { ticker: "MSTR", sector: "crypto",      description: "MicroStrategy (BTC proxy)" },
  { ticker: "IBIT", sector: "crypto",      description: "iShares Bitcoin Trust ETF" },
  { ticker: "MARA", sector: "crypto",      description: "MARA Holdings (miner)" },
  { ticker: "RIOT", sector: "crypto",      description: "Riot Platforms (miner)" },
]

/** All tickers as a flat Set for O(1) membership checks */
export const UNIVERSE_SET: Set<string> = new Set(
  LIQUID_UNIVERSE.map((u) => u.ticker)
)

/** Filter the universe to a specific sector */
export function universeBy(sector: string): UniverseTicker[] {
  return LIQUID_UNIVERSE.filter((u) => u.sector === sector)
}

/** ETF tickers — always scanned first (most liquid, widest options market) */
export const ETF_TICKERS: string[] = LIQUID_UNIVERSE
  .filter((u) => u.sector === "etf")
  .map((u) => u.ticker)

/** High-priority canary tickers for health probes */
export const HEALTH_PROBE_TICKERS = ["SPY", "QQQ", "NVDA"]
