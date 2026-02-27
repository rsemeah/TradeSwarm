"use client"

import { useState } from "react"
import type { TradeCandidate } from "@/lib/types"
import { getTrustScoreColor } from "@/lib/utils"
import { useTrade } from "@/lib/trade-context"

interface TradeCardProps {
  candidate: TradeCandidate
  onTradeComplete?: () => void
}

function StatusBadge({ status }: { status: TradeCandidate["status"] }) {
  const config = {
    GO: { bg: "bg-accent", text: "text-background", glow: "shadow-[0_0_12px_rgba(0,255,136,0.4)]" },
    WAIT: { bg: "bg-warning", text: "text-background", glow: "" },
    NO: { bg: "bg-danger", text: "text-foreground", glow: "" },
  }
  const { bg, text, glow } = config[status]

  return (
    <div className={`mx-auto mb-4 w-fit rounded-md px-6 py-2 text-base font-bold ${bg} ${text} ${glow}`}>
      {status}
    </div>
  )
}

function TrustMeter({ score, winLikelihood }: { score: number; winLikelihood: number | null }) {
  const color = getTrustScoreColor(score)

  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Trust Score</span>
        <span className="font-mono text-sm text-foreground">{score} / 100</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      {winLikelihood !== null && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Win Likelihood: {winLikelihood}%
        </p>
      )}
    </div>
  )
}

function BulletPoint({ type, text }: { type: "why" | "risk" | "amount"; text: string }) {
  const dotColor = {
    why: "bg-accent",
    risk: "bg-warning",
    amount: "bg-accent",
  }

  return (
    <div className="flex items-start gap-2">
      <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${dotColor[type]}`} />
      <p className="text-xs text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground uppercase">{type}:</span> {text}
      </p>
    </div>
  )
}

function AuditPanel({ candidate, view }: { candidate: TradeCandidate; view: "simple" | "advanced" }) {
  if (view === "simple") {
    const { auditSimple } = candidate
    return (
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Trust Score:</span>
          <span className="font-mono text-foreground">{auditSimple.trustScore} / 100</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Win Likelihood:</span>
          <span className="font-mono text-foreground">{auditSimple.winLikelihood}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Market Stability:</span>
          <span className="text-foreground">{auditSimple.marketStability}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Fill Quality:</span>
          <span className="text-foreground">{auditSimple.fillQuality}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Recommended:</span>
          <span className="font-mono text-foreground">{auditSimple.recommended}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Decision:</span>
          <span className="font-medium text-accent">{auditSimple.decision} ✓</span>
        </div>
      </div>
    )
  }

  const { auditAdvanced } = candidate
  return (
    <div className="space-y-2 text-xs">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Growth Score:</span>
        <span className="font-mono text-foreground">{auditAdvanced.growthScore.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Net ELR:</span>
        <span className="font-mono text-foreground">{auditAdvanced.netElr}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">POP Lower Bound:</span>
        <span className="font-mono text-foreground">{auditAdvanced.popLowerBound}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Kelly Final:</span>
        <span className="font-mono text-foreground">{auditAdvanced.kellyFinal}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Regime Score:</span>
        <span className="font-mono text-foreground">{auditAdvanced.regimeScore.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Liquidity Score:</span>
        <span className="font-mono text-foreground">{auditAdvanced.liquidityScore.toFixed(2)}</span>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-2 text-[11px] font-bold text-muted-foreground">GATE RESULTS</p>
        <div className="space-y-1">
          {auditAdvanced.gates.map((gate) => (
            <div key={gate.name} className="flex items-center justify-between">
              <span className="text-muted-foreground">{gate.name}</span>
              <span>{gate.passed ? "✓" : "✗"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TradeCard({ candidate, onTradeComplete }: TradeCardProps) {
  const [showAudit, setShowAudit] = useState(false)
  const [auditView, setAuditView] = useState<"simple" | "advanced">("simple")
  const { state, executeTrade, simulateTrade } = useTrade()

  const isGo = candidate.status === "GO"
  const isWait = candidate.status === "WAIT"
  const isNo = candidate.status === "NO"
  const isLoading = state.isLoading && state.currentAction?.trade?.ticker === candidate.ticker

  const handleExecute = async () => {
    await executeTrade(candidate)
    onTradeComplete?.()
  }

  const handleSimulate = async () => {
    await simulateTrade(candidate)
    onTradeComplete?.()
  }

  return (
    <div className="rounded-[10px] border border-border bg-card p-4">
      <StatusBadge status={candidate.status} />

      {/* Ticker + Strategy */}
      <div className="mb-4 text-center">
        <h3 className="font-mono text-[22px] font-bold text-foreground">{candidate.ticker}</h3>
        <p className="text-xs text-muted-foreground">{candidate.strategy}</p>
      </div>

      {/* Trust Meter */}
      <TrustMeter score={candidate.trustScore} winLikelihood={candidate.winLikelihoodPct} />

      {/* Bullets */}
      <div className="mb-4 space-y-2">
        <BulletPoint type="why" text={candidate.bullets.why} />
        <BulletPoint type="risk" text={candidate.bullets.risk} />
        <BulletPoint type="amount" text={candidate.bullets.amount} />
      </div>

      {/* Amount Box (only for GO) */}
      {isGo && candidate.amountDollars && (
        <div className="mb-4 rounded-lg border border-border p-3 text-center">
          <p className="font-mono text-[28px] font-bold text-accent">
            ${candidate.amountDollars}
          </p>
          <p className="text-[10px] text-muted-foreground">Recommended amount</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-3 space-y-2">
        {isGo && (
          <>
            <button 
              onClick={handleExecute}
              disabled={isLoading}
              className="w-full rounded-md bg-accent py-3 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Processing..." : "Execute Trade →"}
            </button>
            <button 
              onClick={handleSimulate}
              disabled={isLoading}
              className="w-full rounded-md border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Simulate First"}
            </button>
          </>
        )}
        {isWait && (
          <>
            <button className="w-full cursor-not-allowed rounded-md bg-muted py-3 text-sm font-medium text-muted-foreground opacity-50">
              Watching...
            </button>
            <button 
              onClick={handleSimulate}
              disabled={isLoading}
              className="w-full rounded-md border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Simulate Anyway"}
            </button>
          </>
        )}
        {isNo && (
          <>
            <button className="w-full cursor-not-allowed rounded-md bg-[#1a1a1a] py-3 text-sm font-medium text-muted-foreground opacity-50">
              Blocked
            </button>
            <button
              onClick={() => setShowAudit(!showAudit)}
              className="w-full rounded-md border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              Learn Why
            </button>
          </>
        )}
      </div>

      {/* Receipt Link */}
      {!isNo && (
        <button
          onClick={() => setShowAudit(!showAudit)}
          className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {showAudit ? "✕ Close receipt" : "See receipt ›"}
        </button>
      )}

      {/* Audit Panel */}
      {showAudit && (
        <div className="mt-4 rounded-lg border border-border bg-[#0f0f0f] p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground">Under the Hood</span>
            <div className="flex gap-1">
              <button
                onClick={() => setAuditView("simple")}
                className={`rounded px-2 py-1 text-[10px] transition-colors ${
                  auditView === "simple"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Simple
              </button>
              <button
                onClick={() => setAuditView("advanced")}
                className={`rounded px-2 py-1 text-[10px] transition-colors ${
                  auditView === "advanced"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Advanced
              </button>
            </div>
          </div>
          <AuditPanel candidate={candidate} view={auditView} />
        </div>
      )}
    </div>
  )
}
