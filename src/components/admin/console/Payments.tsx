"use client";

import { useState } from "react";
import { Page, Table, Badge, Button, aed, when, act, db, useRows, useNames } from "./ui";

interface Payment { id: string; user_id: string; purpose: string; description: string; amount_aed: number; status: string; provider: string | null; provider_ref: string | null; created_at: string; paid_at: string | null }

export function Payments() {
  const [filter, setFilter] = useState("all");
  const { rows, reload } = useRows<Payment>(() => {
    let q = db().from("payments").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    return q;
  }, [filter]);
  const names = useNames((rows ?? []).map((r) => r.user_id));
  const [msg, setMsg] = useState<string | null>(null);

  const markPaid = async (p: Payment) => {
    const ref = prompt(`Confirm payment received for "${p.description}" (${aed(p.amount_aed)}).\nEnter the bank / gateway reference:`);
    if (ref === null) return;
    setMsg(await act(() => db().rpc("admin_mark_paid", { p_payment: p.id, p_provider: "manual", p_provider_ref: ref })) ?? "Marked paid and fulfilled.");
    reload();
  };
  const refund = async (p: Payment) => {
    const note = prompt(`Refund ${aed(p.amount_aed)} for "${p.description}"? Reason:`);
    if (!note) return;
    setMsg(await act(() => db().rpc("admin_refund", { p_payment: p.id, p_note: note })) ?? "Refunded. Remember to return the money through the gateway.");
    reload();
  };

  return (
    <Page title="Payments" subtitle="Every real-money order. Until a gateway is connected, confirm money you've received here."
      actions={<select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm">
        {["all", "requires_payment", "paid", "refunded", "failed", "cancelled"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
      </select>}>
      {msg && <p className="text-sm font-bold text-emerald-700">{msg}</p>}
      <Table head={["When", "Citizen", "What", "Amount", "Status", "Reference", ""]} empty={rows?.length === 0}>
        {(rows ?? []).map((p) => (
          <tr key={p.id}>
            <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">{when(p.created_at)}</td>
            <td className="px-3 py-2.5">{names[p.user_id] ?? p.user_id.slice(0, 8)}</td>
            <td className="px-3 py-2.5">{p.description}</td>
            <td className="px-3 py-2.5 font-bold whitespace-nowrap">{aed(p.amount_aed)}</td>
            <td className="px-3 py-2.5"><Badge status={p.status} /></td>
            <td className="px-3 py-2.5 text-xs text-slate-500">{p.provider ? `${p.provider}: ${p.provider_ref ?? ""}` : "—"}</td>
            <td className="px-3 py-2.5 text-right whitespace-nowrap">
              {p.status === "requires_payment" && <Button onClick={() => markPaid(p)}>Mark paid</Button>}
              {p.status === "paid" && <Button tone="danger" onClick={() => refund(p)}>Refund</Button>}
            </td>
          </tr>
        ))}
      </Table>
    </Page>
  );
}
