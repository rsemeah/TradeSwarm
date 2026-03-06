"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"

export default function ConsensusPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0c]">
        <LoadingLogo />
      </div>
    )
  }

  if (!user) return null

  const models = [
    { name: "GPT-4", vote: "GO", confidence: 0.87, reasoning: "Strong momentum signals with favorable IV rank" },
    { name: "Claude", vote: "GO", confidence: 0.82, reasoning: "Risk/reward profile aligns with current regime" },
    { name: "Llama", vote: "WAIT", confidence: 0.65, reasoning: "Slight concern about upcoming earnings volatility" },
  ]

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

        {/* Consensus Summary */}
        <div className="mb-6 rounded-xl border border-[#1f1f1f] bg-[#141414] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Current Consensus</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="rounded-lg bg-[#22c55e] px-4 py-2 text-lg font-bold text-[#0c0c0c]">GO</span>
                <div>
                  <p className="text-sm text-[#f5f5f5]">2/3 models agree</p>
                  <p className="text-xs text-[#737373]">Avg confidence: 78%</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Active Signal</p>
              <p className="mt-1 font-mono text-xl font-bold text-[#f5f5f5]">NVDA</p>
              <p className="text-xs text-[#737373]">Bull Call Spread · 5 DTE</p>
            </div>
          </div>
        </div>

        {/* Model Votes */}
        <div className="grid gap-4 md:grid-cols-3">
          {models.map((model) => (
            <div key={model.name} className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[#f5f5f5]">{model.name}</span>
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                  model.vote === "GO" ? "bg-[#22c55e]/20 text-[#22c55e]" : "bg-[#c9a227]/20 text-[#c9a227]"
                }`}>
                  {model.vote}
                </span>
              </div>
              <div className="mb-3">
                <div className="mb-1 flex justify-between text-[10px] text-[#737373]">
                  <span>Confidence</span>
                  <span>{(model.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
                  <div 
                    className={`h-full rounded-full ${model.vote === "GO" ? "bg-[#22c55e]" : "bg-[#c9a227]"}`}
                    style={{ width: `${model.confidence * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-[#a1a1aa]">{model.reasoning}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
