import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Keeps the Supabase session fresh for the server-rendered admin and business areas, so their
// server-side permission checks see a valid login. Permission checks themselves happen in each
// area's layout and in server actions (see lib/admin/dal.ts); the admin redirect here is an early
// turn-away so admin pages are never rendered for anyone else.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  // Admin pages: turn away anyone who isn't an admin before anything renders.
  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
    const { data: isAdmin } = user ? await supabase.rpc("is_admin") : { data: false };
    if (!isAdmin) return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/business/:path*"],
};
