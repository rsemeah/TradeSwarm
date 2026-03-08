export function isLocalDevBypassEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false
  if (process.env.TRADESWARM_DEV_BYPASS !== "true") return false

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return true

  try {
    const hostname = new URL(appUrl).hostname
    return hostname === "localhost" || hostname === "127.0.0.1"
  } catch {
    return false
  }
}
