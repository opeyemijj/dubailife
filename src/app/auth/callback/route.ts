import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Where email confirmation & OAuth callbacks land: swap the code for a session, then continue.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  if (code) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      // Check if user already completed onboarding and has a profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      const defaultTarget = profile ? "/home" : "/onboarding/look";
      const target = next && next.startsWith("/") && !next.startsWith("//") ? next : defaultTarget;
      return NextResponse.redirect(new URL(target, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/?login=true&error=link", url.origin));
}
