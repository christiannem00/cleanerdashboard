import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  // Build the redirect first, then let Supabase write the cleared session
  // cookies onto THIS response. (Returning a fresh NextResponse without this
  // drops the Set-Cookie headers, so the session never actually clears.)
  const response = NextResponse.redirect(`${origin}/login`, { status: 303 });
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.signOut();
  return response;
}
