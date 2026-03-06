"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"

export default function WatchlistsPage() {
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

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#f5f5f5]">Watchlists</h1>
          <p className="mt-1 text-sm text-[#737373]">Create and manage your watchlists</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Default Watchlist */}
          <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-[#f5f5f5]">Tech Growth</h3>
              <span className="rounded bg-[#22c55e]/20 px-2 py-0.5 text-[10px] font-medium text-[#22c55e]">8 symbols</span>
            </div>
            <div className="space-y-2">
              {["NVDA", "AAPL", "MSFT", "GOOGL"].map((ticker) => (
                <div key={ticker} className="flex items-center justify-between rounded-lg bg-[#1a1a1a] px-3 py-2">
                  <span className="font-mono text-sm text-[#f5f5f5]">{ticker}</span>
                  <span className="text-xs text-[#22c55e]">+2.4%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Watchlist */}
          <button className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[#2a2a2a] bg-[#0c0c0c] text-[#737373] transition-colors hover:border-[#22c55e]/50 hover:text-[#22c55e]">
            <svg className="mb-2 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-sm font-medium">Create Watchlist</span>
          </button>
        </div>
      </div>
    </div>
  )
}
