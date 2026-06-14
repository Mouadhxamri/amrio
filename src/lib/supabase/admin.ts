import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS entirely. Never expose to the browser.
// Use only in server-side code (server actions, route handlers, scripts).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
