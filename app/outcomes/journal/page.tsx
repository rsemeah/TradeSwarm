"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"

interface JournalEntry {
  id: string
  ticker: string
  strategy_type: string
  entry_date: string
  outcome: string
  realized_pnl: number
  notes?: string
}

interface PerformanceStats {
  win_rate: number
  total_pnl: number
  total_trades: number
  avg_pnl: number
  trades: JournalEntry[]
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function JournalPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const { data, error, isLoading } = useSWR<PerformanceStats>(
    user ? "/api/journal/performance" : null,
    fetcher
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0c]">
        <LoadingLogo />
      </div>
    )
  }

  if (!user) return null

  // Use API data or fallback to mock
  const stats = data || {
    win_rate: 67,
    total_pnl: 165.30,
    total_trades: 3,
    avg_pnl: 55.10,
    trades: []
  }
  
  const entries = stats.trades.length > 0 ? stats.trades : [
    { id: "1", ticker: "NVDA", strategy_type: "Bull Call", entry_date: "2026-03-04", outcome: "win", realized_pnl: 142.80, notes: "Perfect entry on morning dip" },
    { id: "2", ticker: "AMD", strategy_type: "Put Credit", entry_date: "2026-03-03", outcome: "win", realized_pnl: 87.50, notes: "Took profits early before IV crush" },
    { id: "3", ticker: "TSLA", strategy_type: "Call Debit", entry_date: "2026-03-02", outcome: "loss", realized_pnl: -65.00, notes: "Stopped out on gap down" },
  ]

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#f5f5f5]">Trade Journal</h1>
            <p className="mt-1 text-sm text-[#737373]">Track your outcomes and learnings</p>
          </div>
          <button className="rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-medium text-[#0c0c0c] hover:bg-[#16a34a]">
            + New Entry
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/10 p-3 text-sm text-[#ef4444]">
            Failed to load performance data
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Win Rate</p>
            <p className="mt-1 font-mono text-2xl font-bold text-[#22c55e]">{stats.win_rate.toFixed(0)}%</p>
          </div>
          <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Total P&L</p>
            <p className={`mt-1 font-mono text-2xl font-bold ${stats.total_pnl >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
              {stats.total_pnl >= 0 ? "+" : ""}${stats.total_pnl.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Total Trades</p>
            <p className="mt-1 font-mono text-2xl font-bold text-[#f5f5f5]">{stats.total_trades}</p>
          </div>
          <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Avg P&L</p>
            <p className="mt-1 font-mono text-2xl font-bold text-[#f5f5f5]">${stats.avg_pnl.toFixed(2)}</p>
          </div>
        </div>

        {/* Journal Entries */}
        <div className="space-y-4">
          {entries.map((entry) => {
            const isWin = entry.outcome === "win" || entry.realized_pnl > 0
            return (
              <div key={entry.id} className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`rounded px-3 py-1 text-sm font-bold ${
                      isWin ? "bg-[#22c55e]/20 text-[#22c55e]" : "bg-[#ef4444]/20 text-[#ef4444]"
                    }`}>
                      {isWin ? "WIN" : "LOSS"}
                    </span>
                    <div>
                      <p className="font-mono font-semibold text-[#f5f5f5]">{entry.ticker}</p>
                      <p className="text-xs text-[#737373]">{entry.strategy_type} · {entry.entry_date}</p>
                    </div>
                  </div>
                  <p className={`font-mono text-lg font-semibold ${entry.realized_pnl >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                    {entry.realized_pnl >= 0 ? "+" : ""}${entry.realized_pnl.toFixed(2)}
                  </p>
                </div>
                {entry.notes && <p className="mt-3 text-sm text-[#a1a1aa]">{entry.notes}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
