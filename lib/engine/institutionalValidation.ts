import type { SupabaseClient } from "@supabase/supabase-js"

export interface InstitutionalValidationSnapshot {
  freezeActive: boolean
  checks: {
    minEmpiricalTrades: { pass: boolean; value: number; required: number }
    determinismCoverage: { pass: boolean; value: number; required: number }
    replayMismatchRate: { pass: boolean; value: number; max: number }
    journalCoverage: { pass: boolean; value: number; required: number }
    drawdownWithinLimit: { pass: boolean; value: number; max: number }
    ruinProbability: { pass: boolean; value: number; max: number }
  }
  summary: {
    expectancy: number
    sharpe: number
    winRate: number
    rollingMaxDrawdown: number
    ruinProbability: number
    recommendedKellyDamping: number
  }
}

function safeRatio(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0
  return numerator / denominator
}

function stdDev(values: number[]) {
  if (values.length < 2) return 0
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)
  return Math.sqrt(Math.max(variance, 0))
}

function calculateRuinProbability(winRate: number, avgWin: number, avgLossAbs: number, n: number): number {
  if (n <= 0 || avgWin <= 0 || avgLossAbs <= 0) return 1

  const edge = winRate * avgWin - (1 - winRate) * avgLossAbs
  if (edge <= 0) return 1

  const lossToWinRatio = avgLossAbs / avgWin
  const q = Math.max(1 - winRate, Number.EPSILON)
  const p = Math.max(winRate, Number.EPSILON)
  const riskFactor = Math.min(1, Math.pow(q / p, Math.max(1, 1 / Math.max(lossToWinRatio, Number.EPSILON))))
  return Math.max(0, Math.min(1, riskFactor / Math.sqrt(n)))
}

function computeDrawdown(series: number[]) {
  let equity = 0
  let peak = 0
  let maxDrawdown = 0

  for (const pnl of series) {
    equity += pnl
    peak = Math.max(peak, equity)
    if (peak > 0) {
      const drawdown = (peak - equity) / peak
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    }
  }

  return maxDrawdown
}

export async function collectInstitutionalValidation(
  supabase: SupabaseClient,
  options?: {
    minTrades?: number
    minDeterminismCoverage?: number
    maxReplayMismatch?: number
    maxDrawdown?: number
    maxRuinProbability?: number
  }
): Promise<InstitutionalValidationSnapshot> {
  const minTrades = options?.minTrades ?? Number(process.env.MIN_EMPIRICAL_TRADES ?? 30)
  const minDeterminismCoverage = options?.minDeterminismCoverage ?? Number(process.env.MIN_DETERMINISM_COVERAGE ?? 1)
  const maxReplayMismatch = options?.maxReplayMismatch ?? Number(process.env.MAX_REPLAY_MISMATCH_RATE ?? 0)
  const maxDrawdown = options?.maxDrawdown ?? Number(process.env.MAX_ROLLING_DRAWDOWN ?? 0.2)
  const maxRuinProbability = options?.maxRuinProbability ?? Number(process.env.MAX_RUIN_PROBABILITY ?? 0.05)

  const [{ count: tradeCount }, { count: receiptCount }, { count: deterministicCount }, { data: replayRows }, { data: tradeRows }, { count: journalCount }, { data: freezeRow }] =
    await Promise.all([
      supabase.from("trades_v2").select("id", { count: "exact", head: true }),
      supabase.from("trade_receipts").select("id", { count: "exact", head: true }),
      supabase.from("trade_receipts").select("id", { count: "exact", head: true }).not("proof_bundle->metadata->determinism", "is", null),
      supabase.from("trade_replay_reports").select("match").order("created_at", { ascending: false }).limit(200),
      supabase.from("trades_v2").select("realized_pnl,outcome").order("entry_date", { ascending: true }).limit(500),
      supabase.from("operator_trade_journal").select("id", { count: "exact", head: true }),
      supabase.from("system_controls").select("is_active").eq("control_key", "trade_engine_frozen").maybeSingle(),
    ])

  const replayData = replayRows ?? []
  const replayMismatchRate = replayData.length ? replayData.filter((row) => !row.match).length / replayData.length : 0

  const pnlSeries = (tradeRows ?? []).map((row) => Number(row.realized_pnl ?? 0))
  const closed = (tradeRows ?? []).filter((row) => row.outcome && row.outcome !== "open")
  const wins = closed.filter((row) => Number(row.realized_pnl ?? 0) > 0)
  const losses = closed.filter((row) => Number(row.realized_pnl ?? 0) < 0)
  const winRate = safeRatio(wins.length, closed.length)
  const avgWin = wins.length ? wins.reduce((sum, row) => sum + Number(row.realized_pnl ?? 0), 0) / wins.length : 0
  const avgLoss = losses.length ? losses.reduce((sum, row) => sum + Number(row.realized_pnl ?? 0), 0) / losses.length : 0
  const expectancy = winRate * avgWin + (1 - winRate) * avgLoss
  const sharpe = stdDev(pnlSeries) > 0 ? expectancy / stdDev(pnlSeries) : 0
  const drawdown = computeDrawdown(pnlSeries)
  const ruinProbability = calculateRuinProbability(winRate, Math.max(avgWin, 0), Math.abs(avgLoss), Math.max(closed.length, 1))

  const determinismCoverage = safeRatio(deterministicCount ?? 0, receiptCount ?? 0)
  const journalCoverage = safeRatio(journalCount ?? 0, tradeCount ?? 0)
  const recommendedKellyDamping = ruinProbability > maxRuinProbability ? 0.5 : 1

  return {
    freezeActive: Boolean(freezeRow?.is_active),
    checks: {
      minEmpiricalTrades: { pass: (tradeCount ?? 0) >= minTrades, value: tradeCount ?? 0, required: minTrades },
      determinismCoverage: { pass: determinismCoverage >= minDeterminismCoverage, value: determinismCoverage, required: minDeterminismCoverage },
      replayMismatchRate: { pass: replayMismatchRate <= maxReplayMismatch, value: replayMismatchRate, max: maxReplayMismatch },
      journalCoverage: { pass: journalCoverage >= 1, value: journalCoverage, required: 1 },
      drawdownWithinLimit: { pass: drawdown <= maxDrawdown, value: drawdown, max: maxDrawdown },
      ruinProbability: { pass: ruinProbability <= maxRuinProbability, value: ruinProbability, max: maxRuinProbability },
    },
    summary: {
      expectancy,
      sharpe,
      winRate,
      rollingMaxDrawdown: drawdown,
      ruinProbability,
      recommendedKellyDamping,
    },
  }
}

export function shouldFreezeExecution(snapshot: InstitutionalValidationSnapshot) {
  if (snapshot.freezeActive) return true
  return Object.values(snapshot.checks).some((check) => !check.pass)
}
