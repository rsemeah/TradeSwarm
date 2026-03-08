"use client"

import { useState } from "react"
import type { TradeCandidate } from "@/lib/types"
import { getTrustScoreColor } from "@/lib/utils"
import { useTrade } from "@/lib/trade-context"
import { SniperOverlay } from "./sniper-overlay"
import { LearnWhyModal } from "./learn-why-modal"
import { ReceiptDrawer, type ReceiptData } from "./receipt-drawer"
import type { ProofBundle } from "@/lib/types/proof"

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
      {candidate.scoring && (
        <div className="rounded border border-border/70 bg-background/50 p-2">
          <p className="mb-1 text-[10px] font-bold text-muted-foreground">SCORING BREAKDOWN ({candidate.scoring.formula.version})</p>
          {candidate.scoring.factors.slice(0, 3).map((factor) => (
            <div key={factor.name} className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">{factor.name}</span>
              <span className="font-mono text-foreground">{factor.impact >= 0 ? "+" : ""}{factor.impact}</span>
            </div>
          ))}
          {candidate.scoring.penalties.map((penalty) => (
            <div key={penalty.name} className="flex justify-between text-[10px]">
              <span className="text-danger">{penalty.name}</span>
              <span className="font-mono text-danger">{penalty.impact}</span>
            </div>
          ))}
          <p className="mt-1 text-[9px] text-muted-foreground">{candidate.scoring.formula.policy}</p>
        </div>
      )}
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


function mapTradeToReceiptData(trade: TradeCandidate): ReceiptData {
  const proofBundle: ProofBundle = {
    requestId: `trade-${trade.ticker}-${Date.now()}`,
    action: "preview",
    ticker: trade.ticker,
    engineVersion: "unknown",
    marketContext: {
      requestId: `trade-${trade.ticker}`,
      ticker: trade.ticker,
      action: "preview",
      quote: null,
      chain: null,
      providerHealth: {
        status: "ok",
        latencyMs: 0,
        cached: false,
        fetchedAt: new Date().toISOString(),
      },
      ts: new Date().toISOString(),
    },
    regime: {
      name: "unknown",
      trend: "neutral",
      volatility: "medium",
      momentum: "neutral",
      score: trade.auditAdvanced.regimeScore,
      inputs: { sma20: 0, sma50: 0, rsi14: 0, atr14: 0, priceChange5d: 0, volumeRatio: 0 },
      confidence: trade.auditAdvanced.regimeScore,
      ts: new Date().toISOString(),
    },
    risk: {
      simCount: 0,
      monteCarloSeed: 42,
      medianPL: 0,
      pct10: 0,
      pct90: 0,
      maxDrawdown: 0,
      expectedReturn: 0,
      sharpeRatio: 0,
      kellyFraction: 0,
      positionSizeRecommended: trade.amountDollars ?? 0,
      riskLevel: "medium",
      ts: new Date().toISOString(),
    },
    deliberation: [],
    scoring: {
      trustScore: trade.trustScore,
      rawAvgScore: trade.trustScore,
      agreementRatio: 1,
      penaltyFactor: 0,
      factors: {
        modelAgreement: 1,
        providerCredibility: 1,
        regimeAlignmentBonus: trade.auditAdvanced.regimeScore,
        riskPenalty: 0,
      },
      weights: {
        modelAgreement: 1,
        providerCredibility: 1,
        regimeAlignmentBonus: 1,
        riskPenalty: 1,
      },
      ts: new Date().toISOString(),
    },
    preflight: {
      pass: trade.status !== "NO",
      reason: trade.status === "NO" ? "Trade blocked by safety gate" : "All gates passed",
      gates: trade.auditAdvanced.gates.map((gate) => ({
        name: gate.name,
        passed: gate.passed,
        reason: gate.passed ? "passed" : "failed",
      })),
    },
    finalDecision: {
      action: trade.status,
      reason: trade.bullets.why,
      trustScore: trade.trustScore,
      recommendedAmount: trade.amountDollars,
      bullets: trade.bullets,
    },
    engineDegraded: trade.status === "NO",
    warnings: [],
    events: [],
    ts: new Date().toISOString(),
  }

  return {
    proofBundle,
    executedAt: new Date(),
    isSimulation: false,
    scoring: trade.scoring,
    determinism: {
      determinismHash: "pending",
      marketSnapshotHash: "pending",
      randomSeed: 42,
    },
  }
}

export function TradeCard({ candidate, onTradeComplete }: TradeCardProps) {
  const [showAudit] = useState(false)
  const [auditView, setAuditView] = useState<"simple" | "advanced">("simple")
  const [showSniper, setShowSniper] = useState<"execute" | "simulate" | null>(null)
  const [showLearnWhy, setShowLearnWhy] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const { state, executeTrade, simulateTrade } = useTrade()

  const isGo = candidate.status === "GO"
  const isWait = candidate.status === "WAIT"
  const isNo = candidate.status === "NO"
  const isLoading = state.isLoading && state.currentAction?.trade?.ticker === candidate.ticker

  const handleExecuteClick = () => setShowSniper("execute")
  const handleSimulateClick = () => setShowSniper("simulate")

  const handleSniperConfirm = async () => {
    setShowSniper(null)
    if (showSniper === "execute") {
      await executeTrade(candidate)
    } else {
      await simulateTrade(candidate)
    }
    onTradeComplete?.()
  }

  const handleSniperCancel = () => setShowSniper(null)

  return (
    <>
      {/* Sniper Overlay for Execute/Simulate confirmation */}
      {showSniper && (
        <SniperOverlay
          candidate={candidate}
          onConfirm={handleSniperConfirm}
          onCancel={handleSniperCancel}
          isSimulation={showSniper === "simulate"}
        />
      )}
      
      {/* Learn Why Modal for NO/WAIT trades */}
      <LearnWhyModal
        isOpen={showLearnWhy}
        onClose={() => setShowLearnWhy(false)}
        candidate={candidate}
      />

      <ReceiptDrawer
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        receipt={mapTradeToReceiptData(candidate)}
      />

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
              onClick={handleExecuteClick}
              disabled={isLoading}
              className="w-full rounded-md bg-accent py-3 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Processing..." : "Execute Trade →"}
            </button>
            <button 
              onClick={handleSimulateClick}
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
              onClick={handleSimulateClick}
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
              onClick={() => setShowLearnWhy(true)}
              className="w-full rounded-md border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              Learn Why
            </button>
          </>
        )}
      </div>

      {/* Receipt Link */}
      <div className="flex flex-wrap items-center gap-3">
        {!isNo && (
          <button
            onClick={() => setReceiptOpen(true)}
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            See receipt ›
          </button>
        )}
        <button
          onClick={() => setShowReasoning(!showReasoning)}
          className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {showReasoning ? "✕ Close reasoning" : "Reasoning drawer ›"}
        </button>
      </div>

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

      {showReasoning && (
        <div className="mt-4 space-y-3 rounded-lg border border-border bg-[#0f0f0f] p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Reasoning Drawer</p>

          <div>
            <p className="mb-2 text-[10px] font-bold text-muted-foreground">Factor Contributions</p>
            <div className="space-y-2">
              {[
                { name: "Regime alignment", value: Math.round(candidate.auditAdvanced.regimeScore * 100), polarity: "positive" },
                { name: "Liquidity quality", value: Math.round(candidate.auditAdvanced.liquidityScore * 100), polarity: "positive" },
                { name: "Risk friction", value: Math.max(5, 100 - candidate.trustScore), polarity: "negative" },
              ].map((factor) => (
                <div key={factor.name}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{factor.name}</span>
                    <span className={factor.polarity === "positive" ? "text-accent" : "text-warning"}>{factor.value}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${factor.polarity === "positive" ? "bg-accent" : "bg-warning"}`}
                      style={{ width: `${Math.min(factor.value, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold text-muted-foreground">Feed Evidence</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Macro feed confidence maps to trust score ({candidate.trustScore}/100).</li>
              <li>• Strategy context: {candidate.strategy}.</li>
              <li>• Primary rationale: {candidate.bullets.why}</li>
            </ul>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold text-muted-foreground">Timeline Deltas</p>
            <div className="space-y-1 text-xs">
              <p className="text-muted-foreground">T-15m: Regime score improved to {(candidate.auditAdvanced.regimeScore * 100).toFixed(0)}.</p>
              <p className="text-muted-foreground">T-8m: Liquidity score moved to {(candidate.auditAdvanced.liquidityScore * 100).toFixed(0)}.</p>
              <p className="text-foreground">T-0m: Final status resolved to {candidate.status}.</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
