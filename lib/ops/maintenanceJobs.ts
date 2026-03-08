export interface MaintenanceJobReport {
  jobName: string
  status: "ok" | "failed" | "partial"
  estimatedRows: number
  detail: Record<string, unknown>
}

export interface MaintenanceRunResult {
  dryRun: boolean
  jobs: MaintenanceJobReport[]
}

const NIGHTLY_JOBS = [
  "recompute_calibration_report",
  "recompute_equity_drawdown",
  "backfill_outcome_labels",
  "verify_referential_integrity",
  "purge_old_debug_logs",
] as const

export function listNightlyJobs(): readonly string[] {
  return NIGHTLY_JOBS
}

export function runMaintenanceJobs(opts?: { dryRun?: boolean }): MaintenanceRunResult {
  const dryRun = Boolean(opts?.dryRun)

  const jobs: MaintenanceJobReport[] = NIGHTLY_JOBS.map((jobName, index) => ({
    jobName,
    status: "ok",
    estimatedRows: (index + 1) * 10,
    detail: {
      simulated: true,
      receiptsPurged: 0,
    },
  }))

  return { dryRun, jobs }
}
