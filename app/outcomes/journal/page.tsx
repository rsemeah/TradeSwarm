"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"

export default function JournalPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0c]">
        <LoadingLogo />
      </div>
    )
  }

  if (!user) return null

  const entries = [
    { date: "2026-03-04", ticker: "NVDA", result: "WIN", pnl: 142.80, notes: "Perfect entry on morning dip" },
    { date: "2026-03-03", ticker: "AMD", result: "WIN", pnl: 87.50, notes: "Took profits early before IV crush" },
    { date: "2026-03-02", ticker: "TSLA", result: "LOSS", pnl: -65.00, notes: "Stopped out on gap down" },
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

        {/* Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Win Rate</p>
            <p className="mt-1 font-mono text-2xl font-bold text-[#22c55e]">67%</p>
          </div>
          <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Total P&L</p>
            <p className="mt-1 font-mono text-2xl font-bold text-[#22c55e]">+$165.30</p>
          </div>
          <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Total Trades</p>
            <p className="mt-1 font-mono text-2xl font-bold text-[#f5f5f5]">3</p>
          </div>
          <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Avg P&L</p>
            <p className="mt-1 font-mono text-2xl font-bold text-[#f5f5f5]">$55.10</p>
          </div>
        </div>

        {/* Journal Entries */}
        <div className="space-y-4">
          {entries.map((entry, i) => (
            <div key={i} className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <span className={`rounded px-3 py-1 text-sm font-bold ${
                    entry.result === "WIN" ? "bg-[#22c55e]/20 text-[#22c55e]" : "bg-[#ef4444]/20 text-[#ef4444]"
                  }`}>
                    {entry.result}
                  </span>
                  <div>
                    <p className="font-mono font-semibold text-[#f5f5f5]">{entry.ticker}</p>
                    <p className="text-xs text-[#737373]">{entry.date}</p>
                  </div>
                </div>
                <p className={`font-mono text-lg font-semibold ${entry.pnl >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                  {entry.pnl >= 0 ? "+" : ""}${entry.pnl.toFixed(2)}
                </p>
              </div>
              <p className="mt-3 text-sm text-[#a1a1aa]">{entry.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
