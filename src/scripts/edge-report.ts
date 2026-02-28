import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { createOptionalSupabaseServerClient } from "../lib/db/supabaseServer.ts"
import { computeEdgeReport } from "../lib/edge/edgeValidation.ts"
import { adaptTradeRow, type RawTradeRow } from "../lib/edge/tradeRowAdapter.ts"

type CliArgs = { mode: "paper" | "live" | "all"; days: number; minTrades: number; out: "stdout" | "json" }

async function loadFixtureTrades(): Promise<RawTradeRow[]> {
  const fixturePath = fileURLToPath(new URL("./fixtures/sampleTrades.json", import.meta.url))
  const content = await readFile(fixturePath, "utf8")
  return JSON.parse(content) as RawTradeRow[]
}


function parseArgs(argv: string[]): CliArgs {
  const params = Object.fromEntries(argv.map((a) => a.replace(/^--/, "").split("=")))
  const mode = params.mode === "live" || params.mode === "all" ? params.mode : "paper"
  return {
    mode,
    days: Number(params.days ?? 30),
    minTrades: Number(params.minTrades ?? 50),
    out: params.out === "json" ? "json" : "stdout",
  }
}

async function loadTrades(args: CliArgs): Promise<{ rows: RawTradeRow[]; source: string }> {
  const supabase = createOptionalSupabaseServerClient()
  const sinceIso = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000).toISOString()

  if (!supabase) {
    return { rows: await loadFixtureTrades(), source: "fixture:sampleTrades.json (missing Supabase env)" }
  }

  const tableAttempts = [
    { table: "trades_v2", tsCol: "entry_date", modeCol: "mode" },
    { table: "trades", tsCol: "created_at", modeCol: "status" },
  ]

  for (const attempt of tableAttempts) {
    let query = supabase.from(attempt.table).select("*").gte(attempt.tsCol, sinceIso).order(attempt.tsCol, { ascending: true })
    if (args.mode === "paper") query = query.or("mode.eq.paper,status.eq.simulated,action.eq.simulate")
    if (args.mode === "live") query = query.or("mode.eq.live,status.eq.executed,action.eq.execute")

    const { data, error } = await query.limit(5000)
    if (!error && data && data.length > 0) {
      const rows = data.map((row) => ({ ...row, table_source: attempt.table }))

      if (attempt.table === "trades") {
        const tradeIds = rows.map((r) => r.id).filter(Boolean)
        if (tradeIds.length) {
          const { data: receipts } = await supabase
            .from("trade_receipts")
            .select("trade_id, kelly_fraction, cost_model")
            .in("trade_id", tradeIds)
          const byTradeId = new Map((receipts ?? []).map((r) => [r.trade_id, r]))
          for (const row of rows) {
            const receipt = byTradeId.get(row.id)
            if (!receipt) continue
            row.kelly_fraction = receipt.kelly_fraction
            if (receipt.cost_model && typeof receipt.cost_model === "object") {
              const model = receipt.cost_model as Record<string, unknown>
              row.fees = model.fees
              row.slippage = model.slippage
            }
          }
        }
      }

      return { rows, source: `supabase:${attempt.table}` }
    }
  }

  return { rows: await loadFixtureTrades(), source: "fixture:sampleTrades.json (query empty/unavailable)" }
}

function printSummary(report: ReturnType<typeof computeEdgeReport>, source: string, args: CliArgs) {
  console.log("\n=== EdgeValidationEngine v0 (Measurement Only) ===")
  console.log(`source=${source} mode=${args.mode} days=${args.days}`)
  console.log(`trades=${report.trade_count} total_pnl=${report.total_pnl} total_R=${report.total_R} avg_R=${report.avg_R}`)
  console.log(`win_rate=${report.win_rate} largest_losing_streak=${report.largest_losing_streak}`)
  console.log(`max_drawdown_R=${report.max_drawdown_R} max_drawdown_pct=${report.max_drawdown_pct ?? "UNKNOWN"}`)
  console.log(`risk_of_ruin_warning=${report.risk_of_ruin.warning_score}`)
  if (report.trade_count < args.minTrades) {
    console.log(`WARNING: trade_count (${report.trade_count}) below minTrades (${args.minTrades})`) 
  }
  console.log("unknowns:", report.unknowns.length ? report.unknowns.join(", ") : "none")
  console.log("\nDetailed report:\n", JSON.stringify(report, null, 2))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const { rows, source } = await loadTrades(args)
  const trades = rows.map(adaptTradeRow).filter((row) => (args.mode === "all" ? true : row.mode ? row.mode === args.mode : true))

  const report = computeEdgeReport({ trades })

  if (args.out === "json") {
    console.log(JSON.stringify({ source, args, report }, null, 2))
    return
  }

  printSummary(report, source, args)
}

main().catch((error) => {
  console.error("edge-report failed", error)
  process.exit(1)
})
