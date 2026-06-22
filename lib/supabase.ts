import { createClient } from "@supabase/supabase-js";

// Server-only client using the service_role key. This bypasses RLS, so it must
// NEVER be imported into a client component. Access is gated by the app passphrase.
export function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are not set.");
  return createClient(url, key, { auth: { persistSession: false } });
}
