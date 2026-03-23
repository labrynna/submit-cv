import { createClient } from "@supabase/supabase-js";

/** Name of the Supabase Storage bucket that holds raw CV files. */
export const CV_BUCKET = "cvs";

/** Name of the Postgres table that stores CV metadata + vector embeddings. */
export const CV_TABLE = "candidates";

/**
 * Default expiry (in seconds) for signed CV download URLs.
 * Override by setting the SIGNED_URL_EXPIRY_SECONDS environment variable.
 */
export const CV_SIGNED_URL_EXPIRY =
  parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS ?? "", 10) || 300;

/**
 * Returns a server-side Supabase admin client using the service role key.
 * Initialized lazily so the build doesn't fail when env vars are absent.
 * Only use in API routes / server components — never expose to the browser.
 */
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}
