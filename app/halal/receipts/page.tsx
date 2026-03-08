"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"
import { TruthStatusTooltip } from "@/components/truth-status-tooltip"
import type { ShariaReceipt, TruthStatus } from "@/lib/halal/types"
import { FileText, Copy, Check, ExternalLink } from "lucide-react"

// Mock receipts for demo
const mockReceipts: ShariaReceipt[] = [
  {
    id: "rec_001",
    user_id: "user_1",
    trade_id: "trade_001",
    intent_id: "intent_001",
    screen_snapshot: {
      id: "screen_001",
      user_id: "user_1",
      ticker: "NVDA",
      screen_date: "2026-03-07",
      h1_sector: "technology",
      h1_haram_revenue_pct: 0.01,
      h1_pass: true,
      h2_debt_ratio: 0.08,
      h2_pass: true,
      h3_receivables_ratio: 0.08,
      h3_pass: true,
      h4_interest_ratio: 0.002,
      h4_pass: true,
      overall_pass: true,
      compliance_score: 100,
      truth_status: "VERIFIED",
      created_at: "2026-03-07T10:30:00Z"
    },
    gate_snapshot: {
      id: "gate_001",
      user_id: "user_1",
      ticker: "NVDA",
      strategy_type: "Bull Call Spread",
      h5_current_exposure: 500,
      h5_max_exposure: 10000,
      h5_pass: true,
      h6_is_0dte: false,
      h6_market_hours: true,
      h6_pass: true,
      h7_user_confirmed: true,
      h7_pass: true,
      overall_pass: true,
      gate_ts: "2026-03-07T10:31:00Z"
    },
    market_snapshot: {
      price: 142.50,
      iv: 0.32,
      vix: 18.5,
      timestamp: "2026-03-07T10:31:00Z"
    },
    compliance_hash: "sha256:a1b2c3d4e5f6789012345678901234567890abcdef",
    market_hash: "sha256:fedcba0987654321098765432109876543210f6e5d4c3b2a1",
    determinism_hash: "sha256:123456789abcdef0123456789abcdef0123456789abc",
    estimated_purification: 0.72,
    purification_rate: 0.01,
    attestation_level: "FULL",
    truth_status: "VERIFIED",
    created_at: "2026-03-07T10:31:30Z"
  },
  {
    id: "rec_002",
    user_id: "user_1",
    trade_id: "trade_002",
    screen_snapshot: {
      id: "screen_002",
      user_id: "user_1",
      ticker: "AAPL",
      screen_date: "2026-03-06",
      h1_sector: "technology",
      h1_haram_revenue_pct: 0.02,
      h1_pass: true,
      h2_debt_ratio: 0.04,
      h2_pass: true,
      h3_receivables_ratio: 0.08,
      h3_pass: true,
      h4_interest_ratio: 0.01,
      h4_pass: true,
      overall_pass: true,
      compliance_score: 100,
      truth_status: "VERIFIED",
      created_at: "2026-03-06T14:20:00Z"
    },
    gate_snapshot: {
      id: "gate_002",
      user_id: "user_1",
      ticker: "AAPL",
      strategy_type: "Cash Secured Put",
      h5_current_exposure: 1200,
      h5_max_exposure: 10000,
      h5_pass: true,
      h6_is_0dte: false,
      h6_market_hours: true,
      h6_pass: true,
      h7_user_confirmed: true,
      h7_pass: true,
      overall_pass: true,
      gate_ts: "2026-03-06T14:21:00Z"
    },
    market_snapshot: {
      price: 178.25,
      iv: 0.28,
      vix: 17.2,
      timestamp: "2026-03-06T14:21:00Z"
    },
    compliance_hash: "sha256:b2c3d4e5f6a1789012345678901234567890bcdef1",
    market_hash: "sha256:edcba10987654321098765432109876543210f6e5d4c3",
    determinism_hash: "sha256:23456789abcdef0123456789abcdef0123456789abcd",
    estimated_purification: 2.14,
    purification_rate: 0.02,
    attestation_level: "FULL",
    truth_status: "VERIFIED",
    created_at: "2026-03-06T14:21:30Z"
  }
]

export default function ShariaReceiptsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [receipts] = useState<ShariaReceipt[]>(mockReceipts)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  const copyHash = async (hash: string, id: string) => {
    await navigator.clipboard.writeText(hash)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const truncateHash = (hash: string) => {
    const parts = hash.split(':')
    if (parts.length === 2) {
      return `${parts[0]}:${parts[1].slice(0, 8)}...${parts[1].slice(-8)}`
    }
    return `${hash.slice(0, 12)}...${hash.slice(-8)}`
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0c]">
        <LoadingLogo />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-[#22c55e]" />
            <h1 className="text-2xl font-semibold text-[#f5f5f5]">Sharia Receipts</h1>
          </div>
          <p className="mt-1 text-sm text-[#737373]">
            Immutable compliance attestations for every halal trade
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/10 p-4">
          <p className="text-sm text-[#22c55e]">
            Each receipt contains cryptographic hashes of the compliance check, market conditions, and decision inputs.
            These can be used to replay and verify any trade decision.
          </p>
        </div>

        {/* Receipts List */}
        <div className="space-y-4">
          {receipts.map((receipt) => (
            <div 
              key={receipt.id}
              className="rounded-xl border border-[#1f1f1f] bg-[#141414] overflow-hidden"
            >
              {/* Receipt Header */}
              <div className="flex items-center justify-between border-b border-[#1f1f1f] bg-[#0c0c0c] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-[#f5f5f5]">
                    {receipt.screen_snapshot.ticker}
                  </span>
                  <span className="rounded bg-[#1a1a1a] px-2 py-0.5 text-xs text-[#a1a1aa]">
                    {receipt.gate_snapshot.strategy_type}
                  </span>
                  <TruthStatusTooltip status={receipt.truth_status}>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      receipt.attestation_level === 'FULL' 
                        ? 'bg-[#22c55e]/20 text-[#22c55e]'
                        : 'bg-[#c9a227]/20 text-[#c9a227]'
                    }`}>
                      {receipt.attestation_level}
                    </span>
                  </TruthStatusTooltip>
                </div>
                <span className="text-xs text-[#737373]">
                  {new Date(receipt.created_at).toLocaleString()}
                </span>
              </div>

              {/* Receipt Body */}
              <div className="p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Compliance Info */}
                  <div>
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#737373]">Compliance</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#a1a1aa]">Score</span>
                        <span className="font-mono text-sm text-[#22c55e]">{receipt.screen_snapshot.compliance_score}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#a1a1aa]">Gates Passed</span>
                        <span className="text-sm text-[#f5f5f5]">H1-H7 All</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#a1a1aa]">Purification</span>
                        <span className="font-mono text-sm text-[#c9a227]">${receipt.estimated_purification.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Market Snapshot */}
                  <div>
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#737373]">Market Snapshot</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#a1a1aa]">Price</span>
                        <span className="font-mono text-sm text-[#f5f5f5]">${receipt.market_snapshot.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#a1a1aa]">IV</span>
                        <span className="font-mono text-sm text-[#f5f5f5]">{(receipt.market_snapshot.iv * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#a1a1aa]">VIX</span>
                        <span className="font-mono text-sm text-[#f5f5f5]">{receipt.market_snapshot.vix}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Ratios */}
                  <div>
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#737373]">Financial Ratios</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#a1a1aa]">Debt Ratio</span>
                        <span className="font-mono text-sm text-[#f5f5f5]">{((receipt.screen_snapshot.h2_debt_ratio || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#a1a1aa]">Haram Rev</span>
                        <span className="font-mono text-sm text-[#f5f5f5]">{((receipt.screen_snapshot.h1_haram_revenue_pct || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#a1a1aa]">Interest</span>
                        <span className="font-mono text-sm text-[#f5f5f5]">{((receipt.screen_snapshot.h4_interest_ratio || 0) * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hashes */}
                <div className="mt-4 border-t border-[#1f1f1f] pt-4">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#737373]">Verification Hashes</p>
                  <div className="space-y-2">
                    {[
                      { label: "Compliance", hash: receipt.compliance_hash },
                      { label: "Market", hash: receipt.market_hash },
                      { label: "Determinism", hash: receipt.determinism_hash }
                    ].map(({ label, hash }) => (
                      <div key={label} className="flex items-center justify-between rounded bg-[#0c0c0c] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#737373]">{label}:</span>
                          <span className="font-mono text-xs text-[#a1a1aa]">{truncateHash(hash)}</span>
                        </div>
                        <button
                          onClick={() => copyHash(hash, `${receipt.id}-${label}`)}
                          className="rounded p-1 text-[#737373] hover:bg-[#1a1a1a] hover:text-[#f5f5f5]"
                        >
                          {copiedId === `${receipt.id}-${label}` ? (
                            <Check className="h-3.5 w-3.5 text-[#22c55e]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <button className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:border-[#3a3a3a] hover:text-[#f5f5f5]">
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Full Receipt
                  </button>
                  <button className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:border-[#3a3a3a] hover:text-[#f5f5f5]">
                    Replay Decision
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {receipts.length === 0 && (
          <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-[#737373]" />
            <p className="text-lg font-medium text-[#f5f5f5]">No Receipts Yet</p>
            <p className="mt-1 text-sm text-[#737373]">Complete a halal trade to generate your first receipt</p>
            <button
              onClick={() => router.push('/halal/scanner')}
              className="mt-4 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#0c0c0c] hover:bg-[#22c55e]/90"
            >
              Start Screening
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
