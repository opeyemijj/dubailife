import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Relay (TURN) servers for Spaces voice. Phones on mobile data are often behind networks that two browsers can't
// connect through directly; the relay carries the audio for them. Short-lived credentials from Cloudflare's TURN
// service (free tier), handed only to signed-in players. Without the two keys set, Spaces use direct connections only.
export async function POST() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (!keyId || !token) return NextResponse.json({ iceServers: null });

  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 86400 }),
      cache: "no-store",
    });
    if (!r.ok) return NextResponse.json({ iceServers: null });
    const { iceServers } = (await r.json()) as { iceServers: { urls: string | string[]; username?: string; credential?: string }[] };
    // Port 53 is blocked by browsers and only slows connecting down.
    const usable = iceServers
      .map((s) => ({ ...s, urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u)) }))
      .filter((s) => s.urls.length);
    return NextResponse.json({ iceServers: usable }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ iceServers: null });
  }
}
