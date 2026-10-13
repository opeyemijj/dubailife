import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Where the email-confirmation link lands: swap the one-time code for a session, then continue.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  // Only allow relative destinations inside the app.
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding/look";

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, url.origin));
  }
  return NextResponse.redirect(new URL("/?login=true&error=link", url.origin));
}
