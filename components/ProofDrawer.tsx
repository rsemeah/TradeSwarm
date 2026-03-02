import type { RankedDeal } from '@/src/lib/scanner/types'

export function ProofDrawer({ deal }: { deal: RankedDeal }) {
  return (
    <details className="rounded border border-slate-700 p-3 text-xs text-slate-200">
      <summary className="cursor-pointer">Proof bundle</summary>
      <pre className="mt-2 overflow-auto">{JSON.stringify({
        candidate: {
          ticker: deal.candidate.ticker,
          strategy: deal.candidate.strategy,
          expiry: deal.candidate.expiry_date,
          strikes: `${deal.candidate.short_strike}/${deal.candidate.long_strike}`,
        },
        scoring: deal.score,
        stress: deal.stress,
        risk: {
          ror: deal.ror,
          pop: deal.pop,
          contracts: deal.contracts,
          risk_usd: deal.risk_usd,
          margin_usd: deal.margin_usd,
        },
        tier: deal.tier,
        rank: deal.rank,
      }, null, 2)}</pre>
    </details>
  )
}
