import type { ScanResult } from '@/src/lib/scanner/types'
import { DealCard } from './DealCard'

export function DealList({ scan }: { scan: ScanResult }) {
  if (scan.empty) return <div className="text-sm text-slate-400">{scan.reason}</div>
  return (
    <div className="space-y-4">
      <div className="grid gap-3">{scan.deals.map((d) => <DealCard key={d.candidate.id} deal={d} />)}</div>
      <p className="text-xs text-slate-500">Greeks estimated via Black-Scholes approximation. Volatility position is a realized-vol proxy. Scores are structural rankings, not predictions. Paper mode only.</p>
    </div>
  )
}
