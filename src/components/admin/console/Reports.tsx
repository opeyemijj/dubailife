"use client";

// Player reports (design spec section 15.1): review within 24 hours and dismiss, warn, mute for 7 days
// or ban. Acting on one report closes every open report about the same player.

import { useState } from "react";
import { Page, Table, Badge, Button, when, act, db, useRows } from "./ui";
import { REPORT_REASONS } from "@/lib/safety";

interface Report {
  id: number; reason: string; context: string | null; details: string | null; status: string; created_at: string;
  reporter_id: string | null; target_id: string | null;
}
interface Person { id: string; username: string; display_name: string; created_at: string }
interface Sanction { user_id: string; muted_until: string | null; warnings: number }

const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;
const ACTIONS: Array<{ id: "dismiss" | "warn" | "mute" | "ban"; label: string; tone: "secondary" | "primary" | "danger"; confirm?: string }> = [
  { id: "dismiss", label: "Dismiss", tone: "secondary" },
  { id: "warn", label: "Warn", tone: "primary" },
  { id: "mute", label: "Mute 7d", tone: "primary" },
  { id: "ban", label: "Ban", tone: "danger", confirm: "Ban this player? They are signed out and can't log in again." },
];

export function Reports() {
  const [filter, setFilter] = useState("open");
  const { rows, reload } = useRows<Report>(() => {
    let q = db().from("reports").select("*").order("created_at", { ascending: filter === "open" }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    return q;
  }, [filter]);
  const ids = [...new Set((rows ?? []).flatMap((r) => [r.reporter_id, r.target_id]).filter(Boolean) as string[])];
  const { rows: people } = useRows<Person>(() => db().from("profiles").select("id, username, display_name, created_at").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]), [ids.join()]);
  const { rows: sanctions } = useRows<Sanction>(() => db().from("user_sanctions").select("user_id, muted_until, warnings"), [rows]);
  const [msg, setMsg] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const who = (id: string | null) => {
    const p = people?.find((x) => x.id === id);
    return p ? `@${p.username}` : id ? "…" : "deleted";
  };
  const priorReports = (target: string | null) => (rows ?? []).filter((r) => r.target_id && r.target_id === target).length;

  const decide = async (r: Report, action: (typeof ACTIONS)[number]) => {
    if (action.confirm && !confirm(action.confirm)) return;
    const note = prompt(`Note for the audit log (${action.label}):`, "");
    if (note === null) return;
    setMsg(await act(() => db().rpc("admin_review_report", { p_report: r.id, p_action: action.id, p_note: note })) ?? `${action.label}: done.`);
    reload();
  };

  const overdue = (rows ?? []).filter((r) => r.status === "open" && now - Date.parse(r.created_at) > 24 * 3_600_000).length;

  return (
    <Page title="Reports" subtitle="Answer every report within 24 hours. Acting on a report closes all open reports about that player."
      actions={<select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm">
        {["open", "actioned", "dismissed", "all"].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>}>
      {overdue > 0 && <p className="text-sm font-bold text-rose-600">{overdue} open report{overdue === 1 ? " is" : "s are"} older than 24 hours.</p>}
      {msg && <p className="text-sm font-bold text-emerald-700">{msg}</p>}
      <Table head={["When", "Reported player", "Reason", "Details", "By", "Status", ""]} empty={rows?.length === 0}>
        {(rows ?? []).map((r) => {
          const s = sanctions?.find((x) => x.user_id === r.target_id);
          return (
            <tr key={r.id} className="align-top">
              <td className="px-3 py-2.5 text-xs whitespace-nowrap">{when(r.created_at)}</td>
              <td className="px-3 py-2.5">
                <div className="font-bold">{who(r.target_id)}</div>
                <div className="text-[11px] text-slate-400">
                  {priorReports(r.target_id) > 1 && `${priorReports(r.target_id)} reports here · `}
                  {s?.warnings ? `${s.warnings} warning${s.warnings === 1 ? "" : "s"} · ` : ""}
                  {s?.muted_until && Date.parse(s.muted_until) > now ? `muted until ${when(s.muted_until)}` : ""}
                </div>
              </td>
              <td className="px-3 py-2.5 text-xs font-bold">{reasonLabel(r.reason)}</td>
              <td className="px-3 py-2.5 text-xs max-w-xs"><div className="text-slate-400">{r.context}</div><p className="whitespace-pre-wrap">{r.details}</p></td>
              <td className="px-3 py-2.5 text-xs">{who(r.reporter_id)}</td>
              <td className="px-3 py-2.5"><Badge status={r.status} /></td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
                {r.status === "open" && ACTIONS.map((a) => <Button key={a.id} tone={a.tone} onClick={() => decide(r, a)}>{a.label}</Button>)}
              </td>
            </tr>
          );
        })}
      </Table>
    </Page>
  );
}
