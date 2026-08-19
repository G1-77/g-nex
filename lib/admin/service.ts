// Server-only service-role client. Never import this from a client component
// or a file that runs in the browser — the service role must never leak.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}