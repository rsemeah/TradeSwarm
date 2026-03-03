import type { CandidateProofBundle, RegimeResult, ScanResult, SigmaSource } from '@/lib/types/proof-bundle'
import { fetchHistoricalCloses, fetchOptionChain, fetchUnderlying } from '@/src/lib/adapters/optionsChain'
import { computeRv20 } from '@/src/lib/indicators/rv20'
import { getMacroFlags } from '@/src/lib/news/calendar'
import { getMacroNews, getTickerNews } from '@/src/lib/news/newsEngine'
import { generateCreditSpreadCandidates, generateDebitSpreadCandidates } from './candidates'
import { rankAndFilter, buildScanResult } from './rank'
import {
  computeEventPenalty,
  computeFinalScore,
  computeIvRv,
  computeLiquidity,
  computePOP,
  computeRegimeBonus,
  computeROR,
} from './score'
import { computeStress } from './stress'
import type { FilterCounts, ScanConfig } from './types'
import { buildUniverse, filterContract, filterTicker } from './universe'

const DEFAULT_REGIME: RegimeResult = { regime: 'CHOPPY', confidence: 0, source: 'fallback' }
const TTL_MS = 5 * 60 * 1000

// V1 note: process-memory cache only. Multi-instance inconsistency accepted in V1.
const cache = new Map<string, { ts: number; payload: ScanResult }>()

function getTargetExpiries(dte_range: [number, number]): string[] {
  const today = new Date()
  const expiries: string[] = []
  for (let d = dte_range[0]; d <= dte_range[1]; d += 1) {
    const dt = new Date(today)
    dt.setDate(today.getDate() + d)
    if (dt.getDay() === 5) expiries.push(dt.toISOString().split('T')[0])
  }
  return expiries
}

async function detectRegimeSafe(ticker: string): Promise<RegimeResult> {
  try {
    const module = await import('@/lib/engine/regime')
    const detect = (module as unknown as { detectRegime?: (t: string) => Promise<unknown> | unknown }).detectRegime
    if (!detect) return DEFAULT_REGIME
    const out = await detect(ticker) as { regime?: RegimeResult['regime']; trend?: string; confidence?: number; source?: string }
    const mappedRegime = out.regime
      ?? (out.trend === 'bullish' ? 'TRENDING' : out.trend === 'bearish' ? 'HIGH_VOL' : 'CHOPPY')
    return { regime: mappedRegime, confidence: out.confidence ?? 0, source: out.source ?? 'adapter' }
  } catch {
    return DEFAULT_REGIME
  }
}

export async function runFullScan(config: Partial<ScanConfig>): Promise<ScanResult> {
  const cfg: ScanConfig = {
    watchlist: config.watchlist ?? [],
    catalyst_mode: config.catalyst_mode ?? false,
    force_refresh: config.force_refresh ?? false,
    account_size: config.account_size ?? 10_000,
    max_risk: config.max_risk ?? 200,
    hard_cap: config.hard_cap ?? 250,
  }

  const cacheKey = JSON.stringify({ watchlist: cfg.watchlist, catalyst_mode: cfg.catalyst_mode })
  const now = Date.now()
  const hit = cache.get(cacheKey)
  if (!cfg.force_refresh && hit && now - hit.ts < TTL_MS) {
    return { ...hit.payload, cached: true }
  }

  const scan_id = crypto.randomUUID()
  const universe = buildUniverse(cfg.watchlist)
  const filter_counts: FilterCounts = {}
  const candidates: CandidateProofBundle[] = []
  const news_macro = await getMacroNews(48)

  for (const ticker of universe) {
    const underlying = await fetchUnderlying(ticker)
    if (underlying.price === 0) {
      filter_counts.fetch_failed = (filter_counts.fetch_failed ?? 0) + 1
      continue
    }

    const ticker_filter = filterTicker(underlying.avg_volume)
    if (!ticker_filter.passed) {
      filter_counts.low_volume = (filter_counts.low_volume ?? 0) + 1
      continue
    }

    const closes = await fetchHistoricalCloses(ticker, 252)
    const rv20 = computeRv20(closes)
    const news_ticker = await getTickerNews(ticker, 48)
    const macro_flags = getMacroFlags(underlying.earnings_date ?? undefined, 30)
    const regime = await detectRegimeSafe(ticker)

    const dte_ranges: Array<[number, number]> = cfg.catalyst_mode ? [[3, 7], [10, 21], [21, 30]] : [[10, 21], [21, 30]]
    for (const dte_range of dte_ranges) {
      const expiries = getTargetExpiries(dte_range)
      for (const expiry of expiries) {
        const today = new Date()
        const exp_date = new Date(expiry)
        const dte = Math.round((exp_date.getTime() - today.getTime()) / 86400000)
        if (dte < 1) continue

        const chain = await fetchOptionChain(ticker, expiry)
        if (chain.contracts.length === 0) continue

        const valid_contracts = chain.contracts.filter((c) => {
          const r = filterContract(c)
          if (!r.passed) r.reasons.forEach((reason) => { filter_counts[reason] = (filter_counts[reason] ?? 0) + 1 })
          return r.passed
        })
        if (valid_contracts.length < 2) continue

        const raw_pcs = generateCreditSpreadCandidates(
          ticker, underlying.price, valid_contracts, expiry, dte, 'PCS', underlying.earnings_date,
          cfg.catalyst_mode ? ['A', 'B', 'C'] : ['B', 'C'],
        )
        const raw_ccs = generateCreditSpreadCandidates(
          ticker, underlying.price, valid_contracts, expiry, dte, 'CCS', underlying.earnings_date,
          cfg.catalyst_mode ? ['A', 'B', 'C'] : ['B', 'C'],
        )
        const raw_cds = generateDebitSpreadCandidates(ticker, underlying.price, valid_contracts, expiry, dte, underlying.earnings_date)

        for (const raw of [...raw_pcs, ...raw_ccs, ...raw_cds]) {
          const ror_result = computeROR(raw)
          if (ror_result.contracts === 0) {
            filter_counts.cannot_size = (filter_counts.cannot_size ?? 0) + 1
            continue
          }

          const pop_result = computePOP(raw, rv20)
          const iv_rv_result = computeIvRv(raw, rv20)
          const liquidity_score = computeLiquidity(raw)
          const event_result = computeEventPenalty(raw, news_ticker.sentiment)
          const regime_bonus = computeRegimeBonus(raw, regime, news_ticker.sentiment)
          const final = computeFinalScore(
            ror_result.ror_score,
            pop_result.pop_score,
            iv_rv_result.iv_rv_score,
            liquidity_score,
            event_result.event_penalty,
            regime_bonus,
          )

          const sigma: number = raw.short_iv || rv20.current || 0.2
          const sigma_source: SigmaSource = raw.short_iv ? 'contract_iv' : rv20.sufficient ? 'rv20_proxy' : 'default_0.20'
          const stress = computeStress({
            strategy: raw.strategy,
            underlying_price: underlying.price,
            dte: raw.dte,
            sigma,
            sigma_source,
            short_strike: raw.short_strike,
            long_strike: raw.long_strike,
            spread_width: raw.spread_width,
            net_credit_ps: ror_result.net_credit_ps,
            net_debit_ps: ror_result.net_debit_ps,
            contracts: ror_result.contracts,
          })

          candidates.push({
            candidate_id: crypto.randomUUID(),
            generated_at: new Date().toISOString(),
            data_timestamp: chain.timestamp,
            source: chain.source,
            cache_hit: false,
            ticker,
            underlying_price: underlying.price,
            strategy: raw.strategy,
            tier: raw.tier,
            dte: raw.dte,
            expiry_date: raw.expiry_date,
            legs: [
              {
                role: 'short',
                type: raw.strategy === 'PCS' ? 'put' : 'call',
                strike: raw.short_strike,
                bid: raw.short_bid,
                ask: raw.short_ask,
                mid_ps: raw.short_mid_ps,
                last: 0,
                open_interest: raw.short_oi,
                volume: raw.short_vol,
                implied_vol: raw.short_iv,
                delta: raw.short_delta,
                theta: null,
                delta_source: raw.short_delta !== null ? 'exchange' : 'approximated',
                sigma_source,
              },
              {
                role: 'long',
                type: raw.strategy === 'PCS' ? 'put' : 'call',
                strike: raw.long_strike,
                bid: raw.long_bid,
                ask: raw.long_ask,
                mid_ps: raw.long_mid_ps,
                last: 0,
                open_interest: raw.long_oi,
                volume: raw.long_vol,
                implied_vol: raw.long_iv,
                delta: raw.long_delta,
                theta: null,
                delta_source: raw.long_delta !== null ? 'exchange' : 'approximated',
                sigma_source,
              },
            ],
            net_credit_ps: ror_result.net_credit_ps,
            net_credit_total: ror_result.net_credit_total,
            net_debit_ps: ror_result.net_debit_ps,
            net_debit_total: ror_result.net_debit_total,
            max_loss_ps: ror_result.max_loss_ps,
            max_loss_total: ror_result.max_loss_total,
            max_profit_ps: ror_result.max_profit_ps,
            max_profit_total: ror_result.max_profit_total,
            breakeven_price: raw.strategy === 'PCS'
              ? raw.short_strike - ror_result.net_credit_ps
              : raw.strategy === 'CCS'
                ? raw.short_strike + ror_result.net_credit_ps
                : raw.long_strike + ror_result.net_debit_ps,
            contracts: ror_result.contracts,
            actual_risk_total: ror_result.actual_risk_total,
            fill_assumption: 'mid',
            ROR: ror_result.ror,
            score: {
              raw_score: final.raw_score,
              event_penalty: event_result.event_penalty,
              regime_bonus,
              total: final.total,
              display: final.display,
              components: {
                ror_score: ror_result.ror_score,
                pop_score: pop_result.pop_score,
                iv_rv_score: iv_rv_result.iv_rv_score,
                liquidity_score,
              },
              weights: { ror: 0.35, pop: 0.25, iv_rv: 0.2, liquidity: 0.15 },
              computed_at: new Date().toISOString(),
            },
            iv_rv: iv_rv_result.iv_rv,
            regime,
            news_ticker,
            news_macro,
            flags: {
              earnings_within_dte: macro_flags.earnings_within_dte,
              fomc_within_5d: macro_flags.fomc_within_5d,
              cpi_within_3d: macro_flags.cpi_within_3d,
              nfp_within_3d: macro_flags.nfp_within_3d,
              low_liquidity: liquidity_score < 0.4,
              iv_history_insufficient: !iv_rv_result.iv_rv.data_sufficient,
              iv_data_missing: raw.short_iv === 0,
              delta_approximated: raw.short_delta === null,
              catalyst_mode_trade: raw.tier === 'A',
              fill_assumption_mid: true,
              sized_at_hard_cap: ror_result.sized_at_hard_cap,
            },
            sizing_modifier: event_result.sizing_modifier,
            sizing_reason: event_result.sizing_reason,
            stress,
          })
        }
      }
    }
  }

  const ranked = rankAndFilter(candidates, cfg.catalyst_mode, filter_counts)
  const payload = buildScanResult(scan_id, universe, ranked, filter_counts, false)
  cache.set(cacheKey, { ts: now, payload })
  cache.set(`id:${payload.scan_id}`, { ts: now, payload })
  return payload
}

export function getCachedScan(scanId: string): ScanResult | null {
  const hit = cache.get(`id:${scanId}`)
  if (!hit || Date.now() - hit.ts >= TTL_MS) return null
  return hit.payload
}
