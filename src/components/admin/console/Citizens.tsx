"use client";

import { Fragment, useState } from "react";
import { Page, Table, Button, coins, when, act, db, useRows } from "./ui";

interface Citizen { id: string; username: string; display_name: string; email: string; balance: number; created_at: string; last_sign_in_at: string | null }
interface Line { id: number; delta: number; balance_after: number; kind: string; reason: string | null; created_at: string }

export function Citizens() {
  const [q, setQ] = useState("");
  const { rows, reload } = useRows<Citizen>(() => db().rpc("admin_list_citizens", { p_query: q.trim().replace(/[%,]/g, ""), p_limit: 200 }), [q]);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const adjust = async (c: Citizen) => {
    const amount = prompt(`Adjust @${c.username}'s virtual AED (use a minus sign to remove):`);
    if (!amount || !Number(amount)) return;
    const reason = prompt("Reason (kept in the audit log):");
    if (!reason) return;
    setMsg(await act(() => db().rpc("admin_adjust_coins", { p_user: c.id, p_delta: Math.trunc(Number(amount)), p_reason: reason })) ?? "Adjusted.");
    reload();
  };

  const remove = async (c: Citizen) => {
    const typed = prompt(`Delete @${c.username} (${c.email}) and ALL their data — wallet, homes, messages, purchases? This can't be undone.\nType the username to confirm:`);
    if (typed?.trim().replace(/^@/, "") !== c.username) return;
    setMsg(await act(() => db().rpc("admin_delete_citizen", { p_user: c.id })) ?? `Deleted @${c.username}. Their homes are back on the market.`);
    reload();
  };

  return (
    <Page title="Citizens" subtitle="Players, their wallets and every coin movement.">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by username, name or email" className="w-full sm:w-80 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" />
      {msg && <p className="text-sm font-bold text-emerald-700">{msg}</p>}
      <Table head={["Citizen", "Email", "Joined", "Last login", "Wallet", ""]} empty={rows?.length === 0}>
        {(rows ?? []).map((c) => (
          <Fragment key={c.id}>
            <tr>
              <td className="px-3 py-2.5"><div className="font-bold">{c.display_name}</div><div className="text-xs text-sky-600">@{c.username}</div></td>
              <td className="px-3 py-2.5 text-slate-600">{c.email}</td>
              <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{when(c.created_at)}</td>
              <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{when(c.last_sign_in_at)}</td>
              <td className="px-3 py-2.5 font-bold whitespace-nowrap">{coins(c.balance)}</td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
                <Button tone="secondary" onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? "Hide" : "Ledger"}</Button>
                <Button onClick={() => adjust(c)}>Adjust</Button>
                <Button tone="danger" onClick={() => remove(c)}>Delete</Button>
              </td>
            </tr>
            {open === c.id && <tr><td colSpan={6} className="bg-slate-50 px-3 py-3"><Ledger user={c.id} /></td></tr>}
          </Fragment>
        ))}
      </Table>
    </Page>
  );
}

function Ledger({ user }: { user: string }) {
  const { rows } = useRows<Line>(() => db().from("coin_ledger").select("id, delta, balance_after, kind, reason, created_at").eq("user_id", user).order("created_at", { ascending: false }).limit(50), [user]);
  if (!rows) return <p className="text-xs text-slate-400">Loading…</p>;
  if (!rows.length) return <p className="text-xs text-slate-400">No coin movements recorded yet.</p>;
  return (
    <div className="space-y-1 text-xs">
      {rows.map((l) => (
        <div key={l.id} className="flex gap-3">
          <span className="w-32 text-slate-400">{when(l.created_at)}</span>
          <span className="w-24 font-bold capitalize">{l.kind.replace("_", " ")}</span>
          <span className={`w-24 font-mono font-bold ${l.delta < 0 ? "text-rose-600" : "text-emerald-600"}`}>{l.delta > 0 ? "+" : ""}{l.delta.toLocaleString()}</span>
          <span className="w-28 font-mono text-slate-500">= {l.balance_after.toLocaleString()}</span>
          <span className="flex-1 text-slate-500 truncate">{l.reason}</span>
        </div>
      ))}
    </div>
  );
}
