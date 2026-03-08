"use client"

import type { ProofBundle } from "@/lib/types/proof"
import type { TradeScoringDetail } from "@/lib/types"

export interface ReceiptData {
  proofBundle: ProofBundle
  executedAt: Date
  isSimulation: boolean
  scoring?: TradeScoringDetail
  gates?: {
    name: string
    passed: boolean
    value: string
    threshold: string
  }[]
  determinism?: {
    determinismHash: string | null
    marketSnapshotHash: string | null
    randomSeed: number | null
  }
}

interface ReceiptDrawerProps {
  isOpen: boolean
  onClose: () => void
  receipt: ReceiptData | null
}

function verdictColor(v: string) {
  if (v === "GO") return "text-emerald-400"
  if (v === "WAIT") return "text-amber-300"
  return "text-rose-400"
}

export function ReceiptDrawer({ isOpen, onClose, receipt }: ReceiptDrawerProps) {
  if (!isOpen || !receipt) return null

  const { proofBundle, executedAt, determinism } = receipt
  const finalDecision = proofBundle.finalDecision

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close receipt drawer" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-slate-950 p-4 text-slate-100">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Trade Receipt</p>
            <h2 className="text-2xl font-semibold">{proofBundle.ticker}</h2>
            <p className="text-xs text-slate-400">
              {proofBundle.action} · {executedAt.toISOString()} · v{proofBundle.engineVersion}
            </p>
          </div>
          <button className="rounded border border-slate-700 px-2 py-1 text-xs" onClick={onClose}>
            Close
          </button>
        </div>

        <section className="mb-4 rounded border border-slate-800 p-3">
          <p className="text-xs text-slate-400">Decision</p>
          <p className={`text-lg font-semibold ${verdictColor(finalDecision.action)}`}>{finalDecision.action}</p>
          <p className="text-sm text-slate-200">{finalDecision.reason}</p>
          <p className="mt-2 text-xs text-slate-400">
            Trust {finalDecision.trustScore} · Recommended ${finalDecision.recommendedAmount ?? 0}
          </p>
        </section>

        <section className="mb-4 rounded border border-slate-800 p-3">
          <p className="mb-2 text-xs text-slate-400">Preflight gates</p>
          <ul className="space-y-1 text-sm">
            {proofBundle.preflight.gates.map((gate) => (
              <li key={gate.name}>
                <span className={gate.passed ? "text-emerald-400" : "text-rose-400"}>{gate.passed ? "✓" : "✕"}</span>{" "}
                {gate.name} — {gate.reason}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded border border-slate-800 p-3">
          <p className="mb-2 text-xs text-slate-400">Determinism</p>
          <p className="text-xs text-slate-300">Request ID: {proofBundle.requestId}</p>
          <p className="text-xs text-slate-300">Monte Carlo seed: {determinism?.randomSeed ?? proofBundle.risk.monteCarloSeed}</p>
          <p className="text-xs text-slate-300">Determinism hash: {determinism?.determinismHash ?? "n/a"}</p>
          <p className="text-xs text-slate-300">Snapshot hash: {determinism?.marketSnapshotHash ?? "n/a"}</p>
        </section>
      </div>
    </div>
  )
}
