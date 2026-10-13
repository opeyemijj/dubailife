"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** One shared Supabase client for the browser (auth session, data, realtime). */
export function supabase(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      realtime: {
        // Heartbeats from a worker keep the live connection up while 3D work keeps the page busy or
        // the tab is in the background (where timers are throttled) — otherwise the socket drops and
        // the citizen vanishes from everyone's room until it reconnects.
        worker: true,
        heartbeatIntervalMs: 15000,
        reconnectAfterMs: (tries: number) => [300, 1000, 2000, 4000][tries - 1] ?? 5000,
      },
    });
  }
  return client;
}
