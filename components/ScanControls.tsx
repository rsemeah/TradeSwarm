'use client'

export function ScanControls({
  includeTierA,
  onToggleTierA,
  onRefresh,
}: {
  includeTierA: boolean
  onToggleTierA: (next: boolean) => void
  onRefresh: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" checked={includeTierA} onChange={(e) => onToggleTierA(e.target.checked)} />
        Include Tier A
      </label>
      <button onClick={onRefresh} className="rounded bg-slate-700 px-3 py-1 text-sm text-white">Force refresh</button>
    </div>
  )
}
