"use client";

// Choose a new password from the link in the "Reset your password" email.

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { checkPasswordReset, resetPassword } from "@/lib/email";
import { logIn } from "@/lib/citizenStore";

function Reset() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok" | "expired" | "invalid" | "done">("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { void checkPasswordReset(token).then(setState); }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw !== pw2) return setErr("The two passwords don't match.");
    setBusy(true);
    const r = await resetPassword(token, pw);
    if (r.error) { setBusy(false); return setErr(r.error); }
    setState("done");
    const signed = await logIn(r.email!, pw);
    setBusy(false);
    if (signed.ok) setTimeout(() => router.replace("/explore"), 1200);
  };

  return (
    <main className="min-h-[100dvh] bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-1">
          <div className="text-5xl">{state === "done" ? "✅" : state === "ok" || state === "checking" ? "🔑" : "⚠️"}</div>
          <h1 className="text-2xl font-black">
            {state === "checking" ? "Checking your link…" : state === "ok" ? "Choose a new password" : state === "done" ? "Password changed" : state === "expired" ? "This link has expired" : "This link doesn't work"}
          </h1>
          <p className="text-sm text-slate-300">
            {state === "ok" ? "At least 8 characters. You'll be signed out everywhere else."
              : state === "done" ? "Signing you in…"
              : state === "checking" ? "One moment."
              : "Reset links work once, for 1 hour. Ask for a new one from the log-in screen."}
          </p>
        </div>
        {state === "ok" && (
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-300">New password</span>
              <div className="relative mt-1">
                <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required
                  className="w-full h-12 px-4 pr-12 rounded-2xl bg-white/10 border border-white/15 text-base outline-none focus:border-emerald-400" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-slate-400" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-300">Confirm new password</span>
              <input type={show ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required
                className="w-full h-12 mt-1 px-4 rounded-2xl bg-white/10 border border-white/15 text-base outline-none focus:border-emerald-400" />
            </label>
            {err && <p role="alert" className="text-sm font-bold text-rose-300">{err}</p>}
            <button disabled={busy} className="w-full h-12 rounded-2xl bg-emerald-500 text-slate-950 font-black disabled:opacity-60">{busy ? "Saving…" : "Save new password"}</button>
          </form>
        )}
        {(state === "expired" || state === "invalid") && <Link href="/?login=true&forgot=1" className="block text-center h-12 leading-[3rem] rounded-2xl bg-white text-slate-950 font-black">Send me a new link</Link>}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><Reset /></Suspense>;
}
