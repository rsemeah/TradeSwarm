import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireRuntimeEnv } from '@/lib/env/server-runtime'

export async function createClient() {
  const cookieStore = await cookies()
  const url = requireRuntimeEnv('supabase-server', 'NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = requireRuntimeEnv('supabase-server', 'NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )
}
