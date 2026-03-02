"use client"

import { useState } from "react"
import type { ProofBundle } from "@/lib/types/proof"
import type { TradeScoringDetail } from "@/lib/types"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReceiptData {
  proofBundle: ProofBundle
  executedAt: Date
  isSimulation: boolean
  scoring?: TradeScoringDetail
  gates?: {
    name: string
    passed: boolean
    value: string
    threshold: string
  }[]
}

interface ReceiptDrawerProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
  isOpen?: boolean
  onClose?: () => void
  receipt?: ReceiptData | null
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

function FactorRow({ label, value, signed = false }: { label: string; value: number; signed?: boolean }) {
  const display = signed ? (value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2)) : value.toFixed(2)
  const color = signed ? (value >= 0 ? "text-accent" : "text-danger") : "text-foreground"
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs font-medium ${color}`}>{display}</span>
    </div>
  )
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export function ReceiptDrawer({
  open,
  onOpenChange,
  children,
  isOpen,
  onClose,
  receipt,
}: ReceiptDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("summary")
  const [expandedRound, setExpandedRound] = useState<number | null>(null)

  const isVisible = open ?? isOpen ?? false
  const handleClose = () => {
    if (onOpenChange) onOpenChange(false)
    if (onClose) onClose()
  }

  // Composition pattern (children)
  if (children !== undefined) {
    if (!isVisible) return null
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
        <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-t-2xl bg-card" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-sm font-semibold text-foreground">RECEIPT</h2>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    )
  }

  // Standard receipt view
  if (!isVisible || !receipt) return null

  const { proofBundle: pb, executedAt } = receipt
  const fd = pb.finalDecision

  const tabs: { id: TabId; label: string }[] = [
    { id: "summary", label: "Summary" },
    { id: "regime", label: "Regime" },
    { id: "risk", label: "Risk" },
    { id: "deliberation", label: "AI" },
    { id: "scoring", label: "Score" },
  ]

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-hidden rounded-t-2xl bg-card">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="border-b border-border px-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${verdictColor(fd.action)}`}>
                  {fd.action}
                </span>
              </div>
              <h2 className="mt-1.5 font-mono text-2xl font-bold text-foreground">{pb.ticker}</h2>
              <p className="text-[10px] text-muted-foreground">
                {executedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} ET · v{pb.engineVersion}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-xl font-bold text-accent">
                ${fd.recommendedAmount?.toLocaleString() ?? "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">recommended</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
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

        {/* Content */}
        <div className="max-h-[52vh] space-y-3 overflow-y-auto p-4 text-xs">
          {activeTab === "summary" && (
            <>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-muted-foreground">Reason</p>
                <p className="mt-1 text-foreground">{fd.reason}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Trust Score</span>
                  <span className="font-mono font-bold text-foreground">{fd.trustScore}/100</span>
                </div>
                <ScoreBar value={fd.trustScore} />
              </div>
            </>
          )}

          {activeTab === "regime" && pb.regime && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Trend", value: pb.regime.trend },
                  { label: "Volatility", value: pb.regime.volatility },
                  { label: "Momentum", value: pb.regime.momentum },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-border bg-background p-3">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="mt-0.5 font-mono text-sm font-bold capitalize text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-mono font-bold text-foreground">
                    {(pb.regime.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <ScoreBar value={pb.regime.confidence * 100} />
              </div>
            </>
          )}

          {activeTab === "risk" && pb.risk && (
            <>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">Risk Metrics</p>
                <div className="space-y-1.5">
                  <FactorRow label="Avg Return" value={pb.risk.avgReturn * 100} signed />
                  <FactorRow label="Max Drawdown" value={pb.risk.maxDrawdown * 100} signed />
                  <FactorRow label="Sharpe Ratio" value={pb.risk.sharpe} />
                  <FactorRow label="Win Rate" value={pb.risk.winRate * 100} />
                </div>
              </div>
            </>
          )}

          {activeTab === "deliberation" && pb.modelRounds && (
            <>
              {pb.modelRounds.map((round, i) => (
                <div key={i} className="overflow-hidden rounded-lg border border-border bg-background">
                  <button
                    onClick={() => setExpandedRound(expandedRound === i ? null : i)}
                    className="flex w-full items-center justify-between p-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-foreground">{round.model}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${verdictColor(round.decision)}`}>
                        {round.decision}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{round.confidence}%</span>
                  </button>
                  {expandedRound === i && (
                    <div className="border-t border-border p-3">
                      <p className="text-xs leading-relaxed text-foreground">{round.reasoning}</p>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {activeTab === "scoring" && (
            <>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Final Trust Score</span>
                  <span className="font-mono text-lg font-bold text-foreground">{fd.trustScore}/100</span>
                </div>
                <ScoreBar value={fd.trustScore} />
              </div>
              {pb.scoring?.factors && (
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">Score Factors</p>
                  <div className="space-y-1.5">
                    {pb.scoring.factors.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">{f.name}</span>
                        <span className={`font-mono ${f.impact >= 0 ? "text-accent" : "text-danger"}`}>
                          {f.impact >= 0 ? "+" : ""}{f.impact}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <p className="text-center text-[9px] text-muted-foreground">
            Request ID: {pb.requestId}
          </p>
        </div>
      </div>
    </div>
  )
}
