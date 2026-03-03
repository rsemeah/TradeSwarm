/**
 * HTTP adapter with timeout and circuit breaker pattern
 * Enterprise-grade resilience for external service calls
 */

type CircuitState = {
  failures: number
  openedAt: number | null
}

const state: Record<string, CircuitState> = {}

/**
 * Fetch with configurable timeout - aborts if response takes too long
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const timeoutMs = init.timeoutMs ?? 450
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

/**
 * Check if circuit breaker allows the request
 * Returns false if circuit is open (too many recent failures)
 */
export function circuitAllow(
  key: string, 
  opts?: { maxFailures?: number; openMs?: number }
): boolean {
  const maxFailures = opts?.maxFailures ?? 3
  const openMs = opts?.openMs ?? 20_000

  const s = (state[key] ??= { failures: 0, openedAt: null })
  
  // Circuit is open - check if we should try half-open
  if (s.openedAt && Date.now() - s.openedAt < openMs) {
    return false
  }

  // Half-open after openMs - allow one request through
  if (s.openedAt && Date.now() - s.openedAt >= openMs) {
    s.openedAt = null
    s.failures = 0
    return true
  }

  return s.failures < maxFailures
}

/**
 * Record a successful call - reset circuit breaker
 */
export function circuitSuccess(key: string): void {
  const s = (state[key] ??= { failures: 0, openedAt: null })
  s.failures = 0
  s.openedAt = null
}

/**
 * Record a failed call - increment failures, potentially open circuit
 */
export function circuitFail(key: string, maxFailures = 3): void {
  const s = (state[key] ??= { failures: 0, openedAt: null })
  s.failures += 1
  if (s.failures >= maxFailures) {
    s.openedAt = Date.now()
  }
}

/**
 * Get current circuit state for monitoring/health checks
 */
export function getCircuitState(key: string): {
  status: "closed" | "open" | "half-open"
  failures: number
  openedAt: number | null
} {
  const s = state[key] ?? { failures: 0, openedAt: null }
  
  let status: "closed" | "open" | "half-open" = "closed"
  if (s.openedAt) {
    status = Date.now() - s.openedAt >= 20_000 ? "half-open" : "open"
  }
  
  return { status, failures: s.failures, openedAt: s.openedAt }
}
