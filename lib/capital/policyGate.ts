export type DriftState = "OK" | "WARN" | "ALERT"

export interface CapitalGateContext {
  driftState: DriftState
  drawdownBrake: number
  driftWarnThrottle: number
}

export interface CapitalGateResult {
  allowed: boolean
  reason?: "drift_alert" | "drawdown_brake"
  throttleMultiplier: number
}

export function evaluateCapitalGate(context: CapitalGateContext): CapitalGateResult {
  if (context.driftState === "ALERT") {
    return { allowed: false, reason: "drift_alert", throttleMultiplier: 0 }
  }

  if (context.drawdownBrake <= 0) {
    return { allowed: false, reason: "drawdown_brake", throttleMultiplier: 0 }
  }

  if (context.driftState === "WARN") {
    return {
      allowed: true,
      throttleMultiplier: Math.max(0, Math.min(context.driftWarnThrottle, 1)),
    }
  }

  return { allowed: true, throttleMultiplier: 1 }
}
