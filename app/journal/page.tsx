"use client"

import React, { useEffect, useState } from 'react'
import { ReceiptDrawer } from '@/components/receipt-drawer'

type ReceiptRow = {
  id: string
  ticker: string
  created_at: string
  proof_bundle: any
}

export default function JournalPage() {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<ReceiptRow | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/receipts/list')
        const json = await res.json()
        if (json?.ok) setReceipts(json.receipts || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Journal — Receipts</h1>
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && receipts.length === 0 && <p className="text-sm text-muted-foreground">No receipts yet.</p>}

      <div className="mt-4 grid gap-2">
        {receipts.map((r) => (
          <button
            key={r.id}
            className="flex items-center justify-between rounded border p-3 text-left"
            onClick={() => {
              setSelected(r)
              setOpen(true)
            }}
          >
            <div>
              <div className="font-mono font-bold">{r.ticker}</div>
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className="text-xs text-muted-foreground">View</div>
          </button>
        ))}
      </div>

      {open && selected && (
        <ReceiptDrawer
          isOpen={open}
          onClose={() => setOpen(false)}
          receipt={{ proofBundle: selected.proof_bundle, executedAt: new Date(selected.created_at) }}
        />
      )}
    </div>
  )
}
