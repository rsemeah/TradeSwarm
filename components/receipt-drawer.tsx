"use client"

import * as React from "react"

type ReceiptDrawerProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export function ReceiptDrawer({ open = false, onOpenChange, children }: ReceiptDrawerProps) {
  if (!open) return null

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => onOpenChange?.(false)} />
      <div className="relative w-full max-w-xl rounded-t-2xl bg-zinc-950 p-4 text-white shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Receipt</div>
          <button
            className="rounded px-2 py-1 text-xs text-zinc-300 hover:text-white"
            onClick={() => onOpenChange?.(false)}
          >
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto">{children}</div>
      </div>
    </div>
  )
}

export default ReceiptDrawer
