"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"
import type { PurificationSummary, PurificationEntry } from "@/lib/halal/types"
import { Heart, Check, DollarSign, ExternalLink } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(res => res.json())

const CHARITY_OPTIONS = [
  { name: "Islamic Relief USA", url: "https://irusa.org" },
  { name: "Muslim Aid", url: "https://muslimaid.org" },
  { name: "Penny Appeal", url: "https://pennyappealusa.org" },
  { name: "Local Masjid", url: null },
  { name: "Custom", url: null }
]

export default function PurificationPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [selectedEntries, setSelectedEntries] = useState<string[]>([])
  const [charity, setCharity] = useState(CHARITY_OPTIONS[0].name)
  const [donating, setDonating] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<{ summary: PurificationSummary }>(
    user ? "/api/halal/purification" : null,
    fetcher
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  const toggleEntry = (id: string) => {
    setSelectedEntries(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    const pendingIds = data?.summary.entries
      .filter(e => e.status === 'PENDING')
      .map(e => e.id) || []
    setSelectedEntries(pendingIds)
  }

  const markAsDonated = useCallback(async () => {
    if (selectedEntries.length === 0) return
    setDonating(true)
    try {
      await fetch("/api/halal/purification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          entry_ids: selectedEntries,
          charity_destination: charity 
        })
      })
      setSelectedEntries([])
      mutate()
    } finally {
      setDonating(false)
    }
  }, [selectedEntries, charity, mutate])

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0c]">
        <LoadingLogo />
      </div>
    )
  }

  if (!user) return null

  const summary = data?.summary || { total_pending: 0, total_donated: 0, entries: [], recommended_charity: 'Islamic Relief USA' }
  const pendingEntries = summary.entries.filter(e => e.status === 'PENDING')
  const donatedEntries = summary.entries.filter(e => e.status === 'DONATED')
  
  const selectedTotal = pendingEntries
    .filter(e => selectedEntries.includes(e.id))
    .reduce((sum, e) => sum + e.purification_amount, 0)

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Heart className="h-6 w-6 text-[#22c55e]" />
            <h1 className="text-2xl font-semibold text-[#f5f5f5]">Purification Ledger</h1>
          </div>
          <p className="mt-1 text-sm text-[#737373]">
            Track and donate haram income portions from your trading profits
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/10 p-3 text-sm text-[#ef4444]">
            Failed to load purification data
          </div>
        )}

        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#c9a227]/30 bg-[#c9a227]/10 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#c9a227]">Pending Purification</p>
            <p className="mt-1 font-mono text-2xl font-bold text-[#c9a227]">${summary.total_pending.toFixed(2)}</p>
            <p className="mt-1 text-[10px] text-[#c9a227]/70">{pendingEntries.length} entries</p>
          </div>
          
          <div className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#22c55e]">Total Donated</p>
            <p className="mt-1 font-mono text-2xl font-bold text-[#22c55e]">${summary.total_donated.toFixed(2)}</p>
            <p className="mt-1 text-[10px] text-[#22c55e]/70">{donatedEntries.length} donations</p>
          </div>
          
          <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Recommended Charity</p>
            <p className="mt-1 text-lg font-medium text-[#f5f5f5]">{summary.recommended_charity}</p>
            <a href="https://irusa.org" target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-[10px] text-[#22c55e] hover:underline">
              Visit site <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Pending Purification */}
        {pendingEntries.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#f5f5f5]">Pending Purification</h2>
              <button onClick={selectAll} className="text-xs text-[#22c55e] hover:underline">
                Select All
              </button>
            </div>
            
            <div className="space-y-2">
              {pendingEntries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => toggleEntry(entry.id)}
                  className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
                    selectedEntries.includes(entry.id)
                      ? 'border-[#22c55e] bg-[#22c55e]/10'
                      : 'border-[#1f1f1f] bg-[#141414] hover:bg-[#1a1a1a]'
                  }`}
                >
                  <div className={`flex h-5 w-5 items-center justify-center rounded border ${
                    selectedEntries.includes(entry.id)
                      ? 'border-[#22c55e] bg-[#22c55e]'
                      : 'border-[#3a3a3a]'
                  }`}>
                    {selectedEntries.includes(entry.id) && <Check className="h-3 w-3 text-[#0c0c0c]" />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-[#f5f5f5]">{entry.ticker}</span>
                      <span className="text-xs text-[#737373]">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#a1a1aa]">
                      Profit: ${entry.trade_pnl.toFixed(2)} × {(entry.haram_ratio * 100).toFixed(1)}% haram ratio
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-mono font-semibold text-[#c9a227]">${entry.purification_amount.toFixed(2)}</p>
                    <p className="text-[10px] text-[#737373]">to purify</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Donation Action */}
            {selectedEntries.length > 0 && (
              <div className="mt-4 rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#f5f5f5]">Ready to Donate</p>
                    <p className="text-xs text-[#737373]">{selectedEntries.length} entries selected</p>
                  </div>
                  <p className="font-mono text-2xl font-bold text-[#22c55e]">${selectedTotal.toFixed(2)}</p>
                </div>
                
                <div className="mb-4">
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#737373]">
                    Charity Destination
                  </label>
                  <select
                    value={charity}
                    onChange={(e) => setCharity(e.target.value)}
                    className="w-full rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2 text-[#f5f5f5] focus:border-[#22c55e] focus:outline-none"
                  >
                    {CHARITY_OPTIONS.map(opt => (
                      <option key={opt.name} value={opt.name}>{opt.name}</option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={markAsDonated}
                  disabled={donating}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#22c55e] py-3 font-semibold text-[#0c0c0c] transition-colors hover:bg-[#22c55e]/90 disabled:opacity-50"
                >
                  <Heart className="h-4 w-4" />
                  {donating ? 'Processing...' : `Mark as Donated to ${charity}`}
                </button>
                
                <p className="mt-2 text-center text-[10px] text-[#737373]">
                  This records the donation in your ledger. Please complete the actual donation separately.
                </p>
              </div>
            )}
          </div>
        )}

        {/* No Pending */}
        {pendingEntries.length === 0 && (
          <div className="mb-8 rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 p-8 text-center">
            <Check className="mx-auto mb-3 h-12 w-12 text-[#22c55e]" />
            <p className="text-lg font-medium text-[#22c55e]">All Caught Up!</p>
            <p className="mt-1 text-sm text-[#737373]">No pending purification. Your portfolio is clean.</p>
          </div>
        )}

        {/* Donation History */}
        {donatedEntries.length > 0 && (
          <div>
            <h2 className="mb-4 text-sm font-semibold text-[#737373]">Donation History</h2>
            <div className="space-y-2">
              {donatedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 rounded-lg border border-[#1f1f1f] bg-[#141414] p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22c55e]/20">
                    <Check className="h-4 w-4 text-[#22c55e]" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-[#f5f5f5]">{entry.ticker}</span>
                      <span className="text-[10px] text-[#737373]">→ {entry.charity_destination}</span>
                    </div>
                    <p className="text-[10px] text-[#737373]">
                      {entry.donated_at ? new Date(entry.donated_at).toLocaleDateString() : 'Donated'}
                    </p>
                  </div>
                  
                  <span className="font-mono text-sm text-[#22c55e]">${entry.purification_amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
