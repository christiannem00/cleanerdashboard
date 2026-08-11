import { createClient as createServiceClient } from "@supabase/supabase-js";

// Service-role client for the ReviewChaser Supabase project (separate DB from
// sergio-lite). Reads/writes the rf_* tables that power the SMS queue. The
// RC_SUPABASE_URL / RC_SERVICE_ROLE_KEY envs are already set on this project
// for the SSO bridge. Server-only.
export function createRcClient() {
  const url = process.env.RC_SUPABASE_URL;
  const key = process.env.RC_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SMS queue needs RC_SUPABASE_URL and RC_SERVICE_ROLE_KEY (ReviewChaser Supabase) set in the environment."
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function rcConfigured(): boolean {
  return Boolean(process.env.RC_SUPABASE_URL && process.env.RC_SERVICE_ROLE_KEY);
}
