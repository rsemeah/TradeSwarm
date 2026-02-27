"use client"

import { useState } from "react"
import type { TradeCandidate } from "@/lib/types"

interface ReceiptData {
  trade: TradeCandidate
  executedAt: Date
  isSimulation: boolean
  aiConsensus?: {
    groq?: { decision: string; confidence: number; reasoning: string }
    openai?: { decision: string; confidence: number; reasoning: string }
    anthropic?: { decision: string; confidence: number; reasoning: string }
    finalVerdict: string
    consensusStrength: number
  }
  gates?: {
    name: string
    passed: boolean
    value: string
    threshold: string
  }[]
}

interface ReceiptDrawerProps {
  isOpen: boolean
  onClose: () => void
  receipt: ReceiptData | null
}

export function ReceiptDrawer({ isOpen, onClose, receipt }: ReceiptDrawerProps) {
  const [activeTab, setActiveTab] = useState<"decision" | "explain" | "provenance">("decision")

  if (!isOpen || !receipt) return null

  const { trade, executedAt, isSimulation, aiConsensus, gates } = receipt

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-2xl bg-card"
        style={{ animation: "slideUp 0.3s ease-out" }}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        
        {/* Header */}
        <div className="border-b border-border px-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                  isSimulation 
                    ? "bg-warning/20 text-warning" 
                    : "bg-accent/20 text-accent"
                }`}>
                  {isSimulation ? "Simulated" : "Executed"}
                </span>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                  trade.status === "GO" ? "bg-accent/20 text-accent" :
                  trade.status === "WAIT" ? "bg-warning/20 text-warning" :
                  "bg-danger/20 text-danger"
                }`}>
                  {trade.status}
                </span>
              </div>
              <h2 className="mt-2 font-mono text-2xl font-bold text-foreground">{trade.ticker}</h2>
              <p className="text-xs text-muted-foreground">{trade.strategy}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xl font-bold text-accent">${trade.amountDollars}</p>
              <p className="text-[10px] text-muted-foreground">
                {executedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} ET
              </p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["decision", "explain", "provenance"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="max-h-[50vh] overflow-y-auto p-4">
          {activeTab === "decision" && (
            <div className="space-y-4">
              {/* Trust Score */}
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Trust Score</span>
                  <span className="font-mono text-lg font-bold text-foreground">{trade.trustScore}/100</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${trade.trustScore}%` }}
                  />
                </div>
              </div>
              
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[10px] text-muted-foreground">Win Likelihood</p>
                  <p className="font-mono text-lg font-bold text-foreground">{trade.winLikelihoodPct}%</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[10px] text-muted-foreground">Kelly Fraction</p>
                  <p className="font-mono text-lg font-bold text-foreground">{trade.auditAdvanced.kellyFinal}</p>
                </div>
              </div>
              
              {/* Decision */}
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[10px] font-bold text-muted-foreground">DECISION</p>
                <p className="text-xs text-foreground leading-relaxed">{trade.bullets.why}</p>
              </div>
              
              {/* Risk */}
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                <p className="mb-2 text-[10px] font-bold text-warning">RISK OVERLAY</p>
                <p className="text-xs text-foreground leading-relaxed">{trade.bullets.risk}</p>
              </div>

              <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                <p className="mb-2 text-[10px] font-bold text-accent">REGIME OVERLAY</p>
                <p className="text-xs text-foreground leading-relaxed">
                  Regime score {trade.auditAdvanced.regimeScore.toFixed(2)} supports a {trade.status} decision with liquidity score {trade.auditAdvanced.liquidityScore.toFixed(2)}.
                </p>
              </div>
            </div>
          )}

          {activeTab === "explain" && (
            <div className="space-y-4">
              {aiConsensus && (
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Consensus Strength</span>
                    <span className="font-mono text-lg font-bold text-accent">
                      {aiConsensus.consensusStrength}%
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Final Verdict: <span className="font-medium text-foreground">{aiConsensus.finalVerdict}</span>
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[10px] font-bold text-muted-foreground">DELIBERATION TIMELINE</p>
                <ol className="space-y-1 text-xs text-muted-foreground">
                  <li>1. Candidate screened and scored for trust + win likelihood.</li>
                  <li>2. Regime overlay applied against momentum and liquidity constraints.</li>
                  <li>3. Risk overlay checked with Kelly and POP lower bound constraints.</li>
                  <li>4. Final recommendation emitted as {trade.status}.</li>
                </ol>
              </div>

              {aiConsensus?.groq && (
                <AIResponseCard 
                  name="Groq (Llama 3.3 70B)" 
                  response={aiConsensus.groq}
                  color="accent"
                />
              )}
              {aiConsensus?.openai && (
                <AIResponseCard 
                  name="OpenAI (GPT-4o-mini)" 
                  response={aiConsensus.openai}
                  color="blue"
                />
              )}
              {aiConsensus?.anthropic && (
                <AIResponseCard 
                  name="Anthropic (Claude Haiku)" 
                  response={aiConsensus.anthropic}
                  color="orange"
                />
              )}
            </div>
          )}

          {activeTab === "provenance" && (
            <div className="space-y-2">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[10px] font-bold text-muted-foreground">PROVENANCE</p>
                <p className="text-xs text-muted-foreground">Decision artifacts are derived from trust metrics, gate checks, and AI consensus traces.</p>
              </div>
              {gates?.map((gate, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    gate.passed ? "border-accent/30 bg-accent/5" : "border-danger/30 bg-danger/5"
                  }`}
                >
                  <div>
                    <p className="text-xs font-medium text-foreground">{gate.name}</p>
                    <p className="text-[10px] text-muted-foreground">{gate.value} {gate.passed ? "≥" : "<"} {gate.threshold}</p>
                  </div>
                  <span className={`text-lg ${gate.passed ? "text-accent" : "text-danger"}`}>
                    {gate.passed ? "✓" : "✗"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-border p-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-muted py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  )
}

function AIResponseCard({ 
  name, 
  response, 
  color 
}: { 
  name: string
  response: { decision: string; confidence: number; reasoning: string }
  color: string
}) {
  const colorClasses = {
    accent: "border-accent/30 bg-accent/5",
    blue: "border-blue-500/30 bg-blue-500/5",
    orange: "border-orange-500/30 bg-orange-500/5",
  }
  
  return (
    <div className={`rounded-lg border p-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{name}</span>
        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
          response.decision === "GO" ? "bg-accent/20 text-accent" :
          response.decision === "WAIT" ? "bg-warning/20 text-warning" :
          "bg-danger/20 text-danger"
        }`}>
          {response.decision}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">Confidence:</span>
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div 
            className="h-full rounded-full bg-accent"
            style={{ width: `${response.confidence}%` }}
          />
        </div>
        <span className="font-mono text-[10px] text-foreground">{response.confidence}%</span>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">{response.reasoning}</p>
    </div>
  )
}
