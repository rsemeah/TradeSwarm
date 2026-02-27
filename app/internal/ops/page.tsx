import { getCalibrationMetrics } from "@/lib/calibration/analytics"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

export default async function InternalOpsPage() {
  try {
    const supabase = createAdminClient()
    const metrics = await getCalibrationMetrics(supabase)

    const { data: governance } = await supabase
      .from("model_governance_log")
      .select("new_version,change_summary,created_at")
      .order("created_at", { ascending: false })
      .limit(5)

    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <h1 className="text-3xl font-bold mb-6">Internal Ops · Calibration Monitor</h1>

      <section className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <p className="text-slate-400 text-sm">Sample Size (30d)</p>
          <p className="text-2xl font-semibold">{metrics.sampleSize}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <p className="text-slate-400 text-sm">Brier Score</p>
          <p className="text-2xl font-semibold">{metrics.brierScore.toFixed(4)}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <p className="text-slate-400 text-sm">Active Drift Alerts</p>
          <p className="text-2xl font-semibold">{metrics.driftAlerts.filter((a) => a.flagged).length}</p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-8">
        <h2 className="text-xl font-semibold mb-3">Precision by Confidence Bucket</h2>
        <div className="space-y-2">
          {metrics.precisionByBucket.map((bucket) => (
            <div key={bucket.bucket} className="grid grid-cols-4 gap-2 text-sm">
              <span>{bucket.bucket}</span>
              <span>{bucket.count} samples</span>
              <span>Precision {pct(bucket.precision)}</span>
              <span>Avg Predicted {pct(bucket.avgPredicted)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-8">
        <h2 className="text-xl font-semibold mb-3">Confidence Reliability Plot</h2>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          {metrics.reliability.map((point) => (
            <div key={point.bucket} className="rounded border border-slate-700 p-3">
              <p className="font-medium mb-1">{point.bucket}</p>
              <p>Expected: {pct(point.expected)}</p>
              <p>Observed: {pct(point.observed)}</p>
              <p>Count: {point.count}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-8">
        <h2 className="text-xl font-semibold mb-3">Drift Alerts</h2>
        <div className="space-y-2 text-sm">
          {metrics.driftAlerts.map((alert) => (
            <div key={alert.horizon} className="flex items-center justify-between rounded border border-slate-700 p-3">
              <span>Horizon {alert.horizon}d</span>
              <span>Drift {pct(alert.drift)} / Threshold {pct(alert.threshold)}</span>
              <span className={alert.flagged ? "text-rose-400" : "text-emerald-400"}>{alert.flagged ? "ALERT" : "OK"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
        <h2 className="text-xl font-semibold mb-3">Recent Governance Changes</h2>
        <div className="space-y-2 text-sm">
          {(governance || []).map((entry) => (
            <div key={`${entry.new_version}-${entry.created_at}`} className="rounded border border-slate-700 p-3">
              <p className="font-medium">v{entry.new_version}</p>
              <p>{entry.change_summary}</p>
              <p className="text-slate-400">{new Date(entry.created_at).toLocaleString()}</p>
            </div>
          ))}
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
