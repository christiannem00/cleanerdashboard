import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // First-login onboarding gate: until the two business-profile questions are
  // answered, every portal page redirects to /onboarding.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("business_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) redirect("/onboarding");
  }

  return (
    <div className="portal">
      <Sidebar />
      <main className="portalmain">{children}</main>
    </div>
  );
}
