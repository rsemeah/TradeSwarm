"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"

interface ModelOutput {
  provider: string
  decision: string
  confidence: number
  reasoning: string
}

interface DeliberationRound {
  stage: string
  outputs: ModelOutput[]
  outcome: { decision: string; confidence: number }
}

interface Candidate {
  id: string
  ticker: string
  strategy: string
  verdict: string
  trust_score: number
  deliberation: DeliberationRound[]
}

interface ScanResult {
  candidates: Candidate[]
  scan_ts: string
  regime: string
}

const fetcher = (url: string) => fetch(url, { method: "POST" }).then(res => res.json())

export default function ConsensusPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)

  const { data, error, isLoading } = useSWR<ScanResult>(
    user ? "/api/scan" : null,
    fetcher,
    { refreshInterval: 60000 }
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0c]">
        <LoadingLogo />
      </div>
    )
  }

  if (!user) return null

  const candidates = data?.candidates || []
  const activeCandidate = candidates.find(c => c.id === selectedCandidate) || candidates[0]
  const deliberation = activeCandidate?.deliberation || []
  
  // Flatten all model outputs from all rounds
  const allOutputs = deliberation.flatMap(round => round.outputs)
  const goVotes = allOutputs.filter(o => o.decision === "GO").length
  const totalVotes = allOutputs.length
  const avgConfidence = totalVotes > 0 
    ? allOutputs.reduce((sum, o) => sum + o.confidence, 0) / totalVotes 
    : 0

  const verdictColor = (v: string) => {
    if (v === "GO") return "bg-[#22c55e] text-[#0c0c0c]"
    if (v === "WAIT") return "bg-[#c9a227] text-[#0c0c0c]"
    return "bg-[#ef4444] text-white"
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#f5f5f5]">Consensus View</h1>
            <span className="rounded bg-[#22c55e]/20 px-2 py-0.5 text-[10px] font-bold text-[#22c55e]">EDGE</span>
          </div>
          <p className="mt-1 text-sm text-[#737373]">Multi-model decision aggregation</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/10 p-3 text-sm text-[#ef4444]">
            Failed to load consensus data
          </div>
        )}

        {/* Signal Selector */}
        {candidates.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCandidate(c.id)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                  (selectedCandidate === c.id || (!selectedCandidate && c.id === candidates[0]?.id))
                    ? "border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]"
                    : "border-[#2a2a2a] bg-[#141414] text-[#a1a1aa] hover:border-[#3a3a3a]"
                }`}
              >
                <span className="font-mono font-semibold">{c.ticker}</span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${verdictColor(c.verdict)}`}>
                  {c.verdict}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Consensus Summary */}
        {activeCandidate && (
          <div className="mb-6 rounded-xl border border-[#1f1f1f] bg-[#141414] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Current Consensus</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className={`rounded-lg px-4 py-2 text-lg font-bold ${verdictColor(activeCandidate.verdict)}`}>
                    {activeCandidate.verdict}
                  </span>
                  <div>
                    <p className="text-sm text-[#f5f5f5]">{goVotes}/{totalVotes} models voted GO</p>
                    <p className="text-xs text-[#737373]">Avg confidence: {(avgConfidence * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Trust Score</p>
                <p className="mt-1 font-mono text-3xl font-bold text-[#f5f5f5]">{activeCandidate.trust_score}</p>
                <p className="text-xs text-[#737373]">{activeCandidate.strategy}</p>
              </div>
            </div>
          </div>
        )}

        {/* Model Votes */}
        <div className="grid gap-4 md:grid-cols-3">
          {allOutputs.map((output, i) => (
            <div key={i} className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[#f5f5f5]">{output.provider}</span>
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                  output.decision === "GO" ? "bg-[#22c55e]/20 text-[#22c55e]" 
                  : output.decision === "WAIT" ? "bg-[#c9a227]/20 text-[#c9a227]"
                  : "bg-[#ef4444]/20 text-[#ef4444]"
                }`}>
                  {output.decision}
                </span>
              </div>
              <div className="mb-3">
                <div className="mb-1 flex justify-between text-[10px] text-[#737373]">
                  <span>Confidence</span>
                  <span>{(output.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
                  <div 
                    className={`h-full rounded-full ${
                      output.decision === "GO" ? "bg-[#22c55e]" 
                      : output.decision === "WAIT" ? "bg-[#c9a227]"
                      : "bg-[#ef4444]"
                    }`}
                    style={{ width: `${output.confidence * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-[#a1a1aa]">{output.reasoning}</p>
            </div>
          ))}
        </div>

        {candidates.length === 0 && !isLoading && (
          <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-8 text-center">
            <p className="text-sm text-[#737373]">No active signals. Scanner will refresh automatically.</p>
          </div>
        )}
      </div>
    </div>
  )
}
