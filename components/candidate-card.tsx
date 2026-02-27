"use client"

import { useState } from "react"
import type { TradeCandidate } from "@/lib/types"
import { GrowthScoreGauge } from "./growth-score-gauge"
import { Badge } from "./badge"
import { AuditPanel } from "./audit-panel"

interface CandidateCardProps {
  candidate: TradeCandidate
}

export function CandidateCard({ candidate }: CandidateCardProps) {
  const [showAudit, setShowAudit] = useState(false)

  const toggleAudit = () => setShowAudit(!showAudit)

  return (
    <div className="relative rounded-card border border-border bg-card p-4">
      {/* Expand icon */}
      <button
        onClick={toggleAudit}
        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-border hover:text-foreground"
        aria-label="Toggle audit panel"
      >
        <span className="text-sm">{showAudit ? "⊖" : "⊕"}</span>
      </button>

      {/* Row 1: Ticker + Strategy */}
      <div className="mb-4 flex items-baseline justify-between pr-8">
        <span className="font-mono text-xl font-bold text-foreground">
          {candidate.ticker}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {candidate.strategy} · {candidate.dte} DTE
        </span>
      </div>

      {/* Row 2: Growth Score Gauge + Core Stats */}
      <div className="mb-4 flex items-center gap-6">
        <GrowthScoreGauge score={candidate.growthScore} />
        <div className="flex flex-col gap-1">
          <span className="font-mono text-sm text-accent-green">
            ELR {candidate.elr ?? "—"}
          </span>
          <span className="font-mono text-[13px] text-foreground">
            POP {candidate.pop ?? "—"}
          </span>
        </div>
      </div>

      {/* Row 3: Badge Row */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge variant={candidate.regimeStatus === "PASS" ? "green" : "red"}>
          {candidate.regimeStatus}
        </Badge>
        <Badge>Liq {candidate.liquidity.toFixed(2)}</Badge>
        <Badge>Impact: {candidate.impact}</Badge>
      </div>

      {/* Row 4: Kelly Allocation Box */}
      <div className="mb-3 rounded-badge border border-border p-2">
        {candidate.allocation ? (
          <span className="font-mono text-[13px] font-bold text-accent-green">
            Allocate {candidate.allocation} · {candidate.riskAmount} risk
          </span>
        ) : (
          <span className="font-mono text-[13px] text-muted-foreground">—</span>
        )}
      </div>

      {/* Row 5: Rationale */}
      <p className="mb-3 text-[11px] italic text-muted-foreground">
        {candidate.rationale}
      </p>

      {/* Row 6: Top 3 Signal Drivers */}
      <div className="mb-4 flex flex-wrap gap-2">
        {candidate.drivers.map((driver, index) => (
          <span
            key={index}
            className="rounded-badge bg-border px-2 py-0.5 text-[10px] text-muted-foreground"
          >
            {driver}
          </span>
        ))}
      </div>

      {/* Audit Panel (expandable) */}
      {showAudit && candidate.audit && (
        <AuditPanel audit={candidate.audit} onClose={toggleAudit} />
      )}

      {/* Row 7: Action Buttons */}
      <div className="mt-3 flex gap-2">
        {candidate.status === "FIRE" && (
          <button className="flex-1 rounded-badge bg-accent-green px-4 py-2 font-mono text-sm font-bold text-background hover:bg-accent-green/90">
            FIRE TRADE
          </button>
        )}
        {candidate.status === "WATCH" && (
          <button
            disabled
            className="flex-1 cursor-not-allowed rounded-badge bg-border px-4 py-2 font-mono text-sm text-muted-foreground opacity-60"
          >
            Monitoring
          </button>
        )}
        {candidate.status === "BLOCK" && (
          <button
            disabled
            className="flex-1 cursor-not-allowed rounded-badge bg-[#1a1a1a] px-4 py-2 font-mono text-sm text-muted-foreground opacity-50"
          >
            Blocked
          </button>
        )}
        <button
          onClick={toggleAudit}
          className="flex-1 rounded-badge border border-border bg-transparent px-4 py-2 font-mono text-sm text-muted-foreground hover:border-muted-foreground hover:text-foreground"
        >
          View Audit Trail
        </button>
      </div>
    </div>
  )
}
