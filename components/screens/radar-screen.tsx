"use client"

import { useState } from "react"
import { ThemeCard } from "@/components/theme-card"
import { mockThemes, mockRadarData } from "@/lib/mock-data"
import { useTrade } from "@/lib/trade-context"
import type { TradeCandidate, Theme } from "@/lib/types"

interface RadarScreenProps {
  onNavigateToTrades: (aiCandidate?: TradeCandidate) => void
}

export function RadarScreen({ onNavigateToTrades }: RadarScreenProps) {
  const { state, analyzeTheme } = useTrade()
  const [notification, setNotification] = useState<string | null>(null)

  const handleSeeBestTrade = async (theme: Theme) => {
    setNotification(`Analyzing ${theme.name} with AI swarm...`)
    
    const candidate = await analyzeTheme(theme)
    
    if (candidate) {
      setNotification(null)
      onNavigateToTrades(candidate)
    } else {
      setNotification("Analysis failed. Using fallback data.")
      setTimeout(() => {
        setNotification(null)
        onNavigateToTrades()
      }, 1500)
    }
  }

  const handleWatch = () => {
    setNotification("Added to watchlist")
    setTimeout(() => setNotification(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-lg text-foreground">
          {mockRadarData.greeting}
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Here&apos;s what&apos;s heating up today
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className="rounded-lg bg-accent/10 border border-accent/30 px-3 py-2.5">
          <p className="text-sm text-accent">{notification}</p>
        </div>
      )}

      {/* Training Wheels Banner */}
      <div className="rounded-lg bg-warning px-3 py-2.5">
        <p className="text-sm font-medium text-background">
          Training Wheels ON - Max 1 trade/day - Paper mode
        </p>
        <p className="mt-0.5 text-[11px] text-background/70">
          Turn off after 200 trades
        </p>
      </div>

      {/* Theme Cards */}
      <div className="space-y-3">
        {mockThemes.map((theme) => (
          <ThemeCard
            key={theme.name}
            theme={theme}
            onSeeTrade={() => handleSeeBestTrade(theme)}
            onWatch={handleWatch}
          />
        ))}
      </div>

      {/* Loading indicator when analyzing */}
      {state.analysisInProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="rounded-lg bg-card border border-border p-6 text-center">
            <div className="mb-4 h-8 w-8 mx-auto animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-foreground">
              AI Swarm analyzing {state.analysisInProgress}...
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Groq + OpenAI + Claude
            </p>
          </div>
        </div>
      )}

      {/* Last Scan */}
      <p className="text-center text-[11px] text-muted-foreground">
        Last scan: {mockRadarData.lastScan} - Next: {mockRadarData.nextScan}
      </p>
    </div>
  )
}
