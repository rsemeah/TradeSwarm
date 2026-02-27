"use client"

import type { Theme } from "@/lib/types"

interface ThemeCardProps {
  theme: Theme
  onSeeTrade: () => void
}

function HeatBadge({ heat }: { heat: Theme["heat"] }) {
  const config = {
    hot: { bg: "bg-accent", text: "text-background", label: "Hot", icon: "\uD83D\uDD25" },
    warming: { bg: "bg-warning", text: "text-background", label: "Warming", icon: "\uD83D\uDCC8" },
    quiet: { bg: "bg-muted", text: "text-muted-foreground", label: "Quiet", icon: "\uD83D\uDE34" },
  }
  const { bg, text, label, icon } = config[heat]

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${bg} ${text}`}>
      {icon} {label}
    </span>
  )
}

export function ThemeCard({ theme, onSeeTrade }: ThemeCardProps) {
  return (
    <div className="rounded-[10px] border border-border bg-card p-4">
      {/* Row 1: Theme name + Heat badge */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-foreground">{theme.name}</h3>
        <HeatBadge heat={theme.heat} />
      </div>

      {/* Row 2: Tickers */}
      <div className="mb-3 flex flex-wrap gap-2">
        {theme.tickers.map((ticker) => (
          <span
            key={ticker}
            className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
          >
            {ticker}
          </span>
        ))}
      </div>

      {/* Row 3: Coach brief */}
      <p className="mb-4 text-xs italic text-muted-foreground leading-relaxed">
        {theme.brief}
      </p>

      {/* Row 4: Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onSeeTrade}
          className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          See Best Trade →
        </button>
        <button className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted">
          Watch Only
        </button>
      </div>
    </div>
  )
}
