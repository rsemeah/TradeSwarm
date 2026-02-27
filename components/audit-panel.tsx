import type { AuditData } from "@/lib/types"

interface AuditPanelProps {
  audit: AuditData
  onClose: () => void
}

export function AuditPanel({ audit, onClose }: AuditPanelProps) {
  return (
    <div className="mt-3 rounded-card border border-border bg-[#0f0f0f] p-3">
      <div className="space-y-4 font-mono text-[11px]">
        {/* Cost Model */}
        <div>
          <h4 className="mb-2 font-bold text-foreground">COST MODEL</h4>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex justify-between">
              <span>Gross ELR:</span>
              <span>{audit.costModel.grossELR}</span>
            </div>
            <div className="flex justify-between">
              <span>TCA Deduction:</span>
              <span>{audit.costModel.tcaDeduction}</span>
            </div>
            <div className="flex justify-between">
              <span>Net ELR:</span>
              <span className="text-accent-green">{audit.costModel.netELR}</span>
            </div>
          </div>
        </div>

        {/* POP Estimate */}
        <div>
          <h4 className="mb-2 font-bold text-foreground">POP ESTIMATE</h4>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex justify-between">
              <span>Delta Proxy:</span>
              <span>{audit.popEstimate.deltaProxy}</span>
            </div>
            <div className="flex justify-between">
              <span>Bucket Hits:</span>
              <span>{audit.popEstimate.bucketHits}</span>
            </div>
            <div className="flex justify-between">
              <span>CI Lower:</span>
              <span>{audit.popEstimate.ciLower}</span>
            </div>
            <div className="flex justify-between">
              <span>Confidence:</span>
              <span>{audit.popEstimate.confidence}</span>
            </div>
          </div>
        </div>

        {/* Kelly Sizing */}
        <div>
          <h4 className="mb-2 font-bold text-foreground">KELLY SIZING</h4>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex justify-between">
              <span>Kelly Raw:</span>
              <span>{audit.kellySizing.kellyRaw}</span>
            </div>
            <div className="flex justify-between">
              <span>Half-Kelly:</span>
              <span>{audit.kellySizing.halfKelly}</span>
            </div>
            <div className="flex justify-between">
              <span>Final (capped):</span>
              <span>{audit.kellySizing.finalCapped}</span>
            </div>
            <div className="flex justify-between">
              <span>Dollar Risk:</span>
              <span>{audit.kellySizing.dollarRisk}</span>
            </div>
          </div>
        </div>

        {/* Gate Results */}
        <div>
          <h4 className="mb-2 font-bold text-foreground">GATE RESULTS</h4>
          <div className="space-y-1">
            {audit.gateResults.map((gate, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className={gate.passed ? "text-accent-green" : "text-accent-red"}>
                  {gate.passed ? "✓" : "✗"}
                </span>
                <span className="text-muted-foreground">{gate.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-muted-foreground">
          {audit.timestamp}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-2 text-muted-foreground hover:text-foreground"
        >
          ✕ Close Audit
        </button>
      </div>
    </div>
  )
}
