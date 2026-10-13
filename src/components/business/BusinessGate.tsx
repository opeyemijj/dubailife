"use client";

// The business portal needs a signed-in account (the same login as the game). This shows a sign-in
// form when there isn't one, and the portal when there is.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Store } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export function BusinessGate({ children }: { children: (userId: string) => React.ReactNode }) {
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const db = supabase();
    db.auth.getUser().then(({ data }) => setUser(data.user?.id ?? null));
    const { data: sub } = db.auth.onAuthStateChange((_e, session) => setUser(session?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (user === undefined) return <Shell><p className="text-slate-400 text-sm">Loading…</p></Shell>;
  if (user) return <>{children(user)}</>;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error: err } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError("Email or password is incorrect.");
  };

  return (
    <Shell>
      <form onSubmit={signIn} className="max-w-sm mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Store className="w-5 h-5" /></span>
          <div><h1 className="font-black text-lg">Business portal</h1><p className="text-xs text-slate-500">Sign in to manage your venues and ads</p></div>
        </div>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.ae" className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm" />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm" />
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button disabled={busy} className="w-full h-11 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center gap-2">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Sign in</button>
        <p className="text-xs text-slate-500 text-center">New? <Link href="/?signup=true" className="font-bold text-emerald-700">Create a free account</Link>, then come back here.</p>
      </form>
    </Shell>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/business" className="flex items-center gap-2 font-black">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/brand/icon-192.png" alt="" className="w-8 h-8 rounded-xl" /> Dubai Life <span className="text-slate-400 font-bold">for Business</span></Link>
          <Link href="/explore" className="ml-auto text-sm font-bold text-slate-500 hover:text-slate-900">Back to the city →</Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
