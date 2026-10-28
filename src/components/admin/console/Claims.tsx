"use client";

import { useState } from "react";
import { Page, Table, Badge, Button, when, act, db, useRows } from "./ui";
import { venueName } from "@/lib/commerce";

interface Claim { id: string; venue_key: string; status: string; applicant_role: string | null; evidence: string | null; document_url: string | null; review_note: string | null; created_at: string; businesses: { name: string; trade_license: string | null; contact_email: string | null; contact_phone: string | null; website: string | null } | null }
interface Sub { venue_key: string; business_id: string; status: string; current_period_end: string | null }

/** Ownership documents are private; admins get a short-lived link. */
async function openDocument(ref: string) {
  if (!ref.startsWith("claim-docs:")) { window.open(ref, "_blank", "noopener"); return; }
  const { data } = await db().storage.from("claim-docs").createSignedUrl(ref.slice("claim-docs:".length), 300);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
}

export function Claims() {
  const [filter, setFilter] = useState("pending");
  const { rows, reload } = useRows<Claim>(() => {
    let q = db().from("venue_claims").select("*, businesses(name, trade_license, contact_email, contact_phone, website)").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    return q;
  }, [filter]);
  const { rows: subs } = useRows<Sub>(() => db().from("venue_subscriptions").select("venue_key, business_id, status, current_period_end"));
  const [msg, setMsg] = useState<string | null>(null);

  const review = async (c: Claim, approve: boolean) => {
    const note = prompt(approve ? "Verified how? (e.g. trade license checked, call to listed number)" : "Reason for rejecting:");
    if (note === null) return;
    setMsg(await act(() => db().rpc("admin_review_claim", { p_claim: c.id, p_approve: approve, p_note: note })) ?? (approve ? "Claim verified." : "Claim rejected."));
    reload();
  };

  return (
    <Page title="Venue claims" subtitle="Verify that the applicant owns or is authorised to manage the venue before approving."
      actions={<select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm">
        {["pending", "verified", "rejected", "all"].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>}>
      {msg && <p className="text-sm font-bold text-emerald-700">{msg}</p>}
      <Table head={["Venue", "Business", "Applicant & evidence", "Plan", "Status", ""]} empty={rows?.length === 0}>
        {(rows ?? []).map((c) => {
          const sub = subs?.find((s) => s.venue_key === c.venue_key);
          return (
            <tr key={c.id} className="align-top">
              <td className="px-3 py-2.5"><div className="font-bold">{venueName(c.venue_key)}</div><div className="text-[11px] text-slate-400">{when(c.created_at)}</div></td>
              <td className="px-3 py-2.5 text-xs">
                <div className="font-bold text-sm">{c.businesses?.name}</div>
                {c.businesses?.trade_license && <div>License: {c.businesses.trade_license}</div>}
                <div>{c.businesses?.contact_email}</div><div>{c.businesses?.contact_phone}</div>
                {c.businesses?.website && <a className="text-sky-600" href={c.businesses.website} target="_blank" rel="noreferrer">{c.businesses.website}</a>}
              </td>
              <td className="px-3 py-2.5 text-xs max-w-xs">
                <div className="font-bold">{c.applicant_role}</div>
                <p className="whitespace-pre-wrap text-slate-600">{c.evidence}</p>
                {c.document_url && <button className="text-sky-600 font-bold" onClick={() => openDocument(c.document_url!)}>View document</button>}
                {c.review_note && <p className="text-slate-400 mt-1">Note: {c.review_note}</p>}
              </td>
              <td className="px-3 py-2.5">{sub ? <Badge status={sub.status} /> : <span className="text-xs text-slate-400">none</span>}</td>
              <td className="px-3 py-2.5"><Badge status={c.status} /></td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
                {c.status === "pending" && <><Button onClick={() => review(c, true)}>Verify</Button><Button tone="danger" onClick={() => review(c, false)}>Reject</Button></>}
              </td>
            </tr>
          );
        })}
      </Table>
    </Page>
  );
}
