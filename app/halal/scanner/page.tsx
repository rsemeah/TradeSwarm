"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"
import { GateStack } from "@/components/halal/gate-stack"
import { TruthStatusTooltip } from "@/components/truth-status-tooltip"
import type { HalalScreen, GateStackItem } from "@/lib/halal/types"
import { Search, RefreshCw } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function HalalScannerPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [ticker, setTicker] = useState("")
  const [scanning, setScanning] = useState(false)
  const [currentScreen, setCurrentScreen] = useState<HalalScreen | null>(null)

  const { data: screensData, mutate } = useSWR(
    user ? "/api/halal/screen" : null,
    fetcher
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  const runScreen = useCallback(async () => {
    if (!ticker.trim()) return
    setScanning(true)
    try {
      const res = await fetch("/api/halal/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: ticker.toUpperCase() })
      })
      const data = await res.json()
      if (data.screen) {
        setCurrentScreen(data.screen)
        mutate()
      }
    } finally {
      setScanning(false)
    }
  }, [ticker, mutate])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0c]">
        <LoadingLogo />
      </div>
    )
  }

  if (!user) return null

  // Convert screen to gate stack for display
  const screenToGateStack = (screen: HalalScreen): GateStackItem[] => [
    {
      gate: "H1",
      label: "Business Activity",
      description: `Sector: ${screen.h1_sector || 'Unknown'}, Haram Revenue: ${((screen.h1_haram_revenue_pct || 0) * 100).toFixed(1)}%`,
      pass: screen.h1_pass,
      evidence: screen.h1_evidence,
      truth_status: screen.h1_evidence?.truth_status || screen.truth_status
    },
    {
      gate: "H2",
      label: "Debt Ratio",
      description: `Debt/Market Cap: ${((screen.h2_debt_ratio || 0) * 100).toFixed(1)}% (max 33%)`,
      pass: screen.h2_pass,
      evidence: screen.h2_evidence,
      truth_status: screen.h2_evidence?.truth_status || screen.truth_status
    },
    {
      gate: "H3",
      label: "Receivables Ratio",
      description: `Receivables/Assets: ${((screen.h3_receivables_ratio || 0) * 100).toFixed(1)}% (max 49%)`,
      pass: screen.h3_pass,
      evidence: screen.h3_evidence,
      truth_status: screen.h3_evidence?.truth_status || screen.truth_status
    },
    {
      gate: "H4",
      label: "Interest Income",
      description: `Interest/Revenue: ${((screen.h4_interest_ratio || 0) * 100).toFixed(1)}% (max 5%)`,
      pass: screen.h4_pass,
      evidence: screen.h4_evidence,
      truth_status: screen.h4_evidence?.truth_status || screen.truth_status
    }
  ]

  const recentScreens = screensData?.screens?.slice(0, 10) || []

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#f5f5f5]">Halal Scanner</h1>
            <span className="rounded bg-[#22c55e]/20 px-2 py-0.5 text-[10px] font-bold text-[#22c55e]">H1-H4</span>
          </div>
          <p className="mt-1 text-sm text-[#737373]">Screen stocks for Sharia compliance before trading</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <form onSubmit={(e) => { e.preventDefault(); runScreen() }} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]" />
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Enter ticker symbol (e.g., NVDA, AAPL)"
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#141414] py-3 pl-10 pr-4 text-[#f5f5f5] placeholder:text-[#737373] focus:border-[#22c55e] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={scanning || !ticker.trim()}
              className="flex items-center gap-2 rounded-lg bg-[#22c55e] px-6 py-3 font-semibold text-[#0c0c0c] transition-colors hover:bg-[#22c55e]/90 disabled:opacity-50"
            >
              {scanning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {scanning ? 'Scanning...' : 'Screen'}
            </button>
          </form>
        </div>

        {/* Current Screen Result */}
        {currentScreen && (
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-bold text-[#f5f5f5]">{currentScreen.ticker}</span>
                <TruthStatusTooltip status={currentScreen.truth_status}>
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                    currentScreen.overall_pass 
                      ? 'bg-[#22c55e]/20 text-[#22c55e]' 
                      : 'bg-[#ef4444]/20 text-[#ef4444]'
                  }`}>
                    {currentScreen.overall_pass ? 'HALAL COMPLIANT' : 'NOT COMPLIANT'}
                  </span>
                </TruthStatusTooltip>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#737373]">Compliance Score</p>
                <p className="font-mono text-2xl font-bold text-[#f5f5f5]">{currentScreen.compliance_score}%</p>
              </div>
            </div>
            
            <GateStack 
              gates={screenToGateStack(currentScreen)}
              overall_pass={currentScreen.overall_pass}
              attestation_level={currentScreen.overall_pass ? 'FULL' : 'PARTIAL'}
            />

            {currentScreen.overall_pass && (
              <button
                onClick={() => router.push(`/halal/gate?ticker=${currentScreen.ticker}&screen_id=${currentScreen.id}`)}
                className="mt-4 w-full rounded-lg bg-[#22c55e] py-3 font-semibold text-[#0c0c0c] transition-colors hover:bg-[#22c55e]/90"
              >
                Proceed to Trade Gate (H5-H7) →
              </button>
            )}
          </div>
        )}

        {/* Recent Screens */}
        {recentScreens.length > 0 && (
          <div>
            <h2 className="mb-4 text-sm font-semibold text-[#737373]">Recent Screens</h2>
            <div className="space-y-2">
              {recentScreens.map((screen: HalalScreen) => (
                <button
                  key={screen.id}
                  onClick={() => setCurrentScreen(screen)}
                  className="flex w-full items-center justify-between rounded-lg border border-[#1f1f1f] bg-[#141414] p-3 text-left transition-colors hover:bg-[#1a1a1a]"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-[#f5f5f5]">{screen.ticker}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      screen.overall_pass 
                        ? 'bg-[#22c55e]/20 text-[#22c55e]' 
                        : 'bg-[#ef4444]/20 text-[#ef4444]'
                    }`}>
                      {screen.overall_pass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-[#737373]">{screen.compliance_score}%</span>
                    <span className="text-[10px] text-[#737373]">
                      {new Date(screen.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
