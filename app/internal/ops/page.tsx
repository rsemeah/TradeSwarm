import { buildCp3Report } from "@/lib/calibration/cp3"
import { getCalibrationMetrics } from "@/lib/calibration/analytics"
import { getActivePolicy } from "@/lib/calibration/policyGate"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function driftBadge(state: string) {
  if (state === "ALERT") return "bg-rose-500 text-white"
  if (state === "WARN") return "bg-amber-400 text-slate-900"
  return "bg-emerald-500 text-white"
}

export default async function InternalOpsPage() {
  try {
    const supabase = createAdminClient()

    const [cp3, metrics, policy] = await Promise.all([
      buildCp3Report(supabase, 200),
      getCalibrationMetrics(supabase),
      getActivePolicy(supabase),
    ])

    const { data: governance } = await supabase
      .from("model_governance_log")
      .select("new_version,change_summary,created_at")
      .order("created_at", { ascending: false })
      .limit(5)

    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-3xl font-bold mb-2">Internal Ops · Calibration Monitor</h1>
        <p className="text-slate-400 text-sm mb-8">CP3 — Outcome-Calibrated Confidence</p>

        {/* ── CP3 Hero Metrics ─────────────────────────────────────────────── */}
        <section className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <p className="text-slate-400 text-sm">ECE</p>
            <p className="text-2xl font-semibold">{cp3.ece.toFixed(4)}</p>
            <p className="text-slate-500 text-xs mt-1">Expected Calibration Error</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <p className="text-slate-400 text-sm">Brier Score</p>
            <p className="text-2xl font-semibold">{cp3.brierScore.toFixed(4)}</p>
            <p className="text-slate-500 text-xs mt-1">Lower is better (0 = perfect)</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <p className="text-slate-400 text-sm">Sample Size (200d)</p>
            <p className="text-2xl font-semibold">{cp3.sampleSize}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <p className="text-slate-400 text-sm mb-2">Drift State</p>
            <span className={`inline-block rounded px-3 py-1 text-lg font-bold ${driftBadge(cp3.drift)}`}>
              {cp3.drift}
            </span>
          </div>
        </section>

        {/* ── Policy Gate ──────────────────────────────────────────────────── */}
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-8">
          <h2 className="text-xl font-semibold mb-3">Active Policy Gate</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Min Confidence to Execute</p>
              <p className="text-xl font-semibold">{pct(policy.minConfidenceToExecute)}</p>
            </div>
            <div>
              <p className="text-slate-400">Max Risk %</p>
              <p className="text-xl font-semibold">{policy.maxRiskPct}%</p>
            </div>
            <div>
              <p className="text-slate-400">Halt on Alert</p>
              <p className="text-xl font-semibold">{policy.haltOnDriftAlert ? "Yes" : "No"}</p>
            </div>
          </div>
        </section>

        {/* ── Recommended Thresholds ───────────────────────────────────────── */}
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-8">
          <h2 className="text-xl font-semibold mb-3">Recommended Threshold Change</h2>
          <div className="flex items-center gap-4 text-sm">
            <span className={`rounded px-2 py-1 font-bold text-xs ${
              cp3.recommendedThresholds.action === "RAISE"
                ? "bg-amber-400 text-slate-900"
                : "bg-emerald-700 text-white"
            }`}>
              {cp3.recommendedThresholds.action}
            </span>
            <span>New floor: <strong>{pct(cp3.recommendedThresholds.minConfidenceToExecute)}</strong></span>
            <span className="text-slate-400">{cp3.recommendedThresholds.reason}</span>
          </div>
        </section>

        {/* ── Selectivity Curve ────────────────────────────────────────────── */}
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-8">
          <h2 className="text-xl font-semibold mb-1">Selectivity Curve</h2>
          <p className="text-slate-400 text-xs mb-3">
            Win rate for the top X% highest-confidence trades — should improve as you filter tighter.
          </p>
          <div className="grid md:grid-cols-5 gap-3">
            {cp3.selectivity.map((s) => (
              <div key={s.topPct} className="rounded border border-slate-700 p-3 text-center">
                <p className="text-slate-400 text-xs">Top {s.topPct}%</p>
                <p className="text-xl font-bold">{pct(s.winRate)}</p>
                <p className="text-slate-500 text-xs">{s.count} trades</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Calibration Bins (Reliability Diagram) ───────────────────────── */}
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-8">
          <h2 className="text-xl font-semibold mb-1">Confidence Bins (Reliability Diagram)</h2>
          <p className="text-slate-400 text-xs mb-3">
            When the engine says 70–80%, trades should win ~75% of the time.
          </p>
          <div className="space-y-2">
            {cp3.bins.length === 0 ? (
              <p className="text-slate-500 text-sm">No data yet — close some trades to populate.</p>
            ) : (
              cp3.bins.map((bin) => (
                <div key={bin.range} className="grid grid-cols-5 gap-2 text-sm items-center">
                  <span className="font-mono">{bin.range}</span>
                  <span>{bin.count} trades</span>
                  <span>Predicted {pct(bin.predicted)}</span>
                  <span>Actual {pct(bin.actual)}</span>
                  <span className={Math.abs(bin.predicted - bin.actual) > 0.1 ? "text-rose-400" : "text-slate-400"}>
                    δ {pct(Math.abs(bin.predicted - bin.actual))}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── EV Alignment ─────────────────────────────────────────────────── */}
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-8">
          <h2 className="text-xl font-semibold mb-1">Expected Value Alignment</h2>
          <p className="text-slate-400 text-xs mb-3">
            Does expected EV (confidence × credit − (1−confidence) × risk) track realized PnL?
          </p>
          {cp3.evAlignment.sampleSize === 0 ? (
            <p className="text-slate-500 text-sm">No closed options trades yet.</p>
          ) : (
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Expected EV</p>
                <p className="text-xl font-semibold">${cp3.evAlignment.expectedEV.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-400">Realized EV</p>
                <p className="text-xl font-semibold">${cp3.evAlignment.realizedEV.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-400">Alignment Ratio</p>
                <p className={`text-xl font-semibold ${cp3.evAlignment.alignmentRatio < 0.8 ? "text-rose-400" : "text-emerald-400"}`}>
                  {cp3.evAlignment.alignmentRatio.toFixed(3)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Sample Size</p>
                <p className="text-xl font-semibold">{cp3.evAlignment.sampleSize}</p>
              </div>
            </div>
          )}
        </section>

        {/* ── Drift Alerts by Horizon ───────────────────────────────────────── */}
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-8">
          <h2 className="text-xl font-semibold mb-3">Drift Alerts by Horizon</h2>
          <div className="space-y-2 text-sm">
            {metrics.driftAlerts.length === 0 ? (
              <p className="text-slate-500">No horizon data yet.</p>
            ) : (
              metrics.driftAlerts.map((alert) => (
                <div key={alert.horizon} className="flex items-center justify-between rounded border border-slate-700 p-3">
                  <span>Horizon {alert.horizon}d</span>
                  <span>Drift {pct(alert.drift)} / Threshold {pct(alert.threshold)}</span>
                  <span className={alert.flagged ? "text-rose-400 font-bold" : "text-emerald-400"}>
                    {alert.flagged ? "ALERT" : "OK"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Governance Log ───────────────────────────────────────────────── */}
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="text-xl font-semibold mb-3">Recent Governance Changes</h2>
          <div className="space-y-2 text-sm">
            {(governance || []).length === 0 ? (
              <p className="text-slate-500">No governance events yet.</p>
            ) : (
              (governance || []).map((entry) => (
                <div key={`${entry.new_version}-${entry.created_at}`} className="rounded border border-slate-700 p-3">
                  <p className="font-medium">v{entry.new_version}</p>
                  <p>{entry.change_summary}</p>
                  <p className="text-slate-400">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    )
  } catch {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-3xl font-bold mb-4">Internal Ops · Calibration Monitor</h1>
        <p className="text-slate-300">Missing Supabase admin environment variables.</p>
      </main>
    )
  }
}
