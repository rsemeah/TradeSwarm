/**
 * Full scan orchestrator.
 *
 * For each ticker in the scanner universe:
 *   1. Fetch underlying (price, avg volume, historical closes)
 *   2. Compute RV20
 *   3. For each Friday expiration in 3–30 DTE range:
 *      a. Fetch options chain
 *      b. Generate spread candidates
 *      c. Score each candidate (score, stress, news stub)
 *   4. Rank and filter across all tickers
 *   5. Persist to scan_results + scan_candidates
 *
 * NOTE: News/event penalty is stubbed at 0 until lib/news/ is implemented.
 */

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { SCANNER_TICKERS } from "./universe"
import { generateCandidates } from "./candidates"
import { scoreCandidate } from "./score"
import { computeStress } from "./stress"
import { rankAndFilter } from "./rank"
import { computeRv20, computeIvRvPosition } from "@/lib/indicators/rv20"
import { fetchUnderlying, fetchOptionChain } from "@/lib/adapters/optionsChain"
import { detectRegime } from "@/lib/engine/regime"
import type { ScanResult, NewsResult, CandidateProofBundle } from "@/lib/types/proof-bundle"

const DTE_RANGES = {
  A: [3, 4, 5, 6, 7],
  B: [10, 14, 17, 21],
  C: [22, 25, 28, 30],
}

/** Get upcoming Fridays within a DTE range */
function upcomingFridays(dteMin: number, dteMax: number): { date: string; dte: number }[] {
  const today = new Date()
  const results: { date: string; dte: number }[] = []

  for (let offset = dteMin; offset <= dteMax + 7; offset++) {
    const d = new Date(today)
    d.setDate(today.getDate() + offset)
    if (d.getDay() === 5) { // Friday
      const dte = Math.round((d.getTime() - today.getTime()) / 86_400_000)
      if (dte >= dteMin && dte <= dteMax) {
        results.push({ date: d.toISOString().split("T")[0], dte })
      }
    }
  }
  return results
}

const STUB_NEWS: NewsResult = {
  hasEarnings: false,
  hasFedEvent: false,
  hasMacroEvent: false,
  penaltyApplied: 0,
  sources: [],
}

export async function runFullScan(userId: string): Promise<CandidateProofBundle> {
  const supabase = await createClient()
  const scanId = crypto.randomUUID().replace(/-/g, "").slice(0, 12)
  const cookieStore = await cookies()
  const cookie = cookieStore.toString()

  const allCandidates: ScanResult[] = []
  let totalScanned = 0

  // Process tickers in batches of 5 to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < SCANNER_TICKERS.length; i += batchSize) {
    const batch = SCANNER_TICKERS.slice(i, i + batchSize)

    await Promise.all(
      batch.map(async (ticker) => {
        const underlying = await fetchUnderlying({ ticker, cookie })
        if (!underlying || underlying.avgVolume < 500_000) return

        const rv20 = computeRv20(underlying.closes)
        const regime = await detectRegime(ticker).catch(() => null)

        const allDtes = [
          ...DTE_RANGES.A.map((d) => ({ dte: d, tier: "A" as const })),
          ...DTE_RANGES.B.map((d) => ({ dte: d, tier: "B" as const })),
          ...DTE_RANGES.C.map((d) => ({ dte: d, tier: "C" as const })),
        ]

        // Get unique Friday expirations in range
        const fridays = [
          ...upcomingFridays(3, 7),
          ...upcomingFridays(10, 21),
          ...upcomingFridays(22, 30),
        ]

        for (const { date, dte } of fridays) {
          const chain = await fetchOptionChain({
            ticker,
            expiration: date,
            cookie,
          })
          if (!chain || !chain.underlyingPrice) continue

          const atmIv = chain.atmIv

          const rawCandidates = generateCandidates({
            chain,
            ticker,
            dte,
            underlyingAvgVolume: underlying.avgVolume,
            atmIv,
            scanId,
          })

          totalScanned += rawCandidates.length

          for (const raw of rawCandidates) {
            const ivRv = computeIvRvPosition(atmIv ?? 0.3, rv20.current)
            const { score, flags, contracts } = scoreCandidate({
              candidate: raw,
              ivRv: { position: ivRv.position, sufficient: ivRv.sufficient },
              news: STUB_NEWS,
              regimeConfidence: regime?.confidence ?? 0.5,
              regimeBullish: regime?.trend === "bullish",
              balance: 10_000,
            })

            const stressInput = {
              ...raw,
              underlyingPrice: underlying.price,
              atmIv: atmIv ?? 0.3,
              dte,
            }

            const stress = computeStress(stressInput)

            allCandidates.push({
              ...raw,
              contracts,
              score,
              ivRv: {
                currentIv: atmIv ?? 0.3,
                rv20: rv20.current,
                position: ivRv.position,
                sufficient: ivRv.sufficient,
              },
              news: STUB_NEWS,
              stress,
              flags: {
                sized_at_hard_cap: flags.sized_at_hard_cap ?? false,
                catalyst_mode_trade: flags.catalyst_mode_trade ?? false,
                iv_rich: flags.iv_rich ?? false,
                event_window: flags.event_window ?? false,
              },
            } as ScanResult)
          }
        }
      })
    )
  }

  const { ranked, tierCounts, passed, empty } = rankAndFilter(allCandidates, totalScanned)

  // Get a representative regime for the bundle
  const spyRegime = await detectRegime("SPY").catch(() => null)

  const bundle: CandidateProofBundle = {
    scanId,
    ticker: "UNIVERSE",
    regime: {
      trend: spyRegime?.trend ?? "neutral",
      volatility: spyRegime?.volatility ?? "normal",
      momentum: spyRegime?.momentum ?? "neutral",
      confidence: spyRegime?.confidence ?? 0.5,
    },
    candidates: ranked,
    rankingSummary: { totalScanned, passed, tierCounts, empty },
    ts: new Date().toISOString(),
  }

  // Persist
  const { data: scanRow } = await supabase
    .from("scan_results")
    .insert({
      scan_id: scanId,
      user_id: userId,
      regime: bundle.regime,
      ranking_summary: bundle.rankingSummary,
      ts: bundle.ts,
    })
    .select("id")
    .single()

  if (scanRow && ranked.length > 0) {
    await supabase.from("scan_candidates").insert(
      ranked.map((c) => ({
        scan_id: scanId,
        candidate_id: c.candidateId,
        ticker: c.ticker,
        spread_type: c.spreadType,
        tier: c.tier,
        expiration: c.expiration,
        dte: c.dte,
        score_final: c.score.final,
        proof_bundle: c,
        ts: c.ts,
      }))
    )
  }

  return bundle
}
