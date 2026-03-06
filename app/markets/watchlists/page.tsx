"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"

interface WatchlistItem {
  id: string
  ticker: string
  theme: string
  created_at: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function WatchlistsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [newTicker, setNewTicker] = useState("")
  const [adding, setAdding] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<{ watchlist: WatchlistItem[] }>(
    user ? "/api/watchlist" : null,
    fetcher
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  const addToWatchlist = useCallback(async (ticker: string) => {
    if (!ticker.trim()) return
    setAdding(true)
    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: ticker.toUpperCase(), theme: "General" })
      })
      mutate()
      setNewTicker("")
    } finally {
      setAdding(false)
    }
  }, [mutate])

  const removeFromWatchlist = useCallback(async (ticker: string) => {
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, action: "remove" })
    })
    mutate()
  }, [mutate])

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0c]">
        <LoadingLogo />
      </div>
    )
  }

  if (!user) return null

  const watchlist = data?.watchlist || []
  const groupedByTheme = watchlist.reduce((acc, item) => {
    const theme = item.theme || "General"
    if (!acc[theme]) acc[theme] = []
    acc[theme].push(item)
    return acc
  }, {} as Record<string, WatchlistItem[]>)

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#f5f5f5]">Watchlists</h1>
            <p className="mt-1 text-sm text-[#737373]">{watchlist.length} symbols tracked</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); addToWatchlist(newTicker) }} className="flex gap-2">
            <input
              type="text"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              placeholder="Add ticker..."
              className="w-32 rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#737373] focus:border-[#22c55e] focus:outline-none"
            />
            <button
              type="submit"
              disabled={adding || !newTicker.trim()}
              className="rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-medium text-[#0c0c0c] hover:bg-[#22c55e]/90 disabled:opacity-50"
            >
              {adding ? "..." : "Add"}
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/10 p-3 text-sm text-[#ef4444]">
            Failed to load watchlist
          </div>
        )}
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(groupedByTheme).map(([theme, items]) => (
            <div key={theme} className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-[#f5f5f5]">{theme}</h3>
                <span className="rounded bg-[#22c55e]/20 px-2 py-0.5 text-[10px] font-medium text-[#22c55e]">
                  {items.length} symbols
                </span>
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-[#1a1a1a] px-3 py-2">
                    <span className="font-mono text-sm text-[#f5f5f5]">{item.ticker}</span>
                    <button
                      onClick={() => removeFromWatchlist(item.ticker)}
                      className="text-[10px] text-[#737373] hover:text-[#ef4444]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {watchlist.length === 0 && (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[#2a2a2a] bg-[#0c0c0c] text-[#737373]">
              <svg className="mb-2 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-sm font-medium">Add your first ticker above</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
