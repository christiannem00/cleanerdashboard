import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Gates every /admin/* route to admins (redirects others). Individual pages
// render their own chrome + tabs.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}
