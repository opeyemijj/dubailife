"use client";

import { useState } from "react";
import { Page, Table, Button, when, act, db, useRows, useNames } from "./ui";

interface Idea { id: string; author_id: string; title: string; body: string | null; category: string; status: string; team_note: string | null; votes: number; hidden: boolean; created_at: string }
const STATUSES = ["open", "under_review", "planned", "in_progress", "shipped", "declined"];

export function IdeasAdmin() {
  const [filter, setFilter] = useState("all");
  const { rows, reload } = useRows<Idea>(() => {
    let q = db().from("ideas").select("*").order("votes", { ascending: false }).order("created_at", { ascending: false }).limit(300);
    if (filter !== "all") q = q.eq("status", filter);
    return q;
  }, [filter]);
  const names = useNames((rows ?? []).map((r) => r.author_id));
  const [msg, setMsg] = useState<string | null>(null);
  const update = async (i: Idea, patch: { status?: string; note?: string | null; hidden?: boolean }) => {
    setMsg(await act(() => db().rpc("admin_update_idea", { p_idea: i.id, p_status: patch.status ?? i.status, p_note: patch.note === undefined ? i.team_note : patch.note, p_hidden: patch.hidden ?? i.hidden })) ?? "Updated.");
    reload();
  };
  return (
    <Page title="Community ideas" subtitle="What citizens are asking for, ranked by votes. Set a status and reply — they see it on their phone."
      actions={<select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm">
        {["all", ...STATUSES].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
      </select>}>
      {msg && <p className="text-sm font-bold text-emerald-700">{msg}</p>}
      <Table head={["Votes", "Idea", "Status", "Team reply", ""]} empty={rows?.length === 0}>
        {(rows ?? []).map((i) => (
          <tr key={i.id} className={`align-top ${i.hidden ? "opacity-50" : ""}`}>
            <td className="px-3 py-2.5 text-lg font-black">{i.votes}</td>
            <td className="px-3 py-2.5 max-w-md">
              <div className="font-bold">{i.title}</div>
              {i.body && <p className="text-xs text-slate-600 whitespace-pre-wrap">{i.body}</p>}
              <div className="text-[11px] text-slate-400 mt-1">{names[i.author_id] ?? "citizen"} · {i.category} · {when(i.created_at)}</div>
            </td>
            <td className="px-3 py-2.5">
              <select value={i.status} onChange={(e) => update(i, { status: e.target.value })} className="h-8 rounded-lg border border-slate-200 bg-white px-1 text-xs">
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </td>
            <td className="px-3 py-2.5 text-xs max-w-xs text-slate-600">{i.team_note ?? "—"}</td>
            <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
              <Button tone="secondary" onClick={() => { const note = prompt("Reply shown to citizens:", i.team_note ?? ""); if (note !== null) void update(i, { note: note || null }); }}>Reply</Button>
              <Button tone={i.hidden ? "secondary" : "danger"} onClick={() => update(i, { hidden: !i.hidden })}>{i.hidden ? "Unhide" : "Hide"}</Button>
            </td>
          </tr>
        ))}
      </Table>
    </Page>
  );
}
