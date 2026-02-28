const formatRoutePrefix = (route: string) => `[env:${route}]`

export function requireRuntimeEnv(route: string, key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `${formatRoutePrefix(route)} Missing required environment variable ${key}. Add it in Vercel Project Settings → Environment Variables.`
    )
  }
  return value
}

export function requireAnyRuntimeEnv(route: string, keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]
    if (value) {
      return value
    }
  }

  throw new Error(
    `${formatRoutePrefix(route)} Missing required environment variable. Configure one of: ${keys.join(", ")}.`
  )
}
