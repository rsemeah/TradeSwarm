/**
 * app/api/halal/screen/route.ts
 * POST /api/halal/screen
 *
 * Screens a ticker against AAOIFI methodology via Zoya API.
 *
 * ✅ Schema verified 2026-06-13 against https://developer.zoya.finance/docs
 *
 * Cache-first: halal_verdicts table (asymmetric TTL):
 *   COMPLIANT:     1h  (short — becoming non-compliant while cached is high-risk)
 *   NON_COMPLIANT: 7d  (long — safe to block aggressively)
 *   QUESTIONABLE:  30m (very short — borderline, recheck often)
 *   UNKNOWN:       30m
 *
 * QUESTIONABLE handling:
 *   - Does NOT hard-block (different from NON_COMPLIANT)
 *   - Returns questionable: true in response
 *   - Route caller / UI decides whether to prompt user for purification consent
 *
 * Plan tiers:
 *   - Advanced plan: full H1-H4 gate breakdown
 *   - Basic plan fallback: status-only verdict (no ratio breakdown)
 *
 * Writes to both halal_verdicts (primary cache) and halal_screens (legacy UI table).
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  fetchZoyaCompliance,
  mapZoyaToHalalScreen,
  mapZoyaBasicToHalalScreen,
} from "@/lib/halal/zoya"

// Asymmetric TTLs — risk-weighted
const TTL: Record<string, number> = {
  COMPLIANT:     1  * 60 * 60 * 1000,      // 1h
  NON_COMPLIANT: 7  * 24 * 60 * 60 * 1000, // 7d
  QUESTIONABLE:  30 * 60 * 1000,            // 30min
  UNKNOWN:       30 * 60 * 1000,            // 30min
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const ticker = body?.ticker?.toUpperCase()?.trim()

    if (!ticker || !/^[A-Z]{1,10}$/.test(ticker)) {
      return NextResponse.json({ error: "Invalid ticker" }, { status: 400 })
    }

    // ── Step 1: Cache check (halal_verdicts) ─────────────────────────────────
    const today = new Date().toISOString().slice(0, 10)
    const { data: cached } = await supabase
      .from("halal_verdicts")
      .select("*")
      .eq("user_id", user.id)
      .eq("ticker", ticker)
      .eq("screen_date", today)
      .single()

    if (cached && new Date(cached.expires_at) > new Date()) {
      return NextResponse.json({
        ticker,
        cached: true,
        source: "halal_verdicts_cache",
        verdict: {
          overall_pass:      cached.overall_pass,
          compliance_status: cached.compliance_status,
          truth_status:      cached.truth_status,
          questionable:      cached.compliance_status === "QUESTIONABLE",
          purification_required: cached.compliance_status === "QUESTIONABLE",
        },
        gates: {
          h1: { pass: cached.h1_pass,       evidence: cached.h1_evidence },
          h2: { pass: cached.h2_pass,       evidence: cached.h2_evidence },
          h3: { pass: cached.h3_pass,       evidence: cached.h3_evidence },
          h4: { pass: cached.h4_proxy_pass, evidence: cached.h4_evidence, isolated: false },
        },
        plan_tier: cached.plan_tier ?? "unknown",
        screened_at: cached.screened_at,
        expires_at:  cached.expires_at,
      })
    }

    // ── Step 2: Get user's sharia thresholds ─────────────────────────────────
    const { data: profile } = await supabase
      .from("sharia_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()

    const userThresholds = {
      maxHaramRevenuePct: profile?.max_haram_revenue_ratio ?? 5.0,   // H1: 5% of 0-100 scale
      maxDebtRatio:       profile?.max_debt_ratio          ?? 0.33,   // H2: AAOIFI
      maxSecuritiesRatio: profile?.max_receivables_ratio   ?? 0.49,   // H3
      // H4: not a configurable threshold — financialScreen is Zoya's composite
    }

    // ── Step 3: Fetch from Zoya ───────────────────────────────────────────────
    const zoyaResult = await fetchZoyaCompliance(ticker)
    const screenedAt = new Date()

    // ── Step 4: Map to H-gates ───────────────────────────────────────────────
    type MappedType =
      | ReturnType<typeof mapZoyaToHalalScreen>
      | ReturnType<typeof mapZoyaBasicToHalalScreen>
      | null

    let mapped: MappedType = null
    let planTier: "advanced" | "basic" | "unavailable" = "unavailable"

    if (zoyaResult.ok && zoyaResult.data) {
      // Advanced plan — full H1-H4 breakdown available
      mapped    = mapZoyaToHalalScreen(zoyaResult.data, userThresholds)
      planTier  = "advanced"
    } else if (zoyaResult.ok && zoyaResult.basic) {
      // Basic plan fallback — status only
      mapped    = mapZoyaBasicToHalalScreen(zoyaResult.basic)
      planTier  = "basic"
    }

    // ── Step 5: Derive verdict fields ────────────────────────────────────────
    // Use Zoya's top-level status as the authoritative compliance decision
    const complianceStatus: string =
      !zoyaResult.ok
        ? "UNKNOWN"
        : (zoyaResult.data?.status ?? zoyaResult.basic?.status ?? "UNKNOWN")

    const isQuestionable = complianceStatus === "QUESTIONABLE"

    // Hard-gate: overall_pass only when COMPLIANT + all gate checks pass
    // QUESTIONABLE does NOT set overall_pass=true — requires user consent at UI layer
    const overallPass =
      complianceStatus === "COMPLIANT" && mapped?.overall_pass === true

    const zoyaTruthStatus = mapped?.truth_status ?? "MISSING"

    // Gate pass values — null for basic plan (no breakdown)
    const h1Pass       = "h1_pass"       in (mapped ?? {}) ? (mapped as ReturnType<typeof mapZoyaToHalalScreen>).h1_pass       : null
    const h2Pass       = "h2_pass"       in (mapped ?? {}) ? (mapped as ReturnType<typeof mapZoyaToHalalScreen>).h2_pass       : null
    const h3Pass       = "h3_pass"       in (mapped ?? {}) ? (mapped as ReturnType<typeof mapZoyaToHalalScreen>).h3_pass       : null
    const h4ProxyPass  = "h4_proxy_pass" in (mapped ?? {}) ? (mapped as ReturnType<typeof mapZoyaToHalalScreen>).h4_proxy_pass : null

    // ── Step 6: Compute TTL ───────────────────────────────────────────────────
    const ttlMs    = TTL[complianceStatus] ?? TTL.UNKNOWN
    const expiresAt = new Date(screenedAt.getTime() + ttlMs)

    // ── Step 7: Build halal_verdicts upsert row ───────────────────────────────
    const advMapped = planTier === "advanced"
      ? mapped as ReturnType<typeof mapZoyaToHalalScreen>
      : null

    const verdictRow = {
      user_id:            user.id,
      ticker,
      screen_date:        today,
      compliance_status:  complianceStatus,
      plan_tier:          planTier,

      h1_pass:                  h1Pass,
      h1_business_screen:       advMapped?.h1_business_screen ?? null,
      h1_noncompliant_revenue:  advMapped?.h1_noncompliant_revenue ?? null,
      h1_evidence:              advMapped?.h1_evidence ?? { source: "missing", error: zoyaResult.error },

      h2_pass:            h2Pass,
      h2_debt_ratio:      advMapped?.h2_debt_ratio ?? null,
      h2_threshold:       userThresholds.maxDebtRatio,
      h2_evidence:        advMapped?.h2_evidence ?? { source: "missing", error: zoyaResult.error },

      h3_pass:                h3Pass,
      h3_securities_ratio:    advMapped?.h3_securities_ratio ?? null,
      h3_threshold:           userThresholds.maxSecuritiesRatio,
      h3_evidence:            advMapped?.h3_evidence ?? { source: "missing", error: zoyaResult.error },

      // H4: no isolated ratio — proxy only. Store composite proxy pass + evidence note.
      h4_proxy_pass:    h4ProxyPass,
      h4_isolated:      false,
      h4_evidence:      advMapped?.h4_evidence ?? {
        note: "H4 not available without advanced plan",
        source: "missing",
      },

      overall_pass:       overallPass,
      truth_status:       zoyaTruthStatus,
      data_sources:       mapped?.data_sources ?? { primary: "zoya", error: zoyaResult.error },
      zoya_raw_response:  zoyaResult.data ?? zoyaResult.basic ?? null,
      screened_at:        screenedAt.toISOString(),
      expires_at:         expiresAt.toISOString(),
    }

    const { error: verdictErr } = await supabase
      .from("halal_verdicts")
      .upsert(verdictRow, { onConflict: "user_id,ticker,screen_date" })

    if (verdictErr) {
      console.error("[halal/screen] halal_verdicts upsert failed:", verdictErr)
    }

    // ── Step 8: Also write halal_screens (legacy — existing UI reads this table) ──
    if (advMapped) {
      const screenRow = {
        user_id:             user.id,
        ticker,
        screen_date:         today,
        h1_business_screen:  advMapped.h1_business_screen,
        h1_noncompliant_revenue: advMapped.h1_noncompliant_revenue,
        h1_pass:             h1Pass,
        h1_evidence:         advMapped.h1_evidence,
        h2_debt_ratio:       advMapped.h2_debt_ratio,
        h2_pass:             h2Pass,
        h2_evidence:         advMapped.h2_evidence,
        h3_securities_ratio: advMapped.h3_securities_ratio,
        h3_pass:             h3Pass,
        h3_evidence:         advMapped.h3_evidence,
        h4_proxy_pass:       h4ProxyPass,
        h4_isolated:         false,
        h4_evidence:         advMapped.h4_evidence,
        overall_pass:        overallPass,
        compliance_score:    overallPass ? 100 : isQuestionable ? 50 : 0,
        truth_status:        zoyaTruthStatus,
        data_sources:        advMapped.data_sources,
      }

      const { error: screenErr } = await supabase
        .from("halal_screens")
        .upsert(screenRow, { onConflict: "user_id,ticker,screen_date" })
        .select("id")
        .single()

      if (screenErr) {
        // Non-fatal — halal_verdicts is primary, halal_screens is legacy sync
        console.warn("[halal/screen] halal_screens sync failed (non-fatal):", screenErr.message)
      }
    }

    // ── Step 9: Return ────────────────────────────────────────────────────────
    return NextResponse.json({
      ticker,
      cached: false,
      source: zoyaResult.source,
      plan_tier: planTier,
      verdict: {
        overall_pass:         overallPass,
        compliance_status:    complianceStatus,
        truth_status:         zoyaTruthStatus,
        questionable:         isQuestionable,
        purification_required: isQuestionable,
      },
      gates: planTier === "advanced"
        ? {
            h1: { pass: h1Pass,       evidence: verdictRow.h1_evidence },
            h2: { pass: h2Pass,       evidence: verdictRow.h2_evidence },
            h3: { pass: h3Pass,       evidence: verdictRow.h3_evidence },
            h4: { pass: h4ProxyPass,  evidence: verdictRow.h4_evidence, isolated: false,
                  note: "H4 = financialScreen composite (Zoya does not expose raw interest income ratio)" },
          }
        : null,
      plan_note: planTier === "basic"
        ? "Basic API plan — no financial ratio breakdown. Verdict based on status field only."
        : undefined,
      zoya_error: zoyaResult.error ?? undefined,
      methodology_note:
        "AAOIFI screening via Zoya. H2 debt ratio uses market_cap denominator (not total_assets per DJIM). H4 not isolatable — financialScreen used as proxy.",
      screened_at: screenedAt.toISOString(),
      expires_at:  expiresAt.toISOString(),
    })

  } catch (err) {
    console.error("[halal/screen] unhandled error:", err)
    return NextResponse.json(
      { error: "Internal server error", detail: String(err) },
      { status: 500 }
    )
  }
}
