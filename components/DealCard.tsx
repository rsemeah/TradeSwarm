import type { RankedDeal } from '@/src/lib/scanner/types'

export function DealCard({ deal }: { deal: RankedDeal }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{deal.candidate.ticker} · {deal.candidate.strategy}</h3>
        <span className="text-emerald-400 text-sm">{deal.score.display}</span>
      </div>
      <p className="mt-2 text-xs text-slate-300">ROR {deal.ror.toFixed(2)} · DTE {deal.candidate.dte} · Contracts {deal.contracts}</p>
    </div>
  )
}
