import { createClient } from "@supabase/supabase-js"
import { requireRuntimeEnv } from "@/lib/env/server-runtime"

export function createAdminClient() {
  const url = requireRuntimeEnv("supabase-admin", "NEXT_PUBLIC_SUPABASE_URL")
  const serviceKey = requireRuntimeEnv("supabase-admin", "SUPABASE_SERVICE_ROLE_KEY")

  return createClient(url, serviceKey)
}
