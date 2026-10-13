import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase client for route handlers, reading and writing the auth cookies. */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      // Server components can't set cookies; the proxy refreshes the session for them.
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {}
      },
    },
  });
}
