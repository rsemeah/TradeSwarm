import type { PortfolioData } from "@/lib/types"
import { ProgressBar } from "./progress-bar"
import { getDrawdownColor } from "@/lib/utils"

interface HeaderProps {
  portfolio: PortfolioData
}

export function Header({ portfolio }: HeaderProps) {
  const drawdownPercent = portfolio.weeklyDrawdown
  const maxDrawdown = portfolio.maxDrawdown
  const drawdownColor = getDrawdownColor(drawdownPercent, maxDrawdown)

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 md:px-6">
      {/* Logo */}
      <h1 className="font-mono text-lg font-bold text-foreground">TradeSwarm</h1>

      {/* Right side stats */}
      <div className="flex flex-wrap items-center gap-4 md:gap-6">
        {/* Balance */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted-foreground">Balance:</span>
          <span className="font-mono text-sm text-foreground">
            {portfolio.balance}
          </span>
        </div>

        {/* Day P&L */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted-foreground">Day P&L:</span>
          <span
            className={`font-mono text-sm ${
              portfolio.dayPnlPositive ? "text-accent-green" : "text-accent-red"
            }`}
          >
            {portfolio.dayPnl}
          </span>
        </div>

        {/* Drawdown Meter */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">
            Drawdown {drawdownPercent}% / {maxDrawdown}%
          </span>
          <ProgressBar
            value={drawdownPercent}
            max={maxDrawdown}
            color={drawdownColor}
            width={120}
            height={4}
          />
        </div>
      </div>
    </header>
  )
}
