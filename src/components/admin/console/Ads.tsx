"use client";

import { useState } from "react";
import { Page, Table, Badge, Button, aed, when, act, db, useRows, useNames } from "./ui";

interface Campaign { id: string; placement: string; owner_id: string; title: string; subtitle: string | null; link_url: string | null; creative_url: string; weeks: number; price_aed: number; status: string; starts_at: string | null; ends_at: string | null; impressions: number; clicks: number; created_at: string }

export function Ads() {
  const [filter, setFilter] = useState("pending_review");
  const { rows, reload } = useRows<Campaign>(() => {
    let q = db().from("ad_campaigns").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    return q;
  }, [filter]);
  const names = useNames((rows ?? []).map((r) => r.owner_id));
  const [msg, setMsg] = useState<string | null>(null);
  const set = async (c: Campaign, status: string) => {
    const note = status === "rejected" ? prompt("Why is this ad rejected? (shown to the advertiser)") : null;
    if (status === "rejected" && !note) return;
    setMsg(await act(() => db().rpc("admin_review_campaign", { p_campaign: c.id, p_status: status, p_note: note })) ?? `Campaign ${status}.`);
    reload();
  };

  return (
    <Page title="Advertising" subtitle="Paid campaigns wait here for review. Approving starts the paid weeks."
      actions={<select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm">
        {["pending_review", "active", "paused", "pending_payment", "rejected", "ended", "all"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
      </select>}>
      {msg && <p className="text-sm font-bold text-emerald-700">{msg}</p>}
      <Table head={["Creative", "Ad", "Placement", "Paid", "Runs", "Performance", "Status", ""]} empty={rows?.length === 0}>
        {(rows ?? []).map((c) => (
          <tr key={c.id} className="align-top">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <td className="px-3 py-2.5"><a href={c.creative_url} target="_blank" rel="noreferrer"><img src={c.creative_url} alt="" className="w-28 h-16 object-cover rounded-lg bg-slate-100" /></a></td>
            <td className="px-3 py-2.5 text-xs max-w-[220px]">
              <div className="font-bold text-sm">{c.title}</div>
              {c.subtitle && <div className="text-slate-500">{c.subtitle}</div>}
              {c.link_url && <a className="text-sky-600 break-all" href={c.link_url} target="_blank" rel="noreferrer">{c.link_url}</a>}
              <div className="text-slate-400 mt-1">by {names[c.owner_id] ?? c.owner_id.slice(0, 8)}</div>
            </td>
            <td className="px-3 py-2.5 text-xs">{c.placement.replace("billboard:", "Billboard ").replace("floor:", "Floor ad ")}</td>
            <td className="px-3 py-2.5 font-bold whitespace-nowrap">{aed(c.price_aed)}<div className="text-[11px] font-normal text-slate-400">{c.weeks} wk</div></td>
            <td className="px-3 py-2.5 text-xs whitespace-nowrap">{c.starts_at ? `${when(c.starts_at)} → ${when(c.ends_at)}` : "Not started"}</td>
            <td className="px-3 py-2.5 text-xs whitespace-nowrap">{c.impressions.toLocaleString()} views<br />{c.clicks.toLocaleString()} clicks</td>
            <td className="px-3 py-2.5"><Badge status={c.status} /></td>
            <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
              {(c.status === "pending_review" || c.status === "paused") && <Button onClick={() => set(c, "active")}>{c.status === "paused" ? "Resume" : "Approve"}</Button>}
              {c.status === "active" && <Button tone="secondary" onClick={() => set(c, "paused")}>Pause</Button>}
              {c.status === "pending_review" && <Button tone="danger" onClick={() => set(c, "rejected")}>Reject</Button>}
              {c.status === "active" && <Button tone="danger" onClick={() => set(c, "ended")}>End</Button>}
            </td>
          </tr>
        ))}
      </Table>
      <p className="text-xs text-slate-400">Rejecting a paid campaign doesn&apos;t refund it automatically — refund it from Payments.</p>
    </Page>
  );
}
