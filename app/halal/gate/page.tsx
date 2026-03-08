"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useCallback, Suspense } from "react"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"
import { GateStack } from "@/components/halal/gate-stack"
import { TruthStatusTooltip } from "@/components/truth-status-tooltip"
import type { HalalGate, HalalScreen, GateStackItem } from "@/lib/halal/types"
import { ArrowLeft, Shield } from "lucide-react"

function GatePageContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const ticker = searchParams.get('ticker')
  const screen_id = searchParams.get('screen_id')
  
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [gate, setGate] = useState<HalalGate | null>(null)
  const [screen, setScreen] = useState<HalalScreen | null>(null)
  const [strategy, setStrategy] = useState("Bull Call Spread")
  const [amount, setAmount] = useState(500)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  // Fetch screen data
  useEffect(() => {
    if (ticker && user) {
      fetch(`/api/halal/screen?ticker=${ticker}`)
        .then(res => res.json())
        .then(data => {
          if (data.screens?.[0]) {
            setScreen(data.screens[0])
          }
        })
    }
  }, [ticker, user])

  const runGateCheck = useCallback(async () => {
    if (!ticker || !strategy) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/halal/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          screen_id, 
          ticker, 
          strategy_type: strategy,
          notional_amount: amount 
        })
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setGate(data.gate)
        if (!data.gates_ready) {
          setError(data.message)
        }
      }
    } catch (err) {
      setError("Failed to run gate check")
    } finally {
      setLoading(false)
    }
  }, [ticker, screen_id, strategy, amount])

  const confirmIntent = useCallback(async () => {
    if (!gate?.id) return
    setConfirming(true)
    try {
      const res = await fetch("/api/halal/gate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          gate_id: gate.id,
          understood_risks: true,
          accepted_purification: true,
          intent_statement: `Confirming halal trade intent for ${ticker} ${strategy}`
        })
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setGate(data.gate)
        // Redirect to execute or paper trade
        router.push(`/halal/receipt?gate_id=${gate.id}&intent_id=${data.intent?.id}`)
      }
    } catch (err) {
      setError("Failed to confirm intent")
    } finally {
      setConfirming(false)
    }
  }, [gate, ticker, strategy, router])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0c]">
        <LoadingLogo />
      </div>
    )
  }

  if (!user) return null

  // Build gate stack from screen (H1-H4) and gate (H5-H7)
  const buildFullGateStack = (): GateStackItem[] => {
    const screenGates: GateStackItem[] = screen ? [
      { gate: "H1", label: "Business Activity", description: `Sector: ${screen.h1_sector}`, pass: screen.h1_pass, evidence: screen.h1_evidence, truth_status: screen.truth_status },
      { gate: "H2", label: "Debt Ratio", description: `${((screen.h2_debt_ratio || 0) * 100).toFixed(1)}%`, pass: screen.h2_pass, evidence: screen.h2_evidence, truth_status: screen.truth_status },
      { gate: "H3", label: "Receivables", description: `${((screen.h3_receivables_ratio || 0) * 100).toFixed(1)}%`, pass: screen.h3_pass, evidence: screen.h3_evidence, truth_status: screen.truth_status },
      { gate: "H4", label: "Interest Income", description: `${((screen.h4_interest_ratio || 0) * 100).toFixed(1)}%`, pass: screen.h4_pass, evidence: screen.h4_evidence, truth_status: screen.truth_status },
    ] : []
    
    const tradeGates: GateStackItem[] = gate ? [
      { gate: "H5", label: "Position Limit", description: `Exposure: $${gate.h5_current_exposure?.toFixed(0) || 0} / $${gate.h5_max_exposure?.toFixed(0) || 0}`, pass: gate.h5_pass, evidence: gate.h5_evidence, truth_status: 'VERIFIED' },
      { gate: "H6", label: "Timing (Gharar)", description: gate.h6_is_0dte ? '0DTE requires market hours' : 'Standard timing', pass: gate.h6_pass, evidence: gate.h6_evidence, truth_status: 'VERIFIED' },
      { gate: "H7", label: "Intent Confirmation", description: gate.h7_user_confirmed ? 'Confirmed' : 'Awaiting confirmation', pass: gate.h7_pass, truth_status: 'VERIFIED' },
    ] : []
    
    return [...screenGates, ...tradeGates]
  }

  const h5h6Ready = gate?.h5_pass && gate?.h6_pass
  const h7Pending = h5h6Ready && !gate?.h7_user_confirmed

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6">
      <div className="mx-auto max-w-4xl">
        {/* Back Button */}
        <button 
          onClick={() => router.push('/halal/scanner')}
          className="mb-6 flex items-center gap-2 text-sm text-[#737373] hover:text-[#f5f5f5]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Scanner
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-[#22c55e]" />
            <h1 className="text-2xl font-semibold text-[#f5f5f5]">Trade Compliance Gate</h1>
            <span className="rounded bg-[#c9a227]/20 px-2 py-0.5 text-[10px] font-bold text-[#c9a227]">H5-H7</span>
          </div>
          <p className="mt-1 text-sm text-[#737373]">Pre-trade gates for {ticker || 'selected ticker'}</p>
        </div>

        {/* Trade Setup */}
        <div className="mb-6 rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
          <h3 className="mb-4 text-sm font-semibold text-[#f5f5f5]">Trade Setup</h3>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#737373]">Ticker</label>
              <div className="rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2 font-mono text-[#f5f5f5]">
                {ticker || 'N/A'}
              </div>
            </div>
            
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#737373]">Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2 text-[#f5f5f5] focus:border-[#22c55e] focus:outline-none"
              >
                <option>Bull Call Spread</option>
                <option>Bear Put Spread</option>
                <option>Iron Condor</option>
                <option>Cash Secured Put</option>
                <option>Covered Call</option>
                <option>0DTE Bull Call</option>
              </select>
            </div>
            
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#737373]">Amount ($)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2 text-[#f5f5f5] focus:border-[#22c55e] focus:outline-none"
              />
            </div>
          </div>
          
          <button
            onClick={runGateCheck}
            disabled={loading || !ticker}
            className="mt-4 w-full rounded-lg bg-[#22c55e] py-2.5 font-semibold text-[#0c0c0c] transition-colors hover:bg-[#22c55e]/90 disabled:opacity-50"
          >
            {loading ? 'Checking Gates...' : 'Run Gate Check (H5-H6)'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/10 p-3 text-sm text-[#ef4444]">
            {error}
          </div>
        )}

        {/* Gate Stack */}
        {(screen || gate) && (
          <GateStack
            gates={buildFullGateStack()}
            overall_pass={gate?.overall_pass || false}
            attestation_level={gate?.overall_pass ? 'FULL' : h5h6Ready ? 'PARTIAL' : undefined}
            h7Pending={h7Pending}
            onConfirm={confirmIntent}
            confirmLoading={confirming}
          />
        )}

        {/* Purification Notice */}
        {screen && !screen.overall_pass === false && (
          <div className="mt-4 rounded-lg border border-[#c9a227]/20 bg-[#c9a227]/10 p-4">
            <p className="text-sm text-[#c9a227]">
              <strong>Purification Notice:</strong> If this trade is profitable, 
              approximately {((screen.h1_haram_revenue_pct || 0.02) * 100).toFixed(1)}% of gains 
              should be donated to purify any haram income portions.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HalalGatePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#0c0c0c]"><LoadingLogo /></div>}>
      <GatePageContent />
    </Suspense>
  )
}
