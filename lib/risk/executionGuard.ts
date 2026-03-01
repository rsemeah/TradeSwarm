import { isKillSwitchActive } from "@/lib/risk/killSwitch"

export type DriftState = "OK" | "WARN" | "ALERT"

export interface ExecutionGuardContext {
  killSwitch: { active: boolean }
  driftState: DriftState
  drawdownBrake: number
  feedAgeSec: number
  feedStalenessMaxSec: number
  dailyLossTotal: number
  dailyLossLimitTotal: number
  tradesToday: number
  maxTradesPerDay: number
  brokerHealthOk: boolean
  brokerMode: "paper" | "live"
}

export interface ExecutionGuardResult {
  allowed: boolean
  reason?: string
  throttleMultiplier: number
}

export function shouldAllowExecute(context: ExecutionGuardContext): ExecutionGuardResult {
  if (isKillSwitchActive(context.killSwitch)) {
    return { allowed: false, reason: "kill_switch_active", throttleMultiplier: 0 }
  }

  if (context.driftState === "ALERT") {
    return { allowed: false, reason: "drift_alert", throttleMultiplier: 0 }
  }

  if (context.drawdownBrake <= 0) {
    return { allowed: false, reason: "drawdown_brake", throttleMultiplier: 0 }
  }

  if (context.feedAgeSec > context.feedStalenessMaxSec) {
    return { allowed: false, reason: "feed_stale", throttleMultiplier: 0 }
  }

  if (context.dailyLossTotal > context.dailyLossLimitTotal) {
    return { allowed: false, reason: "daily_loss_limit", throttleMultiplier: 0 }
  }

  if (context.tradesToday > context.maxTradesPerDay) {
    return { allowed: false, reason: "max_trades_per_day", throttleMultiplier: 0 }
  }

  if (!context.brokerHealthOk && context.brokerMode === "live") {
    return { allowed: false, reason: "broker_health_failed", throttleMultiplier: 0 }
  }

  if (context.driftState === "WARN") {
    return { allowed: true, reason: "drift_warn", throttleMultiplier: 0.6 }
  }

  return { allowed: true, throttleMultiplier: 1 }
}
