"use client"

import { useState } from "react"
import { TradeCard } from "@/components/trade-card"
import { mockCandidates, mockRadarData } from "@/lib/mock-data"
import { useTrade } from "@/lib/trade-context"
import type { TradeCandidate } from "@/lib/types"

interface TradesScreenProps {
  aiCandidate?: TradeCandidate | null
}

export function TradesScreen({ aiCandidate }: TradesScreenProps) {
  const { state } = useTrade()
  const [notification, setNotification] = useState<string | null>(null)
  
  // Combine AI candidate with mock candidates, putting AI first
  const candidates = aiCandidate 
    ? [aiCandidate, ...mockCandidates.filter(c => c.ticker !== aiCandidate.ticker)]
    : mockCandidates

  const hasGoTrades = candidates.some((c) => c.status === "GO")

  const handleTradeComplete = () => {
    if (state.lastResult) {
      setNotification(state.lastResult.message)
      setTimeout(() => setNotification(null), 3000)
    }
  }

  if (!hasGoTrades) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 text-6xl">-</div>
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
          Based on AI Infrastructure - Scanned {mockRadarData.lastScan}
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`rounded-lg px-3 py-2.5 ${
          state.lastResult?.success 
            ? "bg-accent/10 border border-accent/30" 
            : "bg-danger/10 border border-danger/30"
        }`}>
          <p className={`text-sm ${state.lastResult?.success ? "text-accent" : "text-danger"}`}>
            {notification}
          </p>
          {state.lastResult?.reasonCode && (
            <p className="mt-1 text-[11px] font-mono text-muted-foreground">
              reasonCode: {state.lastResult.reasonCode}
            </p>
          )}
        </div>
      )}

      {/* AI Badge if we have an AI-analyzed trade */}
      {aiCandidate && (
        <div className="rounded-lg bg-accent/5 border border-accent/20 px-3 py-2">
          <p className="text-xs text-accent">
            AI Swarm Analysis Complete - Groq + OpenAI + Claude
          </p>
        </div>
      )}

      {/* Trade Cards */}
      <div className="space-y-4">
        {candidates.map((candidate) => (
          <TradeCard 
            key={candidate.ticker} 
            candidate={candidate} 
            onTradeComplete={handleTradeComplete}
          />
        ))}
      </div>
    </div>
  )
}
