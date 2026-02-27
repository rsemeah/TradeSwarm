"use client"

import { mockPortfolio } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"

export function MoneyScreen() {
  const portfolio = mockPortfolio
  const progressPct = (portfolio.paperTradesCompleted / portfolio.paperTradesRequired) * 100
  const drawdownUsedPct = (portfolio.drawdownPct / portfolio.drawdownLimitPct) * 100

  return (
    <div className="space-y-4">
      {/* Header */}
      <h1 className="text-lg font-bold text-foreground">My Money</h1>

      {/* Balance Card */}
      <div className="rounded-[10px] border border-border bg-card p-4">
        <p className="mb-1 text-xs text-muted-foreground">Practice Balance</p>
        <p className="font-mono text-[32px] font-bold text-foreground">
          {formatCurrency(portfolio.balance)}
        </p>
        <p className="font-mono text-base text-accent">
          +{formatCurrency(portfolio.dayPnl)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Paper mode · Not real money
        </p>
      </div>

      {/* Safety Meter Card */}
      <div className="rounded-[10px] border border-border bg-card p-4">
        <h2 className="mb-3 text-[13px] font-bold text-foreground">Safety Status</h2>

        {/* Drawdown Bar */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Safety Buffer</span>
            <span className="text-xs text-foreground">{portfolio.drawdownPct}% used</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${drawdownUsedPct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Stops trading at {portfolio.drawdownLimitPct}%
          </p>
        </div>

        {/* Today's trades */}
        <p className="mb-4 text-xs text-muted-foreground">
          {portfolio.tradesToday} of {portfolio.tradesTodayMax} allowed today
        </p>

        {/* Safety Mode Selector */}
        <div className="flex gap-2">
          <button
            className={`flex-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
              portfolio.safetyMode === "training_wheels"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted-foreground"
            }`}
          >
            🛡 Training Wheels
          </button>
          <button className="flex-1 rounded-full border border-border px-3 py-2 text-xs font-medium text-muted-foreground opacity-50">
            ⚡ Normal
          </button>
          <button className="flex-1 rounded-full border border-border px-3 py-2 text-xs font-medium text-muted-foreground opacity-50">
            🚀 Pro
          </button>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Unlock Normal after 200 practice trades
        </p>
      </div>

      {/* Progress Card */}
      <div className="rounded-[10px] border border-border bg-card p-4">
        <h2 className="mb-3 text-[13px] font-bold text-foreground">Road to Real Money</h2>

        {/* Progress Bar */}
        <div className="mb-4">
          <p className="mb-1 text-[11px] text-muted-foreground">
            {portfolio.paperTradesCompleted} / {portfolio.paperTradesRequired} practice trades
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-danger">✗</span>
            <span>200 practice trades completed</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-danger">✗</span>
            <span>Max loss stayed under 15%</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-danger">✗</span>
            <span>Wins matching expectations</span>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="rounded-[10px] border border-border bg-card p-4">
        <h2 className="mb-3 text-[13px] font-bold text-foreground">This Week</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Trades</p>
            <p className="font-mono text-lg font-bold text-foreground">{portfolio.weekStats.trades}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Wins</p>
            <p className="font-mono text-lg font-bold text-foreground">{portfolio.weekStats.wins}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="font-mono text-lg font-bold text-foreground">{portfolio.weekStats.winRatePct}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Gain</p>
            <p className="font-mono text-lg font-bold text-accent">+${portfolio.weekStats.avgGainDollars}</p>
          </div>
        </div>
      </div>

      {/* Daily Summary Card */}
      <div className="rounded-[10px] border border-border bg-card p-4">
        <h2 className="mb-2 text-[13px] font-bold text-foreground">Today&apos;s Summary</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {portfolio.dailySummary}
        </p>
      </div>
    </div>
  )
}
