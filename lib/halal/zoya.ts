/**
 * lib/halal/zoya.ts
 * Zoya GraphQL API client — AAOIFI halal compliance screening.
 *
 * ✅ SCHEMA STATUS: VERIFIED 2026-06-13
 * Verified against: https://developer.zoya.finance/docs
 * Confirmed: query structure, all field names, auth header, endpoint URLs.
 *
 * Auth:     Authorization: <api-key>   (no "Bearer " prefix — confirmed from explorer)
 * Live:     https://api.zoya.finance/graphql
 * Sandbox:  https://sandbox-api.zoya.finance/graphql
 *
 * Methodology: AAOIFI only (Zoya does not support DJIM at time of verification).
 * TradeSwarm docs previously claimed DJIM — corrected in ZOYA_METHODOLOGY_DISCLOSURE.md.
 * AAOIFI uses debt/market_cap denominator (not total_assets like pure DJIM).
 *
 * API Tiers:
 * - Basic (free/sandbox): symbol, name, exchange, status, reportDate only. US stocks only.
 * - Advanced (paid): full financial ratios + global coverage. Required for H1-H4 breakdown.
 *
 * Gate mapping (AAOIFI via Zoya):
 * - H1 sector:   businessScreen field (COMPLIANT = no haram sector)
 * - H1 revenue:  nonCompliantRevenue < 5% (returned as 0-100 float, e.g. 0.27 = 0.27%)
 * - H2 debt:     debtToMarketCapRatio < 0.33 (on AAOIFIReport fragment)
 * - H3 assets:   securitiesToMarketCapRatio < 0.49 (on AAOIFIReport fragment)
 * - H4 interest: NO SEPARATE FIELD — financialScreen is the combined H2+H3+H4 verdict.
 *                Cannot isolate H4 interest income ratio from Zoya API. Disclosed in docs.
 *
 * Cache: Zoya results cached in halal_verdicts via route layer.
 * TTL: COMPLIANT=1h | NON_COMPLIANT=7d | QUESTIONABLE/UNKNOWN=30min
 *
 * Circuit breaker: in-process, resets after CIRCUIT_RESET_MS.
 */

const ZOYA_LIVE_ENDPOINT     = "https://api.zoya.finance/graphql"
const ZOYA_SANDBOX_ENDPOINT  = "https://sandbox-api.zoya.finance/graphql"

// Use sandbox if ZOYA_SANDBOX=true or no live key available
function getEndpoint(): string {
  if (process.env.ZOYA_SANDBOX === "true") return ZOYA_SANDBOX_ENDPOINT
  return process.env.ZOYA_ENDPOINT ?? ZOYA_LIVE_ENDPOINT
}

const ZOYA_TIMEOUT_MS     = 8_000
const ZOYA_MAX_FAILURES   = 3
const CIRCUIT_RESET_MS    = 60_000  // 1 min before retrying after 3 failures

// ─── Circuit breaker (module-level, in-process) ──────────────────────────────

let _failures         = 0
let _circuitOpenSince: number | null = null

function isCircuitOpen(): boolean {
  if (_circuitOpenSince === null) return false
  if (Date.now() - _circuitOpenSince > CIRCUIT_RESET_MS) {
    _failures         = 0
    _circuitOpenSince = null
    return false
  }
  return true
}

function recordFailure() {
  _failures++
  if (_failures >= ZOYA_MAX_FAILURES) _circuitOpenSince = Date.now()
}

function recordSuccess() {
  _failures         = 0
  _circuitOpenSince = null
}

// ─── Response types (VERIFIED against Zoya docs 2026-06-13) ──────────────────

/** ComplianceStatus enum — confirmed values from Zoya API */
export type ZoyaComplianceStatus = "COMPLIANT" | "NON_COMPLIANT" | "QUESTIONABLE" | "UNKNOWN"

/**
 * Response from advancedCompliance.report (AAOIFI methodology).
 * Base fields always present; AAOIFI-specific fields present when methodology=AAOIFI.
 * Requires Advanced API plan (paid). Returns null if ticker not in Zoya universe.
 */
export interface ZoyaAdvancedReport {
  // Base fields — AdvancedComplianceReport interface
  symbol:              string
  rawSymbol:           string
  name:                string
  figi:                string | null
  exchange:            string
  status:              ZoyaComplianceStatus    // overall verdict
  reportDate:          string                  // ISO 8601
  businessScreen:      ZoyaComplianceStatus    // H1 sector verdict
  financialScreen:     ZoyaComplianceStatus    // H2+H3+H4 combined — no isolation possible
  compliantRevenue:    number                  // 0-100 float (e.g., 99.72 = 99.72% halal)
  nonCompliantRevenue: number                  // 0-100 float — H1 revenue gate value
  questionableRevenue: number                  // 0-100 float

  // AAOIFI-specific fields — present via "... on AAOIFIReport" fragment
  debtToMarketCapRatio:        number          // H2: AAOIFI threshold < 0.33
  securitiesToMarketCapRatio:  number          // H3: threshold < 0.49
  // NOTE: H4 (interest income ratio) is NOT a separate field in Zoya API.
  // financialScreen is the composite H2+H3+H4 verdict from Zoya.
}

/**
 * Response from basicCompliance.report.
 * Free tier — sandbox available. US stocks only.
 * No financial ratios. Status verdict only.
 */
export interface ZoyaBasicReport {
  symbol:     string
  name:       string
  exchange:   string
  status:     ZoyaComplianceStatus
  reportDate: string
}

export type ZoyaSource =
  | "zoya_advanced_live"
  | "zoya_basic_live"
  | "circuit_open"
  | "key_missing"
  | "timeout"
  | "http_error"
  | "graphql_error"
  | "no_data"
  | "network_error"
  | "plan_insufficient"  // advanced query but only basic plan key

export interface ZoyaResult {
  ok:     boolean
  data:   ZoyaAdvancedReport | null
  basic:  ZoyaBasicReport | null    // populated when advanced plan unavailable
  error:  string | null
  source: ZoyaSource
}

// ─── GraphQL queries (VERIFIED 2026-06-13) ────────────────────────────────────

/**
 * Advanced compliance query — requires paid Advanced plan.
 * Input: { symbol: String!, methodology: ScreeningMethodology! }
 * ScreeningMethodology enum: AAOIFI (only value currently supported by Zoya)
 */
const ADVANCED_COMPLIANCE_QUERY = `
  query GetAdvancedReport($symbol: String!) {
    advancedCompliance {
      report(input: { symbol: $symbol, methodology: AAOIFI }) {
        symbol
        rawSymbol
        name
        figi
        exchange
        status
        reportDate
        businessScreen
        financialScreen
        compliantRevenue
        nonCompliantRevenue
        questionableRevenue
        ... on AAOIFIReport {
          debtToMarketCapRatio
          securitiesToMarketCapRatio
        }
      }
    }
  }
`

/**
 * Basic compliance query — free tier, sandbox available, US stocks only.
 * Falls back to this when advanced plan is not available or key is sandbox-only.
 */
const BASIC_COMPLIANCE_QUERY = `
  query GetReport($symbol: String!) {
    basicCompliance {
      report(symbol: $symbol) {
        symbol
        name
        exchange
        status
        reportDate
      }
    }
  }
`

// ─── Client ────────────────────────────────────────────────────────────────────

/**
 * Fetch full AAOIFI compliance report for a ticker.
 * Tries Advanced plan first; falls back to Basic on plan errors.
 * Returns ZoyaResult.data for Advanced, ZoyaResult.basic for Basic fallback.
 */
export async function fetchZoyaCompliance(ticker: string): Promise<ZoyaResult> {
  const apiKey = process.env.ZOYA_API_KEY

  if (!apiKey) {
    return { ok: false, data: null, basic: null, error: "ZOYA_API_KEY not set", source: "key_missing" }
  }

  if (isCircuitOpen()) {
    const msRemaining = CIRCUIT_RESET_MS - (Date.now() - (_circuitOpenSince ?? Date.now()))
    return {
      ok:    false,
      data:  null,
      basic: null,
      error: `zoya_circuit_open — failing fast (resets in ${Math.round(msRemaining / 1000)}s)`,
      source: "circuit_open",
    }
  }

  const endpoint = getEndpoint()

  // Try advanced plan first
  const advancedResult = await _executeQuery<{ advancedCompliance: { report: ZoyaAdvancedReport | null } }>(
    endpoint,
    apiKey,
    ADVANCED_COMPLIANCE_QUERY,
    { symbol: ticker.toUpperCase() }
  )

  if (advancedResult.ok && advancedResult.json) {
    const report = advancedResult.json.data?.advancedCompliance?.report
    if (!report) {
      return { ok: false, data: null, basic: null, error: "zoya_no_data — ticker not in Zoya universe", source: "no_data" }
    }
    recordSuccess()
    return { ok: true, data: report, basic: null, error: null, source: "zoya_advanced_live" }
  }

  // If advanced query fails with a plan/authorization error, try basic fallback
  if (advancedResult.planInsufficient) {
    const basicResult = await _executeQuery<{ basicCompliance: { report: ZoyaBasicReport | null } }>(
      endpoint,
      apiKey,
      BASIC_COMPLIANCE_QUERY,
      { symbol: ticker.toUpperCase() }
    )

    if (basicResult.ok && basicResult.json) {
      const report = basicResult.json.data?.basicCompliance?.report
      if (!report) {
        return { ok: false, data: null, basic: null, error: "zoya_no_data — ticker not in Zoya universe", source: "no_data" }
      }
      recordSuccess()
      return { ok: true, data: null, basic: report, error: null, source: "zoya_basic_live" }
    }

    return {
      ok:    false,
      data:  null,
      basic: null,
      error: basicResult.error ?? "zoya_basic_query_failed",
      source: basicResult.source ?? "http_error",
    }
  }

  // Hard failure — circuit breaker logic
  if (advancedResult.shouldTripCircuit) recordFailure()

  return {
    ok:    false,
    data:  null,
    basic: null,
    error: advancedResult.error ?? "zoya_unknown_error",
    source: advancedResult.source ?? "http_error",
  }
}

// ─── Internal query executor ──────────────────────────────────────────────────

interface QueryResult<T> {
  ok:               boolean
  json?:            { data: T }
  error?:           string
  source?:          ZoyaSource
  planInsufficient: boolean
  shouldTripCircuit: boolean
}

async function _executeQuery<T>(
  endpoint:  string,
  apiKey:    string,
  query:     string,
  variables: Record<string, unknown>
): Promise<QueryResult<T>> {
  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), ZOYA_TIMEOUT_MS)

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey,   // ✅ VERIFIED: no "Bearer" prefix, key value directly
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    })

    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After")
      return {
        ok: false,
        error: `zoya_rate_limited${retryAfter ? ` — retry after ${retryAfter}s` : ""}`,
        source: "http_error",
        planInsufficient: false,
        shouldTripCircuit: true,
      }
    }

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error: `zoya_auth_${res.status} — check API key or plan tier`,
        source: "http_error",
        planInsufficient: true,   // may indicate basic-only key
        shouldTripCircuit: false,
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        error: `zoya_http_${res.status}`,
        source: "http_error",
        planInsufficient: false,
        shouldTripCircuit: true,
      }
    }

    const json = await res.json()

    if (json.errors?.length) {
      const firstMsg = (json.errors[0]?.message ?? "") as string
      // GraphQL "not authorized" or "field does not exist" suggests plan mismatch
      const planError = /not authorized|field.*exist|cannot query/i.test(firstMsg)
      return {
        ok: false,
        error: `zoya_graphql_error: ${firstMsg}`,
        source: "graphql_error",
        planInsufficient: planError,
        shouldTripCircuit: !planError,  // infra errors trip circuit; schema errors don't
      }
    }

    return { ok: true, json: json as { data: T }, planInsufficient: false, shouldTripCircuit: false }

  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError"
    return {
      ok: false,
      error: isAbort ? "zoya_timeout" : (err instanceof Error ? err.message : "zoya_network_error"),
      source: isAbort ? "timeout" : "network_error",
      planInsufficient: false,
      shouldTripCircuit: !isAbort,
    }
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

/**
 * Blocked sector patterns — matched against Zoya businessScreen status.
 * Note: Zoya returns a ComplianceStatus for businessScreen, NOT a sector string.
 * Sector-level detail (e.g. "Financial Services") is NOT returned by the API.
 * isSectorBlocked() is therefore not useful against Zoya data — use businessScreen directly.
 *
 * This function is kept for potential future use with other data sources.
 */
export function isSectorBlocked(sectorString: string | null): boolean {
  if (!sectorString) return false
  const HARAM_SECTOR_PATTERNS = [
    "alcohol", "beer", "wine", "spirit", "liquor", "distill",
    "tobacco", "cigarette",
    "gambling", "casino", "betting", "lottery",
    "weapon", "defense contractor", "ammunition", "firearm",
    "adult entertainment", "pornograph",
    "bank", "financial service", "insurance", "interest-based", "riba",
    "pork", "swine",
  ]
  const lower = sectorString.toLowerCase()
  return HARAM_SECTOR_PATTERNS.some(p => lower.includes(p))
}

/**
 * Map verified ZoyaAdvancedReport to TradeSwarm H1-H4 screening fields.
 *
 * METHODOLOGY (VERIFIED 2026-06-13):
 * - H1 sector:   Zoya returns businessScreen (ComplianceStatus). COMPLIANT = no haram sector.
 *                Zoya does NOT return a raw sector/industry string in the report query.
 * - H1 revenue:  nonCompliantRevenue is a 0-100 float (e.g., 0.27 = 0.27% haram revenue).
 *                Threshold: < 5% (i.e., nonCompliantRevenue < 5.0)
 * - H2 debt:     debtToMarketCapRatio — AAOIFI denominator is market_cap (not total_assets).
 *                Threshold: < 0.33 (confirmed: AMD example showed 0.017)
 * - H3 assets:   securitiesToMarketCapRatio — securities/receivables to market cap.
 *                Threshold: < 0.49
 * - H4 interest: NOT AVAILABLE as isolated field. financialScreen is the combined H2+H3+H4
 *                verdict. We cannot compute standalone H4 from Zoya. This is documented.
 *
 * truth_status:
 * - COMPLIANT or NON_COMPLIANT → "VERIFIED" (Zoya has a confirmed verdict)
 * - QUESTIONABLE → "STUBBED" (uncertain — purification flow required)
 * - UNKNOWN → "MISSING"
 */
export function mapZoyaToHalalScreen(
  data: ZoyaAdvancedReport,
  thresholds?: {
    maxHaramRevenuePct?: number     // H1: default 5.0 (meaning 5% of 0-100 scale)
    maxDebtRatio?:       number     // H2: default 0.33
    maxSecuritiesRatio?: number     // H3: default 0.49
  }
) {
  const maxHaramRevenuePct = thresholds?.maxHaramRevenuePct ?? 5.0
  const maxDebtRatio       = thresholds?.maxDebtRatio       ?? 0.33
  const maxSecuritiesRatio = thresholds?.maxSecuritiesRatio ?? 0.49

  // H1: Sector screen — use Zoya's businessScreen verdict directly
  const h1SectorPass = data.businessScreen === "COMPLIANT"

  // H1: Revenue screen — nonCompliantRevenue is 0-100 float
  const h1RevenuePass = data.nonCompliantRevenue <= maxHaramRevenuePct

  const h1Pass = h1SectorPass && h1RevenuePass

  // H2: Debt ratio — AAOIFIReport fragment field
  const h2Pass = data.debtToMarketCapRatio <= maxDebtRatio

  // H3: Securities/receivables ratio — AAOIFIReport fragment field
  const h3Pass = data.securitiesToMarketCapRatio <= maxSecuritiesRatio

  // H4: Cannot isolate — use financialScreen as combined proxy
  // financialScreen covers H2+H3+H4 combined per Zoya's internal logic
  const h4ProxyPass = data.financialScreen === "COMPLIANT"

  const zoyaStatus = data.status

  const truthStatus: "VERIFIED" | "STUBBED" | "MISSING" =
    zoyaStatus === "COMPLIANT" || zoyaStatus === "NON_COMPLIANT"
      ? "VERIFIED"
      : zoyaStatus === "QUESTIONABLE"
      ? "STUBBED"
      : "MISSING"

  return {
    // H1
    h1_sector_pass:          h1SectorPass,
    h1_revenue_pass:         h1RevenuePass,
    h1_pass:                 h1Pass,
    h1_noncompliant_revenue: data.nonCompliantRevenue,
    h1_questionable_revenue: data.questionableRevenue,
    h1_business_screen:      data.businessScreen,
    h1_evidence: {
      source:              "zoya",
      businessScreen:      data.businessScreen,
      nonCompliantRevenue: data.nonCompliantRevenue,
      questionableRevenue: data.questionableRevenue,
      threshold_revenue:   maxHaramRevenuePct,
      note: "Zoya does not return raw sector string in report query — businessScreen is the verdict",
    },

    // H2
    h2_debt_ratio: data.debtToMarketCapRatio,
    h2_pass:       h2Pass,
    h2_evidence: {
      source:      "zoya",
      methodology: "AAOIFI_debt_to_market_cap",  // NOT debt/total_assets (DJIM)
      value:       data.debtToMarketCapRatio,
      threshold:   maxDebtRatio,
    },

    // H3
    h3_securities_ratio: data.securitiesToMarketCapRatio,
    h3_pass:             h3Pass,
    h3_evidence: {
      source:    "zoya",
      value:     data.securitiesToMarketCapRatio,
      threshold: maxSecuritiesRatio,
    },

    // H4 — proxy only
    h4_proxy_pass: h4ProxyPass,
    h4_isolated:   false,   // H4 cannot be isolated from Zoya API
    h4_evidence: {
      source:        "zoya",
      proxy:         "financialScreen",
      proxy_value:   data.financialScreen,
      note: "H4 interest income ratio not available as separate field. financialScreen = H2+H3+H4 combined verdict.",
    },

    // Overall
    overall_pass:       h1Pass && h2Pass && h3Pass && h4ProxyPass,
    compliance_status:  zoyaStatus,
    is_questionable:    zoyaStatus === "QUESTIONABLE",
    truth_status:       truthStatus,
    data_sources: {
      primary:         "zoya",
      query:           "advancedCompliance.report",
      methodology:     "AAOIFI",
      schema_verified: true,
      verified_date:   "2026-06-13",
    },
  }
}

/**
 * Minimal screen from basicCompliance.report (free/sandbox tier).
 * Returns pass/fail based on top-level status only — no ratio breakdown.
 * Use this when Advanced plan is not available.
 */
export function mapZoyaBasicToHalalScreen(data: ZoyaBasicReport) {
  const zoyaStatus = data.status
  const truthStatus: "VERIFIED" | "STUBBED" | "MISSING" =
    zoyaStatus === "COMPLIANT" || zoyaStatus === "NON_COMPLIANT" ? "VERIFIED"
    : zoyaStatus === "QUESTIONABLE" ? "STUBBED"
    : "MISSING"

  return {
    // All H gates unknown — only top-level verdict available
    h1_pass:            null,
    h2_pass:            null,
    h3_pass:            null,
    h4_proxy_pass:      null,
    overall_pass:       zoyaStatus === "COMPLIANT",
    compliance_status:  zoyaStatus,
    is_questionable:    zoyaStatus === "QUESTIONABLE",
    truth_status:       truthStatus,
    plan_limitation:    "basic — no financial ratio breakdown available",
    data_sources: {
      primary:         "zoya",
      query:           "basicCompliance.report",
      methodology:     "AAOIFI",
      schema_verified: true,
      verified_date:   "2026-06-13",
    },
  }
}
