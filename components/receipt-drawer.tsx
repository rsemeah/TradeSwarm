"use client"

import { useState } from "react"
import type { ProofBundle } from "@/lib/types/proof"
import type { TradeScoringDetail } from "@/lib/types"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReceiptData {
  proofBundle: ProofBundle
  executedAt: Date
  isSimulation: boolean
  aiConsensus?: {
    groq?: { decision: string; confidence: number; reasoning: string }
    openai?: { decision: string; confidence: number; reasoning: string }
    anthropic?: { decision: string; confidence: number; reasoning: string }
    finalVerdict: string
    consensusStrength: number
  }
  scoring?: TradeScoringDetail
  gates?: {
    name: string
    passed: boolean
    value: string
    threshold: string
  }[]
}

// Locked contract props (baseline composition surface)
interface BaseReceiptDrawerProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

// Extended props (current implementation)
interface ExtendedReceiptDrawerProps {
  isOpen?: boolean
  onClose?: () => void
  receipt?: ReceiptData | null
}

type ReceiptDrawerProps = BaseReceiptDrawerProps & ExtendedReceiptDrawerProps

type TabId = "summary" | "regime" | "risk" | "deliberation" | "scoring"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function verdictColor(v: string) {
  if (v === "GO") return "bg-accent/20 text-accent"
  if (v === "WAIT") return "bg-warning/20 text-warning"
  return "bg-danger/20 text-danger"
}

function statusColor(s: string) {
  if (s === "ok") return "text-accent"
  if (s === "degraded") return "text-warning"
  return "text-danger"
}

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
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
  const [expandedRound, setExpandedRound] = useState<number | null>(0)

  // Support both prop signatures
  const isVisible = open ?? isOpen ?? false
  const handleClose = () => {
    if (onOpenChange) onOpenChange(false)
    if (onClose) onClose()
  }

  // If using composition pattern (children), render shell only
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

  // Legacy implementation with receipt data
  if (!isVisible || !receipt) return null

  const { proofBundle: pb, executedAt } = receipt
  const fd = pb.finalDecision

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
      {/* Backdrop */}
      <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Drawer */}
      <div
        className="absolute bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-hidden rounded-t-2xl bg-card"
        style={{ animation: "slideUp 0.3s ease-out" }}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="border-b border-border px-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    pb.action === "simulate"
                      ? "bg-warning/20 text-warning"
                      : pb.action === "preview"
                        ? "bg-muted text-muted-foreground"
                        : "bg-accent/20 text-accent"
                  }`}
                >
                  {pb.action}
                </span>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${verdictColor(fd.action)}`}>
                  {fd.action}
                </span>
                {pb.engineDegraded && (
                  <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-warning/20 text-warning">
                    degraded
                  </span>
                )}
              </div>
              <h2 className="mt-1.5 font-mono text-2xl font-bold text-foreground">{pb.ticker}</h2>
              <p className="text-[10px] text-muted-foreground">
                {executedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} ET &nbsp;·&nbsp;v
                {pb.engineVersion}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-xl font-bold text-accent">
                ${fd.recommendedAmount?.toLocaleString() ?? "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">recommended</p>
            </div>
          </div>

          {/* Warnings banner */}
          {pb.warnings.length > 0 && (
            <div className="mt-2 rounded bg-warning/10 px-2 py-1.5 text-[10px] text-warning space-y-0.5">
              {pb.warnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-border">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`shrink-0 px-3 py-3 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                activeTab === id
                  ? "border-b-2 border-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[52vh] overflow-y-auto p-4 space-y-3">
          {/* SUMMARY TAB */}
          {activeTab === "summary" && (
            <>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Trust Score</span>
                  <span className="font-mono text-lg font-bold text-foreground">{fd.trustScore}/100</span>
                </div>
                <ScoreBar value={fd.trustScore} />
              </div>

              <div
                className={`rounded-lg border p-3 ${
                  pb.preflight.pass ? "border-accent/30 bg-accent/5" : "border-danger/30 bg-danger/5"
                }`}
              >
                <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Preflight</p>
                <p className="text-xs text-foreground">{pb.preflight.reason}</p>
                <div className="mt-2 space-y-1">
                  {pb.preflight.gates.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <span className={g.passed ? "text-accent" : "text-danger"}>{g.passed ? "✓" : "✗"}</span>
                      <span className="text-muted-foreground">{g.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {fd.bullets && (
                <>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Why This Trade</p>
                    <p className="text-xs leading-relaxed text-foreground">{fd.bullets.why}</p>
                  </div>
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                    <p className="mb-1 text-[10px] font-bold text-warning">Risk Note</p>
                    <p className="text-xs leading-relaxed text-foreground">{fd.bullets.risk}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Position</p>
                    <p className="text-xs leading-relaxed text-foreground">{fd.bullets.amount}</p>
                  </div>
                </>
              )}

              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">Engine Events</p>
                <div className="space-y-1">
                  {pb.events.map((ev, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-foreground">{ev.name}</span>
                      <div className="flex items-center gap-2">
                        {ev.durationMs !== undefined && <span className="text-muted-foreground">{ev.durationMs}ms</span>}
                        <span className={statusColor(ev.status)}>{ev.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* REGIME TAB */}
          {activeTab === "regime" && (
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
                  <span className="text-xs text-muted-foreground">Regime Confidence</span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    {(pb.regime.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <ScoreBar value={pb.regime.confidence * 100} />
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">Signals</p>
                <div className="space-y-1.5">
                  <FactorRow label="SMA20" value={pb.regime.inputs.sma20} />
                  <FactorRow label="SMA50" value={pb.regime.inputs.sma50} />
                  <FactorRow label="RSI14" value={pb.regime.inputs.rsi14} />
                  <FactorRow label="ATR14" value={pb.regime.inputs.atr14} />
                  <FactorRow label="5d Change %" value={pb.regime.inputs.priceChange5d} signed />
                  <FactorRow label="Volume Ratio" value={pb.regime.inputs.volumeRatio} />
                </div>
              </div>
            </>
          )}

          {/* RISK TAB */}
          {activeTab === "risk" && (
            <>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">Risk Simulation</p>
                <div className="space-y-1.5">
                  <FactorRow label="Avg Return" value={pb.risk.avgReturn * 100} signed />
                  <FactorRow label="Max Drawdown" value={pb.risk.maxDrawdown * 100} signed />
                  <FactorRow label="Sharpe Ratio" value={pb.risk.sharpe} />
                  <FactorRow label="Win Rate" value={pb.risk.winRate * 100} />
                  <FactorRow label="Profit Factor" value={pb.risk.profitFactor} />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">VaR Analysis</p>
                <div className="space-y-1.5">
                  <FactorRow label="VaR 95%" value={pb.risk.var95 * 100} signed />
                  <FactorRow label="VaR 99%" value={pb.risk.var99 * 100} signed />
                </div>
              </div>

              {pb.risk.regimeAdjustment && (
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                  <p className="mb-1 text-[10px] font-bold text-accent">Regime Adjustment</p>
                  <p className="text-xs text-foreground">{pb.risk.regimeAdjustment}</p>
                </div>
              )}
            </>
          )}

          {/* DELIBERATION TAB */}
          {activeTab === "deliberation" && (
            <>
              {pb.modelRounds.map((round, i) => (
                <div key={i} className="rounded-lg border border-border bg-background overflow-hidden">
                  <button
                    onClick={() => setExpandedRound(expandedRound === i ? null : i)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-foreground">{round.model}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${verdictColor(round.decision)}`}>
                        {round.decision}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{round.confidence}%</span>
                      <svg
                        className={`h-4 w-4 text-muted-foreground transition-transform ${expandedRound === i ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {expandedRound === i && (
                    <div className="border-t border-border p-3">
                      <p className="text-xs leading-relaxed text-foreground">{round.reasoning}</p>
                      <p className="mt-2 text-[9px] text-muted-foreground">{round.durationMs}ms</p>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* SCORING TAB */}
          {activeTab === "scoring" && (
            <>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Final Trust Score</span>
                  <span className="font-mono text-lg font-bold text-foreground">{fd.trustScore}/100</span>
                </div>
                <ScoreBar value={fd.trustScore} />
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">Score Factors</p>
                <div className="space-y-1.5">
                  {pb.scoring.factors.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">{f.name}</span>
                      <span className={`font-mono ${f.impact >= 0 ? "text-accent" : "text-danger"}`}>
                        {f.impact >= 0 ? "+" : ""}
                        {f.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Scoring Policy</p>
                <p className="text-xs text-foreground">{pb.scoring.formula.policy}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex items-center justify-between">
          <button onClick={handleExport} className="text-[10px] text-muted-foreground hover:text-foreground">
            Export JSON
          </button>
          <p className="text-[9px] text-muted-foreground font-mono">{pb.requestId}</p>
        </div>
      </div>
    </div>
  )
}
