"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const db = supabase();
    const { error: authError } = await db.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) { setBusy(false); setError("Email or password is incorrect."); return; }
    const { data: admin } = await db.rpc("is_admin");
    if (!admin) {
      await db.auth.signOut();
      setBusy(false);
      setError("This account doesn't have admin access.");
      return;
    }
    // Make sure the session cookie is written before the server checks it.
    await db.auth.getSession();
    window.location.assign("/admin");
  };

  return (
    <main className="min-h-[100dvh] bg-slate-950 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white text-slate-900 rounded-3xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center"><Lock className="w-5 h-5" /></span>
          <div>
            <h1 className="text-lg font-black text-slate-900">Dubai Life · Admin</h1>
            <p className="text-xs text-slate-500">Authorised staff only</p>
          </div>
        </div>
        <label className="block">
          <span className="text-xs font-bold text-slate-600">Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-900 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-600">Password</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-900 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </label>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button disabled={busy} className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Sign in
        </button>
      </form>
    </main>
  );
}
