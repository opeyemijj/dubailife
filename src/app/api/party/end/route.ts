import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { code, hostId } = await request.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Missing party code." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const key = serviceKey || anonKey;

    if (!url || !key) {
      return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
    }

    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const nowIso = new Date().toISOString();

    // 1. Attempt RPC end_party with p_host_id if provided
    if (hostId) {
      try {
        const { error: rpcErr1 } = await client.rpc("end_party", {
          p_code: cleanCode,
          p_host_id: hostId,
        });
        if (!rpcErr1) {
          return NextResponse.json({ ok: true, method: "rpc_host" });
        }
      } catch {}
    }

    // 2. Attempt RPC end_party with only p_code
    try {
      const { error: rpcErr2 } = await client.rpc("end_party", { p_code: cleanCode });
      if (!rpcErr2) {
        return NextResponse.json({ ok: true, method: "rpc_code" });
      }
    } catch {}

    // 3. Direct admin update: sets ends_at = now, cancelled = true, lights_out = false
    // With service_role key, this bypasses RLS and permanently marks the party ended and cancelled.
    const { error: updErr } = await client
      .from("invites")
      .update({
        ends_at: nowIso,
        cancelled: true,
        lights_out: false,
      })
      .eq("code", cleanCode);

    if (updErr) {
      console.warn("Direct update error ending party:", updErr);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, method: "direct_update" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to end party.";
    console.error("Failed to end party:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
