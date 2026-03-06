"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"

export default function PositionsPage() {
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

  const positions = [
    { ticker: "NVDA", strategy: "Bull Call Spread", qty: 1, entry: 142.50, current: 168.20, pnl: 25.70, pnlPct: 18.0 },
    { ticker: "AAPL", strategy: "Iron Condor", qty: 2, entry: 85.00, current: 92.40, pnl: 14.80, pnlPct: 8.7 },
    { ticker: "SPY", strategy: "Put Credit Spread", qty: 3, entry: 215.00, current: 198.50, pnl: -49.50, pnlPct: -7.7 },
  ]

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#f5f5f5]">Positions</h1>
            <p className="mt-1 text-sm text-[#737373]">Manage your open positions</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Total P&L</p>
              <p className="font-mono text-lg font-semibold text-[#22c55e]">-$9.00</p>
            </div>
          </div>
        </div>

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
              {positions.map((pos) => (
                <tr key={pos.ticker} className="bg-[#0c0c0c] hover:bg-[#141414]">
                  <td className="px-4 py-4">
                    <span className="font-mono font-semibold text-[#f5f5f5]">{pos.ticker}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-[#a1a1aa]">{pos.strategy}</td>
                  <td className="px-4 py-4 text-right font-mono text-sm text-[#f5f5f5]">{pos.qty}</td>
                  <td className="px-4 py-4 text-right font-mono text-sm text-[#a1a1aa]">${pos.entry.toFixed(2)}</td>
                  <td className="px-4 py-4 text-right font-mono text-sm text-[#f5f5f5]">${pos.current.toFixed(2)}</td>
                  <td className={`px-4 py-4 text-right font-mono text-sm ${pos.pnl >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                    {pos.pnl >= 0 ? "+" : ""}{pos.pnlPct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button className="rounded bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-[#f5f5f5] hover:bg-[#2a2a2a]">
                      Close
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
