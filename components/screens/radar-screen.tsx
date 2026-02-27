"use client"

import { ThemeCard } from "@/components/theme-card"
import { mockThemes, mockRadarData } from "@/lib/mock-data"

interface RadarScreenProps {
  onNavigateToTrades: () => void
}

export function RadarScreen({ onNavigateToTrades }: RadarScreenProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-lg text-foreground">
          {mockRadarData.greeting} <span className="inline">👋</span>
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Here&apos;s what&apos;s heating up today
        </p>
      </div>

      {/* Training Wheels Banner */}
      <div className="rounded-lg bg-warning px-3 py-2.5">
        <p className="text-sm font-medium text-background">
          🛡 Training Wheels ON · Max 1 trade/day · Paper mode
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
            onSeeTrade={onNavigateToTrades}
          />
        ))}
      </div>

      {/* Last Scan */}
      <p className="text-center text-[11px] text-muted-foreground">
        Last scan: {mockRadarData.lastScan} · Next: {mockRadarData.nextScan}
      </p>
    </div>
  )
}
