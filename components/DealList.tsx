import type { ScanResult } from '@/src/lib/scanner/types'
import { DealCard } from './DealCard'

/** Renders ranked deals from a scan result */
export function DealList({ scan }: { scan: ScanResult }) {
  if (scan.empty) return <div className="text-sm text-slate-400">{scan.reason}</div>
  return (
    <div className="space-y-4">
      <div className="grid gap-3">{scan.deals.map((d, i) => <DealCard key={`${d.candidate.ticker}_${d.candidate.strategy}_${d.candidate.short_strike}_${d.candidate.long_strike}_${i}`} deal={d} />)}</div>
      <p className="text-xs text-slate-500">Greeks estimated via Black-Scholes approximation. Volatility position is a realized-vol proxy. Scores are structural rankings, not predictions. Paper mode only.</p>
    </div>
  )
}
