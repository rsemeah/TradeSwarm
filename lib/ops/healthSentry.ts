export type HealthState = "OK" | "WARN" | "ALERT"

export interface SentryResult {
  checkType: "api" | "data" | "broker"
  state: HealthState
  detail: Record<string, unknown>
  recommendedAction?: string
}

export interface HealthSnapshot {
  api: SentryResult
  data: SentryResult
  broker: SentryResult
}

export function apiSentry(dbReachable: boolean, serviceResponding: boolean): SentryResult {
  const state: HealthState = dbReachable && serviceResponding ? "OK" : "ALERT"
  return {
    checkType: "api",
    state,
    detail: { dbReachable, serviceResponding },
    recommendedAction: state === "ALERT" ? "verify service process and database connectivity" : undefined,
  }
}

export function dataSentry(feedAgeSec: number, maxFeedAgeSec: number, snapshotHashPresent: boolean, schemaMatch: boolean): SentryResult {
  const stale = feedAgeSec > maxFeedAgeSec
  const state: HealthState = stale || !snapshotHashPresent || !schemaMatch ? "ALERT" : "OK"

  return {
    checkType: "data",
    state,
    detail: { feedAgeSec, maxFeedAgeSec, snapshotHashPresent, schemaMatch },
    recommendedAction: state === "ALERT" ? "refresh market snapshot pipeline and confirm schema versions" : undefined,
  }
}

export function brokerSentry(tokenValid: boolean, orderEndpointReachable: boolean): SentryResult {
  const state: HealthState = tokenValid && orderEndpointReachable ? "OK" : "ALERT"
  return {
    checkType: "broker",
    state,
    detail: { tokenValid, orderEndpointReachable },
    recommendedAction: state === "ALERT" ? "renew broker auth and probe order endpoint" : undefined,
  }
}

export function collectHealthSnapshot(input: {
  dbReachable: boolean
  serviceResponding: boolean
  feedAgeSec: number
  maxFeedAgeSec: number
  snapshotHashPresent: boolean
  schemaMatch: boolean
  tokenValid: boolean
  orderEndpointReachable: boolean
}): HealthSnapshot {
  return {
    api: apiSentry(input.dbReachable, input.serviceResponding),
    data: dataSentry(input.feedAgeSec, input.maxFeedAgeSec, input.snapshotHashPresent, input.schemaMatch),
    broker: brokerSentry(input.tokenValid, input.orderEndpointReachable),
  }
}

export function toIncidentEntries(snapshot: HealthSnapshot): Array<{ alert_type: string; metrics_snapshot: Record<string, unknown>; recommended_action: string }> {
  return [snapshot.api, snapshot.data, snapshot.broker]
    .filter((entry) => entry.state === "ALERT")
    .map((entry) => ({
      alert_type: `${entry.checkType.toUpperCase()}_ALERT`,
      metrics_snapshot: entry.detail,
      recommended_action: entry.recommendedAction ?? "investigate",
    }))
}
