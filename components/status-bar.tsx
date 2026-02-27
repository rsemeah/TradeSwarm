import type { SystemStatus } from "@/lib/types"

interface StatusBarProps {
  status: SystemStatus
}

export function StatusBar({ status }: StatusBarProps) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-2.5 md:px-6">
      <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
        <span>Last scan: {status.lastScan}</span>
        <span className="mx-1">·</span>
        <span>Next scan: {status.nextScan}</span>
        <span className="mx-1">·</span>
        <span>{status.evaluated} evaluated</span>
        <span className="mx-1">·</span>
        <span className="text-accent-green">{status.fireCount} FIRE</span>
        <span className="mx-1">·</span>
        <span className="text-accent-yellow">{status.watchCount} WATCH</span>
        <span className="mx-1">·</span>
        <span className="text-accent-red">{status.blockCount} BLOCK</span>
      </div>

      {status.noTradeReason && (
        <p className="text-[11px] italic text-muted-foreground">
          {status.noTradeReason}
        </p>
      )}

      <span className="text-[10px] italic text-muted-foreground">
        Data is simulated
      </span>
    </footer>
  )
}
