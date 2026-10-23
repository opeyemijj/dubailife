"use client";

// Any admin: change your own admin password (the current one is required).

import { useState } from "react";
import { Page, Card, Button, act, db } from "./ui";

const MESSAGES: Record<string, string> = {
  wrong_password: "Your current password isn't right.",
  password_too_short: "The new password needs at least 10 characters.",
  same_password: "Pick a password different from your current one.",
};

export function MyAccount({ email, role }: { email: string; role: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirmPw) return setMsg({ ok: false, text: "The two new passwords don't match." });
    setBusy(true); setMsg(null);
    const err = await act(() => db().rpc("admin_change_my_password", { p_current: current, p_new: next }));
    setBusy(false);
    if (err) return setMsg({ ok: false, text: Object.entries(MESSAGES).find(([k]) => err.includes(k))?.[1] ?? err });
    setMsg({ ok: true, text: "Password changed. Your other devices were signed out; this one stays signed in." });
    setCurrent(""); setNext(""); setConfirmPw("");
  };

  const field = "w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-normal";
  return (
    <Page title="My account" subtitle={`${email} · ${role.replace("_", " ")}`}>
      <Card title="Change password" className="max-w-md">
        <form onSubmit={save} className="space-y-3">
          <label className="block text-xs font-bold text-slate-600 space-y-1">
            <span>Current password</span>
            <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className={field} />
          </label>
          <label className="block text-xs font-bold text-slate-600 space-y-1">
            <span>New password</span>
            <input type="password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" placeholder="At least 10 characters" className={field} />
          </label>
          <label className="block text-xs font-bold text-slate-600 space-y-1">
            <span>Confirm new password</span>
            <input type="password" required minLength={10} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" className={field} />
          </label>
          {msg && <p className={`text-sm font-bold ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Change password"}</Button>
        </form>
      </Card>
    </Page>
  );
}
