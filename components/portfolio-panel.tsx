import type { PortfolioData } from "@/lib/types"
import { ProgressBar } from "./progress-bar"
import { getDrawdownColor } from "@/lib/utils"

interface PortfolioPanelProps {
  portfolio: PortfolioData
}

export function PortfolioPanel({ portfolio }: PortfolioPanelProps) {
  const riskColor = getDrawdownColor(portfolio.openRisk, portfolio.maxRisk)
  const drawdownColor = getDrawdownColor(
    portfolio.weeklyDrawdown,
    portfolio.maxDrawdown
  )

  return (
    <div className="rounded-card border border-border bg-card p-4">
      <h2 className="mb-4 text-[13px] font-bold text-foreground">Portfolio</h2>

      <div className="space-y-3">
        {/* Open Positions */}
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground">Open Positions</span>
          <span className="font-mono text-[12px] text-foreground">
            {portfolio.openPositions}
          </span>
        </div>

        {/* Open Risk */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">Open Risk</span>
            <span className="font-mono text-[12px] text-foreground">
              {portfolio.openRisk}% / {portfolio.maxRisk}% max
            </span>
          </div>
          <ProgressBar
            value={portfolio.openRisk}
            max={portfolio.maxRisk}
            color={riskColor}
          />
        </div>

        {/* Weekly Drawdown */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">
              Weekly Drawdown
            </span>
            <span className="font-mono text-[12px] text-foreground">
              {portfolio.weeklyDrawdown}% / {portfolio.maxDrawdown}%
            </span>
          </div>
          <ProgressBar
            value={portfolio.weeklyDrawdown}
            max={portfolio.maxDrawdown}
            color={drawdownColor}
          />
        </div>

        {/* Trades Today */}
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground">Trades Today</span>
          <span className="font-mono text-[12px] text-foreground">
            {portfolio.tradesToday} / {portfolio.maxTrades} max
          </span>
        </div>
      </div>

      <div className="my-4 h-px bg-border" />

      {/* Swarm Status */}
      <div>
        <span className="text-[12px] text-muted-foreground">Swarm Status</span>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              portfolio.swarmActive
                ? "animate-pulse-dot bg-accent-green"
                : "bg-muted-foreground"
            }`}
          />
          <span
            className={`font-mono text-[13px] ${
              portfolio.swarmActive ? "text-accent-green" : "text-muted-foreground"
            }`}
          >
            {portfolio.swarmActive ? "Active" : "Inactive"}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {portfolio.swarmMode}
        </p>
      </div>
    </div>
  )
}
