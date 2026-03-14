"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Check, X, AlertTriangle } from "lucide-react"
import { TruthStatusTooltip } from "@/components/truth-status-tooltip"
import type { GateStackItem, TruthStatus } from "@/lib/halal/types"

interface GateStackProps {
  gates: GateStackItem[]
  overall_pass: boolean
  attestation_level?: string
  onConfirm?: () => void
  confirmLoading?: boolean
  h7Pending?: boolean
}

export function GateStack({ gates, overall_pass, attestation_level, onConfirm, confirmLoading, h7Pending }: GateStackProps) {
  const [expandedGate, setExpandedGate] = useState<string | null>(null)
  
  const passedCount = gates.filter(g => g.pass).length
  const totalCount = gates.length
  
  return (
    <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f1f1f] bg-[#0c0c0c] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#f5f5f5]">Sharia Compliance Gates</span>
          <span className="rounded bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-medium text-[#737373]">
            {passedCount}/{totalCount} passed
          </span>
        </div>
        {attestation_level && (
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
            attestation_level === 'FULL' ? 'bg-[#22c55e]/20 text-[#22c55e]' :
            attestation_level === 'PARTIAL' ? 'bg-[#c9a227]/20 text-[#c9a227]' :
            'bg-[#ef4444]/20 text-[#ef4444]'
          }`}>
            {attestation_level}
          </span>
        )}
      </div>
      
      {/* Gate List */}
      <div className="divide-y divide-[#1f1f1f]">
        {gates.map((gate) => (
          <div key={gate.gate} className="bg-[#0c0c0c]">
            <button
              onClick={() => setExpandedGate(expandedGate === gate.gate ? null : gate.gate)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#141414]"
            >
              {/* Status Icon */}
              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                gate.pass ? 'bg-[#22c55e]/20' : 'bg-[#ef4444]/20'
              }`}>
                {gate.pass ? (
                  <Check className="h-3.5 w-3.5 text-[#22c55e]" />
                ) : (
                  <X className="h-3.5 w-3.5 text-[#ef4444]" />
                )}
              </div>
              
              {/* Gate Info */}
              <div className="flex-1">
                <TruthStatusTooltip 
                  status={gate.truth_status} 
                  source={gate.evidence?.source}
                  timestamp={gate.evidence?.timestamp}
                >
                  <span className="text-sm font-medium text-[#f5f5f5]">{gate.gate}: {gate.label}</span>
                </TruthStatusTooltip>
                <p className="text-[11px] text-[#737373]">{gate.description}</p>
              </div>
              
              {/* Expand Icon */}
              {gate.evidence && (
                expandedGate === gate.gate ? (
                  <ChevronDown className="h-4 w-4 text-[#737373]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#737373]" />
                )
              )}
            </button>
            
            {/* Expanded Evidence */}
            {expandedGate === gate.gate && gate.evidence && (
              <div className="border-t border-[#1f1f1f] bg-[#0a0a0a] px-4 py-3 ml-9">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#737373]">Evidence</p>
                <pre className="overflow-x-auto rounded bg-[#141414] p-2 text-[10px] text-[#a1a1aa]">
                  {JSON.stringify(gate.evidence.value, null, 2)}
                </pre>
                <p className="mt-2 text-[10px] text-[#737373]">
                  Source: {gate.evidence.source} · {new Date(gate.evidence.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* H7 Confirmation (if pending) */}
      {h7Pending && (
        <div className="border-t border-[#1f1f1f] bg-[#0c0c0c] p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#c9a227]" />
            <span className="text-sm font-medium text-[#c9a227]">Intent Confirmation Required (H7)</span>
          </div>
          <p className="mb-4 text-xs text-[#a1a1aa]">
            By confirming, you acknowledge understanding of the trade risks and accept any purification obligations 
            from haram income portions of the underlying asset.
          </p>
          <button
            onClick={onConfirm}
            disabled={confirmLoading}
            className="w-full rounded-lg bg-[#22c55e] py-2.5 text-sm font-semibold text-[#0c0c0c] transition-colors hover:bg-[#22c55e]/90 disabled:opacity-50"
          >
            {confirmLoading ? 'Confirming...' : 'Confirm Intent (H7)'}
          </button>
        </div>
      )}
      
      {/* Overall Status */}
      {!h7Pending && (
        <div className={`flex items-center justify-center gap-2 border-t border-[#1f1f1f] py-3 ${
          overall_pass ? 'bg-[#22c55e]/10' : 'bg-[#ef4444]/10'
        }`}>
          {overall_pass ? (
            <>
              <Check className="h-4 w-4 text-[#22c55e]" />
              <span className="text-sm font-medium text-[#22c55e]">All Gates Passed - Halal Compliant</span>
            </>
          ) : (
            <>
              <X className="h-4 w-4 text-[#ef4444]" />
              <span className="text-sm font-medium text-[#ef4444]">Gate Check Failed</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
