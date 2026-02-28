"use client"

import { useState } from "react"
import type { ProofBundle } from "@/lib/types/proof"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReceiptData {
  proofBundle: ProofBundle
  executedAt: Date
}

interface ReceiptDrawerProps {
  isOpen: boolean
  onClose: () => void
  receipt: ReceiptData | null
}

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

function FactorRow({
  label,
  value,
  signed = false,
}: {
  label: string
  value: number
  signed?: boolean
}) {
  const display = signed
    ? value >= 0
      ? `+${value.toFixed(2)}`
      : value.toFixed(2)
    : value.toFixed(2)
  const color = signed ? (value >= 0 ? "text-accent" : "text-danger") : "text-foreground"
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs font-medium ${color}`}>{display}</span>
    </div>
  )
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export function ReceiptDrawer({ isOpen, onClose, receipt }: ReceiptDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("summary")
  const [expandedRound, setExpandedRound] = useState<number | null>(0)

  if (!isOpen || !receipt) return null

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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-hidden rounded-t-2xl bg-card"
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
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${verdictColor(fd.action)}`}
                >
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
                {executedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} ET
                &nbsp;·&nbsp;v{pb.engineVersion}
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

          {/* ── SUMMARY ─────────────────────────────────────────────── */}
          {activeTab === "summary" && (
            <>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Trust Score</span>
                  <span className="font-mono text-lg font-bold text-foreground">
                    {fd.trustScore}/100
                  </span>
                </div>
                <ScoreBar value={fd.trustScore} />
              </div>

              <div
                className={`rounded-lg border p-3 ${
                  pb.preflight.pass ? "border-accent/30 bg-accent/5" : "border-danger/30 bg-danger/5"
                }`}
              >
                <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                  Preflight
                </p>
                <p className="text-xs text-foreground">{pb.preflight.reason}</p>
                <div className="mt-2 space-y-1">
                  {pb.preflight.gates.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <span className={g.passed ? "text-accent" : "text-danger"}>
                        {g.passed ? "✓" : "✗"}
                      </span>
                      <span className="text-muted-foreground">{g.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {fd.bullets && (
                <>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                      Why This Trade
                    </p>
                    <p className="text-xs leading-relaxed text-foreground">{fd.bullets.why}</p>
                  </div>
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                    <p className="mb-1 text-[10px] font-bold text-warning">Risk Note</p>
                    <p className="text-xs leading-relaxed text-foreground">{fd.bullets.risk}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                      Position
                    </p>
                    <p className="text-xs leading-relaxed text-foreground">{fd.bullets.amount}</p>
                  </div>
                </>
              )}

              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">
                  Engine Events
                </p>
                <div className="space-y-1">
                  {pb.events.map((ev, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-foreground">{ev.name}</span>
                      <div className="flex items-center gap-2">
                        {ev.durationMs !== undefined && (
                          <span className="text-muted-foreground">{ev.durationMs}ms</span>
                        )}
                        <span className={statusColor(ev.status)}>{ev.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── REGIME ──────────────────────────────────────────────── */}
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
                    <p className="mt-0.5 font-mono text-sm font-bold capitalize text-foreground">
                      {value}
                    </p>
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
                <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">
                  Signals
                </p>
                <div className="space-y-1.5">
                  <FactorRow label="SMA20" value={pb.regime.inputs.sma20} />
                  <FactorRow label="SMA50" value={pb.regime.inputs.sma50} />
                  <FactorRow label="RSI14" value={pb.regime.inputs.rsi14} />
                  <FactorRow label="ATR14" value={pb.regime.inputs.atr14} />
                  <FactorRow label="5d Change %" value={pb.regime.inputs.priceChange5d} signed />
                  <FactorRow label="Volume Ratio" value={pb.regime.inputs.volumeRatio} />
                </div>
              </div>

              {pb.marketContext.quote && (
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">
                    Live Quote
                  </p>
                  <div className="space-y-1.5">
                    <FactorRow label="Price" value={pb.marketContext.quote.price} />
                    <FactorRow label="Change %" value={pb.marketContext.quote.changePercent} signed />
                    <FactorRow
                      label="Volume / Avg"
                      value={
                        pb.marketContext.quote.avgVolume > 0
                          ? pb.marketContext.quote.volume / pb.marketContext.quote.avgVolume
                          : 0
                      }
                    />
                    <FactorRow label="SMA50" value={pb.marketContext.quote.sma50} />
                    <FactorRow label="SMA200" value={pb.marketContext.quote.sma200} />
                  </div>
                  <p className="mt-2 text-[9px] text-muted-foreground">
                    {pb.marketContext.quote.source} ·{" "}
                    {new Date(pb.marketContext.quote.fetchedAt).toLocaleTimeString()}
                    {pb.marketContext.providerHealth.cached ? " · cached" : ""}
                  </p>
                </div>
              )}

              {pb.marketContext.chain && (
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">
                    Options Chain
                  </p>
                  <div className="space-y-1.5">
                    <FactorRow
                      label="Put/Call Ratio"
                      value={pb.marketContext.chain.putCallRatio ?? 0}
                    />
                    <FactorRow label="Call Volume" value={pb.marketContext.chain.callVolume ?? 0} />
                    <FactorRow label="Put Volume" value={pb.marketContext.chain.putVolume ?? 0} />
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    Expirations: {pb.marketContext.chain.expirations.slice(0, 4).join(" · ")}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── RISK ────────────────────────────────────────────────── */}
          {activeTab === "risk" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[10px] text-muted-foreground">Risk Level</p>
                  <p
                    className={`mt-0.5 font-mono text-lg font-bold capitalize ${
                      pb.risk.riskLevel === "low"
                        ? "text-accent"
                        : pb.risk.riskLevel === "extreme"
                          ? "text-danger"
                          : "text-warning"
                    }`}
                  >
                    {pb.risk.riskLevel}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[10px] text-muted-foreground">Sharpe Ratio</p>
                  <p className="mt-0.5 font-mono text-lg font-bold text-foreground">
                    {pb.risk.sharpeRatio.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">
                  Monte Carlo (n={pb.risk.simCount})
                </p>
                <div className="space-y-2">
                  {[
                    { label: "10th pct (downside)", value: pb.risk.pct10, pos: false },
                    { label: "Median P&L", value: pb.risk.medianPL, pos: pb.risk.medianPL >= 0 },
                    { label: "90th pct (upside)", value: pb.risk.pct90, pos: true },
                    {
                      label: "Expected Return",
                      value: pb.risk.expectedReturn,
                      pos: pb.risk.expectedReturn >= 0,
                    },
                  ].map(({ label, value, pos }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                      <span
                        className={`font-mono text-xs font-bold ${pos ? "text-accent" : "text-danger"}`}
                      >
                        {value >= 0 ? "+" : ""}${value.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">
                  Position Sizing
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Kelly Fraction</span>
                    <span className="font-mono text-xs text-foreground">
                      {(pb.risk.kellyFraction * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Recommended Size</span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      ${pb.risk.positionSizeRecommended.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Max Drawdown</span>
                    <span className="font-mono text-xs font-bold text-danger">
                      {(pb.risk.maxDrawdown * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── DELIBERATION ────────────────────────────────────────── */}
          {activeTab === "deliberation" && (
            <>
              {pb.deliberation.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No deliberation rounds (engine blocked before AI stage)
                </p>
              ) : (
                pb.deliberation.map((round, ri) => (
                  <div
                    key={ri}
                    className="overflow-hidden rounded-lg border border-border bg-background"
                  >
                    <button
                      className="flex w-full items-center justify-between p-3 text-left"
                      onClick={() => setExpandedRound(expandedRound === ri ? null : ri)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                          {round.stage}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${verdictColor(round.outcome.decision)}`}
                        >
                          {round.outcome.decision}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {(round.outcome.consensusStrength * 100).toFixed(0)}% agree
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {expandedRound === ri ? "▲" : "▼"}
                        </span>
                      </div>
                    </button>

                    {expandedRound === ri && (
                      <div className="space-y-3 border-t border-border p-3">
                        <p className="text-[10px] text-muted-foreground">{round.outcome.reason}</p>
                        {round.outputs.map((o, oi) => (
                          <div
                            key={oi}
                            className="rounded border border-border/50 bg-background/50 p-2"
                          >
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-[10px] font-medium text-foreground">
                                {o.provider}
                                <span className="ml-1 text-muted-foreground">
                                  ({o.modelVersion})
                                </span>
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${verdictColor(o.decision)}`}
                              >
                                {o.decision}
                              </span>
                            </div>
                            <div className="mb-1.5 flex items-center gap-2">
                              <span className="text-[9px] text-muted-foreground">Confidence:</span>
                              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-accent"
                                  style={{ width: `${o.confidence}%` }}
                                />
                              </div>
                              <span className="font-mono text-[9px] text-foreground">
                                {o.confidence}%
                              </span>
                            </div>
                            {o.winLikelihoodPct !== null && (
                              <p className="mb-1 text-[9px] text-muted-foreground">
                                Win likelihood: {o.winLikelihoodPct}%
                              </p>
                            )}
                            <p className="text-[10px] leading-relaxed text-muted-foreground">
                              {o.reasoning}
                            </p>
                            <p className="mt-1 text-[9px] text-muted-foreground/60">{o.latencyMs}ms</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}

          {/* ── SCORING ─────────────────────────────────────────────── */}
          {activeTab === "scoring" && (
            <>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Final Trust Score</span>
                  <span className="font-mono text-2xl font-bold text-foreground">
                    {pb.scoring.trustScore}/100
                  </span>
                </div>
                <ScoreBar value={pb.scoring.trustScore} />
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">
                  Composition
                </p>
                <div className="space-y-2">
                  {[
                    { label: "Raw Avg Confidence", value: pb.scoring.rawAvgScore },
                    { label: "Agreement Ratio", value: pb.scoring.agreementRatio * 100 },
                    { label: "Penalty Factor", value: pb.scoring.penaltyFactor * 100 },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="flex justify-between">
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                        <span className="font-mono text-[10px] text-foreground">
                          {value.toFixed(0)}%
                        </span>
                      </div>
                      <ScoreBar value={value} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">
                  Factors
                </p>
                <div className="space-y-1.5">
                  <FactorRow
                    label={`Model Agreement (×${pb.scoring.weights.modelAgreement})`}
                    value={pb.scoring.factors.modelAgreement}
                  />
                  <FactorRow
                    label={`Provider Credibility (×${pb.scoring.weights.providerCredibility})`}
                    value={pb.scoring.factors.providerCredibility}
                  />
                  <FactorRow
                    label={`Regime Alignment (×${pb.scoring.weights.regimeAlignmentBonus})`}
                    value={pb.scoring.factors.regimeAlignmentBonus}
                    signed
                  />
                  <FactorRow
                    label={`Risk Penalty (×${pb.scoring.weights.riskPenalty})`}
                    value={pb.scoring.factors.riskPenalty}
                    signed
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                  Request ID
                </p>
                <p className="break-all font-mono text-[9px] text-muted-foreground">
                  {pb.requestId}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border p-3">
          <button
            onClick={handleExport}
            className="flex-1 rounded-lg border border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Export Proof
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-muted py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
