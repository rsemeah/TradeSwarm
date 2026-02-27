"use client"

import { TradeCard } from "@/components/trade-card"
import { mockCandidates, mockRadarData } from "@/lib/mock-data"

export function TradesScreen() {
  const hasGoTrades = mockCandidates.some((c) => c.status === "GO")

  if (!hasGoTrades) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <span className="mb-4 text-6xl">🛡</span>
        <h2 className="mb-2 text-base font-medium text-foreground">Sitting out today</h2>
        <p className="mb-4 max-w-[280px] text-[13px] text-muted-foreground leading-relaxed">
          Markets aren&apos;t offering a clean opportunity today. That&apos;s okay — protecting capital is a win too.
        </p>
        <p className="mb-6 text-[11px] text-muted-foreground">
          Next scan tomorrow at 6:00 AM ET
        </p>
        <button className="rounded-md border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted">
          Run a simulation anyway
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-lg font-bold text-foreground">Today&apos;s Trades</h1>
        <p className="text-xs text-muted-foreground">
          Based on AI Infrastructure · Scanned {mockRadarData.lastScan}
        </p>
      </div>

      {/* Trade Cards */}
      <div className="space-y-4">
        {mockCandidates.map((candidate) => (
          <TradeCard key={candidate.ticker} candidate={candidate} />
        ))}
      </div>
    </div>
  )
}
