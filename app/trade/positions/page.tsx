"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"

interface Position {
  id: string
  ticker: string
  strategy_type: string
  qty: number
  entry_price: number
  current_price: number
  pnl: number
  pnl_pct: number
  entry_date: string
  expiration_date: string
  outcome: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function PositionsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [closing, setClosing] = useState<string | null>(null)

  const { data, error, isLoading, mutate } = useSWR<{ positions: Position[] }>(
    user ? "/api/trade" : null,
    fetcher
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  const closePosition = useCallback(async (positionId: string) => {
    setClosing(positionId)
    try {
      await fetch("/api/journal/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade_id: positionId, outcome: "closed" })
      })
      mutate()
    } finally {
      setClosing(null)
    }
  }, [mutate])

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0c]">
        <LoadingLogo />
      </div>
    )
  }

  if (!user) return null

  // Use API data or fallback to mock for demo
  const positions: Position[] = data?.positions || [
    { id: "1", ticker: "NVDA", strategy_type: "Bull Call Spread", qty: 1, entry_price: 142.50, current_price: 168.20, pnl: 25.70, pnl_pct: 18.0, entry_date: "2026-02-28", expiration_date: "2026-03-07", outcome: "open" },
    { id: "2", ticker: "AAPL", strategy_type: "Iron Condor", qty: 2, entry_price: 85.00, current_price: 92.40, pnl: 14.80, pnl_pct: 8.7, entry_date: "2026-02-25", expiration_date: "2026-03-14", outcome: "open" },
    { id: "3", ticker: "SPY", strategy_type: "Put Credit Spread", qty: 3, entry_price: 215.00, current_price: 198.50, pnl: -49.50, pnl_pct: -7.7, entry_date: "2026-03-01", expiration_date: "2026-03-08", outcome: "open" },
  ]

  const openPositions = positions.filter(p => p.outcome === "open")
  const totalPnl = openPositions.reduce((sum, p) => sum + p.pnl, 0)

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#f5f5f5]">Positions</h1>
            <p className="mt-1 text-sm text-[#737373]">{openPositions.length} open positions</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Total P&L</p>
              <p className={`font-mono text-lg font-semibold ${totalPnl >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/10 p-3 text-sm text-[#ef4444]">
            Failed to load positions
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-[#1f1f1f]">
          <table className="w-full">
            <thead className="border-b border-[#1f1f1f] bg-[#141414]">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Symbol</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Strategy</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Qty</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Entry</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Current</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[#737373]">P&L</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {openPositions.map((pos) => (
                <tr key={pos.id} className="bg-[#0c0c0c] hover:bg-[#141414]">
                  <td className="px-4 py-4">
                    <span className="font-mono font-semibold text-[#f5f5f5]">{pos.ticker}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-[#a1a1aa]">{pos.strategy_type}</td>
                  <td className="px-4 py-4 text-right font-mono text-sm text-[#f5f5f5]">{pos.qty}</td>
                  <td className="px-4 py-4 text-right font-mono text-sm text-[#a1a1aa]">${pos.entry_price.toFixed(2)}</td>
                  <td className="px-4 py-4 text-right font-mono text-sm text-[#f5f5f5]">${pos.current_price.toFixed(2)}</td>
                  <td className={`px-4 py-4 text-right font-mono text-sm ${pos.pnl >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                    {pos.pnl >= 0 ? "+" : ""}{pos.pnl_pct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button 
                      onClick={() => closePosition(pos.id)}
                      disabled={closing === pos.id}
                      className="rounded bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-[#f5f5f5] hover:bg-[#2a2a2a] disabled:opacity-50"
                    >
                      {closing === pos.id ? "..." : "Close"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
