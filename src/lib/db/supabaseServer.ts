import { createClient } from "@supabase/supabase-js"

export function createOptionalSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key = serviceRole ?? anonKey

  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}
