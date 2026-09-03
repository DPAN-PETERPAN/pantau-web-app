import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key. Never import this from a
// client component — authorization is enforced in the API route handlers,
// not via Postgres RLS (see supabase/migrations/0001_init.sql).
export function supabaseAdmin() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rawUrl || !key) {
    throw new Error(
      "Supabase belum dikonfigurasi. Set NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local"
    );
  }
  // supabase-js appends "/rest/v1/<table>" itself. If the env var already has
  // a trailing slash or was copy-pasted with "/rest/v1" included (e.g. from a
  // curl example in the Supabase dashboard instead of the plain Project URL),
  // the client builds a doubled path and every query fails with PGRST125
  // "Invalid path specified in request URL". Strip both defensively.
  const url = rawUrl.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
