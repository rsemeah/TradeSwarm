"use client"

import { useState } from "react"
import type { TruthStatus } from "@/lib/halal/types"

interface TruthStatusTooltipProps {
  status: TruthStatus
  source?: string
  timestamp?: string
  children: React.ReactNode
}

const statusConfig: Record<TruthStatus, { color: string; bg: string; label: string; description: string }> = {
  VERIFIED: {
    color: "text-[#22c55e]",
    bg: "bg-[#22c55e]",
    label: "Verified",
    description: "Data verified from authoritative source with cryptographic proof"
  },
  STUBBED: {
    color: "text-[#c9a227]",
    bg: "bg-[#c9a227]",
    label: "Stubbed",
    description: "Data from secondary source, pending primary verification"
  },
  MISSING: {
    color: "text-[#ef4444]",
    bg: "bg-[#ef4444]",
    label: "Missing",
    description: "Data unavailable, using defaults or estimates"
  }
}

export function TruthStatusTooltip({ status, source, timestamp, children }: TruthStatusTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const config = statusConfig[status]
  
  return (
    <div className="relative inline-flex items-center gap-1.5" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      {children}
      <span className={`h-2 w-2 rounded-full ${config.bg}`} />
      
      {isOpen && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3 shadow-xl">
          <div className="mb-2 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${config.bg}`} />
            <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
          </div>
          <p className="mb-2 text-[11px] text-[#a1a1aa]">{config.description}</p>
          {source && (
            <p className="text-[10px] text-[#737373]">
              Source: <span className="font-mono">{source}</span>
            </p>
          )}
          {timestamp && (
            <p className="text-[10px] text-[#737373]">
              Updated: {new Date(timestamp).toLocaleString()}
            </p>
          )}
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-[#2a2a2a] bg-[#1a1a1a]" />
        </div>
      )}
    </div>
  )
}

// Compact inline badge version
export function TruthStatusBadge({ status }: { status: TruthStatus }) {
  const config = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium ${config.color} bg-current/10`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.bg}`} />
      {config.label}
    </span>
  )
}
