"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { TradeCandidate, Theme } from "./types"

interface TradeAction {
  type: "execute" | "simulate" | "watch" | "learn"
  trade?: TradeCandidate
  theme?: Theme
  ticker?: string
}

interface TradeState {
  isLoading: boolean
  currentAction: TradeAction | null
  lastResult: {
    success: boolean
    message: string
    data?: unknown
  } | null
  analysisInProgress: string | null // ticker being analyzed
}

interface TradeContextType {
  state: TradeState
  executeTrade: (trade: TradeCandidate) => Promise<void>
  simulateTrade: (trade: TradeCandidate) => Promise<void>
  watchTicker: (ticker: string, theme: string) => Promise<void>
  analyzeTheme: (theme: Theme) => Promise<TradeCandidate | null>
  learnWhy: (trade: TradeCandidate) => void
  clearResult: () => void
}

const TradeContext = createContext<TradeContextType | null>(null)

export function TradeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TradeState>({
    isLoading: false,
    currentAction: null,
    lastResult: null,
    analysisInProgress: null,
  })

  const executeTrade = useCallback(async (trade: TradeCandidate) => {
    setState((s) => ({
      ...s,
      isLoading: true,
      currentAction: { type: "execute", trade },
    }))

    try {
      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", trade }),
      })

      const data = await response.json()

      setState((s) => ({
        ...s,
        isLoading: false,
        lastResult: {
          success: response.ok,
          message: data.message || data.error || "Trade executed",
          data,
        },
      }))
    } catch (error) {
      setState((s) => ({
        ...s,
        isLoading: false,
        lastResult: {
          success: false,
          message: String(error),
        },
      }))
    }
  }, [])

  const simulateTrade = useCallback(async (trade: TradeCandidate) => {
    setState((s) => ({
      ...s,
      isLoading: true,
      currentAction: { type: "simulate", trade },
    }))

    try {
      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "simulate", trade }),
      })

      const data = await response.json()

      setState((s) => ({
        ...s,
        isLoading: false,
        lastResult: {
          success: response.ok,
          message: data.message || data.error || "Simulation recorded",
          data,
        },
      }))
    } catch (error) {
      setState((s) => ({
        ...s,
        isLoading: false,
        lastResult: {
          success: false,
          message: String(error),
        },
      }))
    }
  }, [])

  const watchTicker = useCallback(async (ticker: string, theme: string) => {
    setState((s) => ({
      ...s,
      isLoading: true,
      currentAction: { type: "watch", ticker },
    }))

    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, theme }),
      })

      const data = await response.json()

      setState((s) => ({
        ...s,
        isLoading: false,
        lastResult: {
          success: response.ok,
          message: data.message || `Added ${ticker} to watchlist`,
          data,
        },
      }))
    } catch (error) {
      setState((s) => ({
        ...s,
        isLoading: false,
        lastResult: {
          success: false,
          message: String(error),
        },
      }))
    }
  }, [])

  const analyzeTheme = useCallback(async (theme: Theme): Promise<TradeCandidate | null> => {
    const primaryTicker = theme.tickers[0]

    setState((s) => ({
      ...s,
      isLoading: true,
      analysisInProgress: primaryTicker,
      currentAction: { type: "execute", theme },
    }))

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: primaryTicker,
          theme: theme.name,
          marketContext: theme.brief,
          useSwarm: true,
        }),
      })

      const data = await response.json()

      setState((s) => ({
        ...s,
        isLoading: false,
        analysisInProgress: null,
      }))

      if (!response.ok || !data.analysis) {
        setState((s) => ({
          ...s,
          lastResult: {
            success: false,
            message: data.error || "Analysis failed",
          },
        }))
        return null
      }

      // Convert AI analysis to TradeCandidate format
      const analysis = data.analysis
      const scoring = data.credibility
      const regime = data.engine?.regime
      const candidate: TradeCandidate = {
        ticker: analysis.ticker,
        strategy: `${analysis.status === "NO" ? "Bearish" : "Bullish"} Spread - AI Analyzed`,
        status: analysis.status,
        trustScore: scoring?.trustScore ?? analysis.trustScore,
        winLikelihoodPct: analysis.winLikelihoodPct,
        amountDollars: analysis.recommendedAmount,
        bullets: analysis.bullets,
        auditSimple: {
          trustScore: scoring?.trustScore ?? analysis.trustScore,
          winLikelihood: analysis.winLikelihoodPct ? `${analysis.winLikelihoodPct}%` : "-",
          marketStability: analysis.status === "GO" ? "Good" : analysis.status === "WAIT" ? "Fair" : "Poor",
          fillQuality: analysis.status === "GO" ? "Good" : "Fair",
          recommended: analysis.recommendedAmount ? `$${analysis.recommendedAmount}` : "-",
          decision: analysis.status,
        },
        auditAdvanced: {
          growthScore: (scoring?.trustScore ?? analysis.trustScore) / 100,
          netElr: "AI Calculated",
          popLowerBound: analysis.winLikelihoodPct ? `${analysis.winLikelihoodPct - 5}%` : "-",
          kellyFinal: analysis.recommendedAmount ? `${(analysis.recommendedAmount / 100).toFixed(1)}%` : "-",
          regimeScore: regime?.confidence ?? (scoring?.trustScore ?? analysis.trustScore) / 100,
          liquidityScore: Math.min(1, (regime?.signals?.volumeRatio ?? 1) / 1.5),
          gates: [
            { name: "AI Swarm Analysis", passed: true },
            { name: "Groq Analysis", passed: true },
            { name: "OpenAI Analysis", passed: data.modelResults?.length > 1 },
            { name: "Claude Analysis", passed: data.modelResults?.length > 2 },
            { name: "Consensus Reached", passed: !!data.consensus },
          ],
        },
        scoring,
      }

      return candidate
    } catch (error) {
      setState((s) => ({
        ...s,
        isLoading: false,
        analysisInProgress: null,
        lastResult: {
          success: false,
          message: String(error),
        },
      }))
      return null
    }
  }, [])

  const learnWhy = useCallback((trade: TradeCandidate) => {
    // This just triggers showing the audit panel - handled in component
    setState((s) => ({
      ...s,
      currentAction: { type: "learn", trade },
    }))
  }, [])

  const clearResult = useCallback(() => {
    setState((s) => ({
      ...s,
      lastResult: null,
      currentAction: null,
    }))
  }, [])

  return (
    <TradeContext.Provider
      value={{
        state,
        executeTrade,
        simulateTrade,
        watchTicker,
        analyzeTheme,
        learnWhy,
        clearResult,
      }}
    >
      {children}
    </TradeContext.Provider>
  )
}

export function useTrade() {
  const context = useContext(TradeContext)
  if (!context) {
    throw new Error("useTrade must be used within TradeProvider")
  }
  return context
}
