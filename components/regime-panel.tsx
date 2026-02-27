import type { RegimeData } from "@/lib/types"
import { Badge } from "./badge"

interface RegimePanelProps {
  regime: RegimeData
}

export function RegimePanel({ regime }: RegimePanelProps) {
  const getStatusDot = (status: "green" | "yellow" | "red") => {
    const colors = {
      green: "bg-accent-green",
      yellow: "bg-accent-yellow",
      red: "bg-accent-red",
    }
    return (
      <span
        className={`inline-block h-2 w-2 rounded-full ${colors[status]}`}
        aria-hidden="true"
      />
    )
  }

  return (
    <div className="rounded-card border border-border bg-card p-4">
      <h2 className="mb-4 text-[13px] font-bold text-foreground">
        Market Regime
      </h2>

      <div className="space-y-2">
        {regime.indicators.map((indicator, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusDot(indicator.status)}
              <span className="text-[12px] text-muted-foreground">
                {indicator.label}
              </span>
            </div>
            <span className="font-mono text-[12px] text-foreground">
              {indicator.value}
            </span>
          </div>
        ))}
      </div>

      <div className="my-4 h-px bg-border" />

      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] text-muted-foreground">Regime Score</span>
          <p className="font-mono text-[28px] font-bold text-accent-green">
            {regime.score.toFixed(2)}
          </p>
        </div>
        <Badge variant={regime.status === "PASS" ? "green" : "red"}>
          {regime.status}
        </Badge>
      </div>
    </div>
  )
}
