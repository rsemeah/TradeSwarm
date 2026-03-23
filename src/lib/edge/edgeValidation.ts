import type { TradeRow } from "./tradeRowAdapter.ts"

export type EdgeValidationInput = { trades: TradeRow[] }

type BucketReport = { trade_count: number; avg_R: number; win_rate: number }

export type EdgeReport = {
  trade_count: number
  total_pnl: number
  total_R: number
  avg_R: number
  win_rate: number
  avg_win_R: number
  avg_loss_R: number
  largest_losing_streak: number
  max_drawdown_pct: number | null
  max_drawdown_R: number
  confidence_buckets: Record<"low" | "mid" | "high", BucketReport> | "UNKNOWN"
  regime_breakdown: Record<string, BucketReport> | "UNKNOWN"
  gross: { total_pnl: number; total_R: number }
  net: { total_pnl: number; total_R: number } | "UNKNOWN"
  kelly_drawdown_analysis:
    | { avg_kelly_drawdown: number; avg_kelly_non_drawdown: number; increased_during_drawdown: boolean }
    | "UNKNOWN"
  risk_of_ruin: {
    approximation: string
    warning_score: "LOW" | "MEDIUM" | "HIGH"
    mean_R: number
    stdev_R: number
  }
  unknowns: string[]
}

const round = (n: number, p = 4) => Number(n.toFixed(p))

function mean(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

function toR(trade: TradeRow): number {
  if (trade.r_multiple !== undefined) return trade.r_multiple
  if (trade.max_risk && trade.max_risk !== 0) return trade.realized_pnl / trade.max_risk
  return 0
}

export function computeEdgeReport(input: EdgeValidationInput): EdgeReport {
  const trades = [...input.trades].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const rs = trades.map(toR)
  const wins = rs.filter((r) => r > 0)
  const losses = rs.filter((r) => r < 0)

  let largestLosingStreak = 0
  let currentLosingStreak = 0
  let equityR = 0
  let peakR = 0
  let maxDrawdownR = 0
  const drawdownFlags: boolean[] = []

  for (const r of rs) {
    currentLosingStreak = r < 0 ? currentLosingStreak + 1 : 0
    largestLosingStreak = Math.max(largestLosingStreak, currentLosingStreak)

    equityR += r
    peakR = Math.max(peakR, equityR)
    const drawdown = peakR - equityR
    if (drawdown > maxDrawdownR) maxDrawdownR = drawdown
    drawdownFlags.push(equityR < peakR)
  }

  const totalPnl = trades.reduce((sum, t) => sum + t.realized_pnl, 0)
  const totalR = rs.reduce((sum, r) => sum + r, 0)

  const confidenceValues = trades
    .map((t, idx) => ({ confidence: t.confidence, r: rs[idx] }))
    .filter((x): x is { confidence: number; r: number } => x.confidence !== undefined)
    .sort((a, b) => a.confidence - b.confidence)

  let confidenceBuckets: EdgeReport["confidence_buckets"] = "UNKNOWN"
  if (confidenceValues.length >= 3) {
    const oneThird = Math.floor(confidenceValues.length / 3)
    const twoThird = Math.floor((2 * confidenceValues.length) / 3)
    const bucketed = {
      low: confidenceValues.slice(0, oneThird),
      mid: confidenceValues.slice(oneThird, twoThird),
      high: confidenceValues.slice(twoThird),
    }
    confidenceBuckets = {
      low: {
        trade_count: bucketed.low.length,
        avg_R: round(mean(bucketed.low.map((b) => b.r))),
        win_rate: round(bucketed.low.filter((b) => b.r > 0).length / Math.max(1, bucketed.low.length)),
      },
      mid: {
        trade_count: bucketed.mid.length,
        avg_R: round(mean(bucketed.mid.map((b) => b.r))),
        win_rate: round(bucketed.mid.filter((b) => b.r > 0).length / Math.max(1, bucketed.mid.length)),
      },
      high: {
        trade_count: bucketed.high.length,
        avg_R: round(mean(bucketed.high.map((b) => b.r))),
        win_rate: round(bucketed.high.filter((b) => b.r > 0).length / Math.max(1, bucketed.high.length)),
      },
    }
  }

  const regimeMap = new Map<string, number[]>()
  trades.forEach((trade, idx) => {
    if (!trade.regime) return
    const list = regimeMap.get(trade.regime) ?? []
    list.push(rs[idx])
    regimeMap.set(trade.regime, list)
  })
  const regimeBreakdown: EdgeReport["regime_breakdown"] = regimeMap.size
    ? Object.fromEntries(
        [...regimeMap.entries()].map(([regime, values]) => [
          regime,
          {
            trade_count: values.length,
            avg_R: round(mean(values)),
            win_rate: round(values.filter((v) => v > 0).length / Math.max(1, values.length)),
          },
        ]),
      )
    : "UNKNOWN"

  const hasCosts = trades.some((t) => t.fees !== undefined || t.slippage !== undefined)
  const net = hasCosts
    ? (() => {
        const netPnl = trades.reduce((sum, t) => sum + t.realized_pnl - (t.fees ?? 0) - (t.slippage ?? 0), 0)
        const netR = trades.reduce((sum, t, idx) => {
          if (t.max_risk && t.max_risk !== 0) {
            return sum + (t.realized_pnl - (t.fees ?? 0) - (t.slippage ?? 0)) / t.max_risk
          }
          return sum + rs[idx]
        }, 0)
        return { total_pnl: round(netPnl), total_R: round(netR) }
      })()
    : "UNKNOWN"

  const kellyRows = trades.map((t, idx) => ({ kelly: t.kelly_fraction, inDd: drawdownFlags[idx] })).filter((x): x is { kelly: number; inDd: boolean } => x.kelly !== undefined)
  const kellyAnalysis: EdgeReport["kelly_drawdown_analysis"] =
    kellyRows.length > 0
      ? {
          avg_kelly_drawdown: round(mean(kellyRows.filter((r) => r.inDd).map((r) => r.kelly))),
          avg_kelly_non_drawdown: round(mean(kellyRows.filter((r) => !r.inDd).map((r) => r.kelly))),
          increased_during_drawdown:
            mean(kellyRows.filter((r) => r.inDd).map((r) => r.kelly)) >
            mean(kellyRows.filter((r) => !r.inDd).map((r) => r.kelly)),
        }
      : "UNKNOWN"

  const meanR = mean(rs)
  const sdR = stdev(rs)
  const warningScore: "LOW" | "MEDIUM" | "HIGH" = meanR <= 0 || largestLosingStreak >= 8 ? "HIGH" : sdR > Math.max(0.75, Math.abs(meanR) * 3) ? "MEDIUM" : "LOW"

  const unknowns: string[] = []
  if (confidenceBuckets === "UNKNOWN") unknowns.push("confidence_buckets")
  if (regimeBreakdown === "UNKNOWN") unknowns.push("regime_breakdown")
  if (net === "UNKNOWN") unknowns.push("slippage_fees_adjustment")
  if (kellyAnalysis === "UNKNOWN") unknowns.push("kelly_oversize_during_drawdown")
  if (trades.some((t) => t.max_risk === undefined && t.r_multiple === undefined)) unknowns.push("R_multiple_missing_for_some_rows")

  return {
    trade_count: trades.length,
    total_pnl: round(totalPnl),
    total_R: round(totalR),
    avg_R: round(meanR),
    win_rate: round(wins.length / Math.max(1, rs.length)),
    avg_win_R: round(mean(wins)),
    avg_loss_R: round(mean(losses)),
    largest_losing_streak: largestLosingStreak,
    max_drawdown_pct: peakR > 0 ? round((maxDrawdownR / peakR) * 100, 2) : null,
    max_drawdown_R: round(maxDrawdownR),
    confidence_buckets: confidenceBuckets,
    regime_breakdown: regimeBreakdown,
    gross: { total_pnl: round(totalPnl), total_R: round(totalR) },
    net,
    kelly_drawdown_analysis: kellyAnalysis,
    risk_of_ruin: {
      approximation:
        "Approximation based on realized R-multiples only (mean_R, stdev_R, win_rate, avg_win_R, avg_loss_R, largest_losing_streak). It is a warning heuristic, not a precise ruin probability.",
      warning_score: warningScore,
      mean_R: round(meanR),
      stdev_R: round(sdR),
    },
    unknowns,
  }
}
