import type { RankedDeal } from '@/src/lib/scanner/types'

export function ProofDrawer({ deal }: { deal: RankedDeal }) {
  return (
    <details className="rounded border border-slate-700 p-3 text-xs text-slate-200">
      <summary className="cursor-pointer">Proof bundle</summary>
      <pre className="mt-2 overflow-auto">{JSON.stringify({
        stress: deal.stress,
        truthSerum: deal.truthSerum,
        macroFlags: deal.news.macroFlags,
      }, null, 2)}</pre>
    </details>
  )
}
