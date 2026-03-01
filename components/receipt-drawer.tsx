"use client"

import type { ProofBundle } from "@/lib/types/proof"

export interface ReceiptData {
  proofBundle: ProofBundle
  executedAt: Date
  isSimulation: boolean
}

interface ReceiptDrawerProps {
  isOpen: boolean
  onClose: () => void
  receipt: ReceiptData | null
}

export function ReceiptDrawer({ isOpen, onClose, receipt }: ReceiptDrawerProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-auto bg-zinc-950 text-zinc-100 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div className="text-sm font-semibold">Receipt</div>
          <button
            className="rounded-md border border-zinc-800 px-3 py-1 text-xs hover:bg-zinc-900"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="p-4">
          <pre className="overflow-auto rounded-lg border border-zinc-800 bg-black p-3 text-xs">
            {JSON.stringify(receipt ?? { empty: true }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default ReceiptDrawer
