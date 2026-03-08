"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"

export default function ReceiptsPage() {
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

  const receipts = [
    { id: "RCP-001", timestamp: "2026-03-05 14:32:00", ticker: "NVDA", verdict: "GO", hash: "7f3a2b1c...", status: "verified" },
    { id: "RCP-002", timestamp: "2026-03-05 14:28:00", ticker: "AAPL", verdict: "WAIT", hash: "9e4d5f6a...", status: "verified" },
    { id: "RCP-003", timestamp: "2026-03-05 14:15:00", ticker: "TSLA", verdict: "NO", hash: "2c8b7e3d...", status: "verified" },
  ]

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#f5f5f5]">Receipts Ledger</h1>
            <span className="rounded bg-[#a855f7]/20 px-2 py-0.5 text-[10px] font-bold text-[#a855f7]">TRUTHSERUM</span>
          </div>
          <p className="mt-1 text-sm text-[#737373]">Immutable decision audit trail</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#1f1f1f]">
          <table className="w-full">
            <thead className="border-b border-[#1f1f1f] bg-[#141414]">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Receipt ID</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Timestamp</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Symbol</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Verdict</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Hash</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="bg-[#0c0c0c] hover:bg-[#141414] cursor-pointer">
                  <td className="px-4 py-4">
                    <span className="font-mono text-sm text-[#a855f7]">{receipt.id}</span>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-[#737373]">{receipt.timestamp}</td>
                  <td className="px-4 py-4 font-mono font-semibold text-[#f5f5f5]">{receipt.ticker}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                      receipt.verdict === "GO" ? "bg-[#22c55e]/20 text-[#22c55e]" :
                      receipt.verdict === "WAIT" ? "bg-[#c9a227]/20 text-[#c9a227]" :
                      "bg-[#ef4444]/20 text-[#ef4444]"
                    }`}>
                      {receipt.verdict}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-[#737373]">{receipt.hash}</td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-1 text-xs text-[#22c55e]">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </span>
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
