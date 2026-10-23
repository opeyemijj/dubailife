"use client";

// The admin team (super admins only): add admins, change their roles and remove them. The database
// enforces every rule (super admins only, never the last super admin, never yourself) and audits it.

import { Fragment, useState } from "react";
import { Page, Card, Table, Button, when, act, db, useRows } from "./ui";

interface AdminRow {
  user_id: string; email: string; role: string; created_at: string; last_sign_in_at: string | null;
  username: string | null; added_by_email: string | null;
}

const ROLES = [
  { id: "super_admin", label: "Super admin", hint: "Everything, including managing admins" },
  { id: "admin", label: "Admin", hint: "Runs the console: venues, ads, players, settings" },
  { id: "finance", label: "Finance", hint: "Payments, refunds and payouts" },
  { id: "moderator", label: "Moderator", hint: "Reports and player safety" },
];
const roleLabel = (id: string) => ROLES.find((r) => r.id === id)?.label ?? id;

const MESSAGES: Record<string, string> = {
  last_super_admin: "There must always be at least one super admin.",
  cannot_remove_self: "You can't remove your own admin access.",
  password_too_short: "Passwords need at least 10 characters.",
  invalid_email: "That isn't a valid email address.",
};
const friendly = (m: string | null) => (m ? Object.entries(MESSAGES).find(([k]) => m.includes(k))?.[1] ?? m : null);

export function Admins({ myId }: { myId: string }) {
  const { rows, reload } = useRows<AdminRow>(() => db().rpc("admin_list"));
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwFor, setPwFor] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { data, error } = await db().rpc("admin_add", { p_email: email, p_role: role, p_password: password || null });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: friendly(error.message.replace(/^.*?:\s*/, "")) ?? "Couldn't add that admin." });
    const done = { created: "New login created", added: "Admin added", updated: "Role updated" }[data as string] ?? "Done";
    setMsg({ ok: true, text: `${done}: ${email.trim().toLowerCase()} is now ${roleLabel(role)}.${data === "created" ? " Share the password with them privately." : ""}` });
    setEmail(""); setPassword("");
    reload();
  };

  const changeRole = async (a: AdminRow, next: string) => {
    if (next === a.role || !confirm(`Make ${a.email} ${roleLabel(next)}?`)) return reload();
    const err = await act(() => db().rpc("admin_set_role", { p_user: a.user_id, p_role: next }));
    setMsg(err ? { ok: false, text: friendly(err)! } : { ok: true, text: `${a.email} is now ${roleLabel(next)}.` });
    reload();
  };

  const saveNewPassword = async (e: React.FormEvent, a: AdminRow) => {
    e.preventDefault();
    const err = await act(() => db().rpc("admin_set_password", { p_user: a.user_id, p_password: newPw }));
    if (err) return setMsg({ ok: false, text: friendly(err)! });
    setMsg({ ok: true, text: `New password set for ${a.email}. They were signed out everywhere; share the new password with them privately.` });
    setPwFor(null); setNewPw("");
  };

  const remove = async (a: AdminRow) => {
    if (!confirm(`Remove admin access for ${a.email}? Their login stays, but they can no longer open the admin console.`)) return;
    const err = await act(() => db().rpc("admin_remove", { p_user: a.user_id }));
    setMsg(err ? { ok: false, text: friendly(err)! } : { ok: true, text: `${a.email} is no longer an admin.` });
    reload();
  };

  return (
    <Page title="Admins" subtitle="Who can open the admin console, and what they can do. Every change is written to the audit log.">
      {msg && <p className={`text-sm font-bold ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>}

      <Card title="Add an admin">
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_180px_1fr_auto] items-end">
          <label className="text-xs font-bold text-slate-600 space-y-1">
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@mydubailife.app"
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm font-normal" />
          </label>
          <label className="text-xs font-bold text-slate-600 space-y-1">
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm font-normal">
              {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600 space-y-1">
            <span>Password <span className="font-normal text-slate-400">(only for a new login)</span></span>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" autoComplete="new-password"
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm font-normal" />
          </label>
          <Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add admin"}</Button>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          If the email already has a Dubai Life account, it simply gets admin access (leave the password empty). Otherwise a new login is
          created with the password you set. {ROLES.map((r) => `${r.label}: ${r.hint.toLowerCase()}.`).join(" ")}
        </p>
      </Card>

      <Table head={["Admin", "Role", "Added", "Last sign-in", ""]} empty={rows?.length === 0}>
        {(rows ?? []).map((a) => (
          <Fragment key={a.user_id}>
          <tr>
            <td className="px-3 py-2.5">
              <div className="font-bold">{a.email}{a.user_id === myId && <span className="ml-1.5 text-[11px] font-bold text-emerald-600">you</span>}</div>
              <div className="text-[11px] text-slate-400">{a.username ? `Plays as @${a.username}` : "Admin login only"}</div>
            </td>
            <td className="px-3 py-2.5">
              <select value={a.role} disabled={a.user_id === myId} onChange={(e) => changeRole(a, e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold disabled:opacity-60">
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </td>
            <td className="px-3 py-2.5 text-xs whitespace-nowrap">{when(a.created_at)}{a.added_by_email && <div className="text-[11px] text-slate-400">by {a.added_by_email}</div>}</td>
            <td className="px-3 py-2.5 text-xs whitespace-nowrap">{when(a.last_sign_in_at)}</td>
            <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
              {a.user_id !== myId && <Button tone="secondary" onClick={() => { setPwFor(pwFor === a.user_id ? null : a.user_id); setNewPw(""); }}>Set password</Button>}
              {a.user_id !== myId && <Button tone="danger" onClick={() => remove(a)}>Remove</Button>}
            </td>
          </tr>
          {pwFor === a.user_id && (
            <tr className="bg-slate-50">
              <td colSpan={5} className="px-3 py-3">
                <form onSubmit={(e) => saveNewPassword(e, a)} className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">New password for {a.email}:</span>
                  <input type="text" required minLength={10} value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password"
                    placeholder="At least 10 characters" className="h-9 w-64 rounded-xl border border-slate-200 bg-white px-3 text-sm" />
                  <Button type="submit">Save password</Button>
                  <Button type="button" tone="secondary" onClick={() => setPwFor(null)}>Cancel</Button>
                  <span className="text-[11px] text-slate-400">They&apos;ll be signed out on every device.</span>
                </form>
              </td>
            </tr>
          )}
          </Fragment>
        ))}
      </Table>
    </Page>
  );
}
