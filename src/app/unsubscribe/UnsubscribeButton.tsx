"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const go = async () => {
    setState("busy");
    const { data, error } = await supabase().rpc("email_unsubscribe", { p_token: token });
    setState(!error && data ? "done" : "error");
  };
  if (state === "done") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-300">Done. We won&apos;t send you reminder emails any more. Account emails, like password resets, still come through.</p>
        <p className="text-xs text-slate-500">Changed your mind? Switch <b>Reminder emails</b> back on in your settings.</p>
        <Link href="/" className="inline-block rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-black text-white">Back to Dubai Life</Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">Stop the welcome tips and &quot;we miss you&quot; emails from Dubai Life?</p>
      <button onClick={go} disabled={state === "busy"} className="w-full h-12 rounded-full bg-rose-600 hover:bg-rose-500 disabled:opacity-60 font-black text-white">
        {state === "busy" ? "One moment…" : "Unsubscribe"}
      </button>
      {state === "error" && <p className="text-xs font-bold text-rose-400">That link didn&apos;t work. Turn them off in your settings instead.</p>}
      <Link href="/" className="block text-xs font-bold text-slate-500 hover:text-slate-300">Keep them coming</Link>
    </div>
  );
}
