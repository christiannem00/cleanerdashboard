import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Who is allowed to see the admin dashboard. Comma-separated emails in the
// ADMIN_EMAILS env var; falls back to the owner so it works out of the box.
export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "c@serviche.com";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

// Service-role client — bypasses row-level security so the admin can read
// EVERY user's rows. Never import this into a client component; it must only
// ever run on the server (it holds the service-role key).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Admin dashboard needs SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) set in the environment."
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Confirms the logged-in user is an admin. Returns the user, or redirects
// (to /login if signed out, to /dashboard if signed in but not an admin —
// so ordinary customers never learn the admin page exists).
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/dashboard");
  return user;
}
