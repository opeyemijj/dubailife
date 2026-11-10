import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Missing party code." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Verify authenticated user
    const supabase = await supabaseServer();
    let { data: { user } } = await supabase.auth.getUser();

    // Also support Authorization header Bearer token if called from external client
    if (!user) {
      const authHeader = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (authHeader) {
        const { data: authData } = await supabase.auth.getUser(authHeader);
        user = authData?.user ?? null;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

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

    // Check party invite and verify the caller is actually the host or an admin
    const { data: invite, error: fetchErr } = await client
      .from("invites")
      .select("host_id, code")
      .eq("code", cleanCode)
      .maybeSingle();

    if (fetchErr || !invite) {
      return NextResponse.json({ error: "Party invite not found." }, { status: 404 });
    }

    // Verify caller is the host of this party
    if (invite.host_id !== user.id) {
      // Check if caller is an admin
      let isAdmin = false;
      try {
        const { data } = await client.rpc("is_admin");
        isAdmin = Boolean(data);
      } catch {
        isAdmin = false;
      }
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden. Only the host can end this party." }, { status: 403 });
      }
    }

    const nowIso = new Date().toISOString();

    // 1. Attempt RPC end_party with p_host_id
    try {
      const { error: rpcErr1 } = await client.rpc("end_party", {
        p_code: cleanCode,
        p_host_id: user.id,
      });
      if (!rpcErr1) {
        return NextResponse.json({ ok: true, method: "rpc_host" });
      }
    } catch {}

    // 2. Direct admin update: sets ends_at = now, cancelled = true, lights_out = false
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
