"use client"

import { useState, useEffect } from "react"
import type { TradeCandidate } from "@/lib/types"

interface LearnWhyExplanation {
  headline: string
  eli5: string
  technicalExplanation: string
  keyFactors: {
    factor: string
    impact: "positive" | "negative" | "neutral"
    explanation: string
  }[]
  whatWouldChange: string
  alternatives: { ticker: string; reason: string }[] | null
}

interface LearnWhyModalProps {
  isOpen: boolean
  onClose: () => void
  candidate: TradeCandidate | null
}

export function LearnWhyModal({ isOpen, onClose, candidate }: LearnWhyModalProps) {
  const [explanation, setExplanation] = useState<LearnWhyExplanation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"simple" | "technical">("simple")

  useEffect(() => {
    if (isOpen && candidate && !explanation) {
      fetchExplanation()
    }
  }, [isOpen, candidate])

  const fetchExplanation = async () => {
    if (!candidate) return
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch("/api/learn-why", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: candidate.ticker,
          status: candidate.status,
          strategy: candidate.strategy,
          bullets: candidate.bullets,
          trustScore: candidate.trustScore,
        }),
      })
      
      if (!res.ok) throw new Error("Failed to fetch explanation")
      
      const data = await res.json()
      setExplanation(data.explanation)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !candidate) return null

  const impactColors = {
    positive: "text-accent bg-accent/10 border-accent/30",
    negative: "text-danger bg-danger/10 border-danger/30",
    neutral: "text-muted-foreground bg-muted border-border",
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-50 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                candidate.status === "WAIT" ? "bg-warning/20 text-warning" : "bg-danger/20 text-danger"
              }`}>
                {candidate.status}
              </span>
              <span className="font-mono text-lg font-bold text-foreground">{candidate.ticker}</span>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Learn why this trade was blocked</p>
        </div>
        
        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="mt-4 text-sm text-muted-foreground">Analyzing trade conditions...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-center">
              <p className="text-sm text-danger">Failed to load explanation</p>
              <button
                onClick={fetchExplanation}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Try again
              </button>
            </div>
          ) : explanation ? (
            <div className="space-y-4">
              {/* Headline */}
              <div className="rounded-lg border border-border bg-background p-4">
                <h3 className="text-sm font-medium text-foreground">{explanation.headline}</h3>
              </div>
              
              {/* View Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("simple")}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                    viewMode === "simple"
                      ? "bg-accent text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Simple
                </button>
                <button
                  onClick={() => setViewMode("technical")}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                    viewMode === "technical"
                      ? "bg-accent text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Technical
                </button>
              </div>
              
              {/* Explanation */}
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs text-foreground leading-relaxed">
                  {viewMode === "simple" ? explanation.eli5 : explanation.technicalExplanation}
                </p>
              </div>
              
              {/* Key Factors */}
              <div>
                <p className="mb-2 text-[10px] font-bold text-muted-foreground uppercase">Key Factors</p>
                <div className="space-y-2">
                  {explanation.keyFactors.map((factor, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 ${impactColors[factor.impact]}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{factor.factor}</span>
                        <span className="text-[10px] uppercase">{factor.impact}</span>
                      </div>
                      <p className="mt-1 text-[10px] opacity-80">{factor.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* What Would Change */}
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                <p className="mb-1 text-[10px] font-bold text-accent uppercase">To Make This a GO</p>
                <p className="text-xs text-foreground leading-relaxed">{explanation.whatWouldChange}</p>
              </div>
              
              {/* Alternatives */}
              {explanation.alternatives && explanation.alternatives.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold text-muted-foreground uppercase">
                    Consider Instead
                  </p>
                  <div className="space-y-2">
                    {explanation.alternatives.map((alt, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                        <span className="font-mono text-sm font-bold text-foreground">{alt.ticker}</span>
                        <span className="text-[10px] text-muted-foreground">{alt.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
        
        {/* Footer */}
        <div className="border-t border-border p-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-muted py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
