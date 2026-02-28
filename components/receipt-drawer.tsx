"use client"

import { useState } from "react"
import type { ProofBundle } from "@/lib/types/proof"

export interface ReceiptData {
  proofBundle: ProofBundle
  executedAt: Date
  isSimulation: boolean
}

interface ReceiptDrawerProps {
  isOpen: boolean
  onClose: () => void
  receipt: ReceiptData | null
}

type TabId = "summary" | "regime" | "risk" | "deliberation" | "scoring"

function verdictColor(v: string) {
  if (v === "GO") return "bg-accent/20 text-accent"
  if (v === "WAIT") return "bg-warning/20 text-warning"
  return "bg-danger/20 text-danger"
}

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function ReceiptDrawer({ isOpen, onClose, receipt }: ReceiptDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("summary")

  if (!isOpen || !receipt) return null

  const { proofBundle: pb, executedAt } = receipt

  const tabs: { id: TabId; label: string }[] = [
    { id: "summary", label: "Summary" },
    { id: "regime", label: "Regime" },
    { id: "risk", label: "Risk" },
    { id: "deliberation", label: "AI Rounds" },
    { id: "scoring", label: "Score" },
  ]

  function handleExport() {
    const blob = new Blob([JSON.stringify(pb, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tradeswarm-proof-${pb.ticker}-${pb.requestId.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-hidden rounded-t-2xl bg-card">
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="border-b border-border px-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${verdictColor(pb.finalDecision.action)}`}>
                  {pb.finalDecision.action}
                </span>
                {pb.engineDegraded && (
                  <span className="rounded bg-warning/20 px-2 py-0.5 text-[10px] font-bold text-warning">degraded</span>
                )}
              </div>
              <h2 className="mt-1.5 font-mono text-2xl font-bold text-foreground">{pb.ticker}</h2>
              <p className="text-[10px] text-muted-foreground">
                {executedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} ET · v{pb.engineVersion}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-xl font-bold text-accent">${pb.finalDecision.recommendedAmount?.toLocaleString() ?? "—"}</p>
              <p className="text-[10px] text-muted-foreground">recommended</p>
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-3 py-3 text-[11px] font-medium uppercase tracking-wider ${
                activeTab === tab.id ? "border-b-2 border-accent text-foreground" : "text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-h-[52vh] space-y-3 overflow-y-auto p-4 text-xs">
          {activeTab === "summary" && (
            <>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-muted-foreground">Reason</p>
                <p className="mt-1 text-foreground">{pb.finalDecision.reason}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Trust Score</span>
                  <span className="font-mono font-bold text-foreground">{pb.finalDecision.trustScore}/100</span>
                </div>
                <ScoreBar value={pb.finalDecision.trustScore} />
              </div>
            </>
          )}

          {activeTab === "regime" && (
            <div className="rounded-lg border border-border bg-background p-3">
              <p>Trend: {pb.regime.trend}</p>
              <p>Volatility: {pb.regime.volatility}</p>
              <p>Momentum: {pb.regime.momentum}</p>
              <p>Confidence: {(pb.regime.confidence * 100).toFixed(0)}%</p>
            </div>
          )}

          {activeTab === "risk" && (
            <div className="rounded-lg border border-border bg-background p-3">
              <p>Risk level: {pb.risk.riskLevel}</p>
              <p>Kelly fraction: {pb.risk.kellyFraction.toFixed(3)}</p>
              <p>Position size: ${pb.risk.positionSizeRecommended.toFixed(2)}</p>
              <p>Max drawdown: {(pb.risk.maxDrawdown * 100).toFixed(2)}%</p>
            </div>
          )}

          {activeTab === "deliberation" && (
            <div className="space-y-2">
              {pb.deliberation.map((round) => (
                <div key={round.roundId} className="rounded-lg border border-border bg-background p-3">
                  <p className="font-semibold">{round.stage}</p>
                  <p className="text-muted-foreground">{round.outcome.reason}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "scoring" && (
            <div className="rounded-lg border border-border bg-background p-3">
              <p>Raw Avg: {pb.scoring.rawAvgScore.toFixed(2)}</p>
              <p>Agreement: {(pb.scoring.agreementRatio * 100).toFixed(1)}%</p>
              <p>Penalty: {(pb.scoring.penaltyFactor * 100).toFixed(1)}%</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border p-3">
          <button onClick={handleExport} className="flex-1 rounded-lg border border-border py-2.5 text-xs font-medium text-muted-foreground">
            Export Proof
          </button>
          <button onClick={onClose} className="flex-1 rounded-lg bg-muted py-2.5 text-xs font-medium text-foreground">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
