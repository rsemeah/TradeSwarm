export interface KillSwitchState {
  active: boolean
  reason?: string
  updatedAt?: string
}

export function isKillSwitchActive(state: KillSwitchState): boolean {
  return Boolean(state.active)
}
