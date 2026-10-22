"use client";

// Monthly tournament audit (design spec 13.5): the frozen standings with fair-play flags, the provisional
// winner's details and ID, and verify / mark paid / disqualify (the next eligible player becomes winner).

import { useEffect, useState } from "react";
import { Page, Table, Badge, Button, act, db } from "./ui";

interface Row { rank: number; userId: string; username: string; learning: number; scam: number; wellbeing: number; career: number; total: number; flags: string[] }
interface Winner { month: string; user_id: string | null; username: string | null; prize: string; amount_aed: number | null; status: string; full_name: string | null; country: string | null; payout_details: string | null; id_document_ref: string | null; disqualified: Array<{ user_id: string; reason: string }>; review_note: string | null }
interface View { month: string; closed: boolean; selfGrading: boolean; settings: { cash_from: string; cash_aed: number }; rows: Row[]; winner: Winner | null }

const monthKey = (offset: number) => {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" }));
  d.setDate(1); d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const FLAG: Record<string, string> = { new_account: "New account", large_transfers: "Large money transfers", admin_account: "Staff account", no_date_of_birth: "No date of birth", muted_or_reported: "Warned or muted" };

async function openDocument(ref: string) {
  const path = ref.replace(/^claim-docs:/, "");
  const { data } = await db().storage.from("claim-docs").createSignedUrl(path, 300);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
}

export function Tournament() {
  const [month, setMonth] = useState(monthKey(-1));
  const [view, setView] = useState<View | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    void db().rpc("admin_tournament", { p_month: month }).then(({ data, error }) => { if (live) { setView(data as View); if (error) setMsg(error.message); } });
    return () => { live = false; };
  }, [month, tick]);

  const decide = async (action: "verify" | "paid" | "disqualify") => {
    const note = prompt(action === "disqualify" ? "Reason for disqualifying (the next eligible player becomes the winner):" : action === "paid" ? "Payment reference (bank transfer ID, voucher number…):" : "How was the ID checked?");
    if (note === null) return;
    // Disqualified players' and paid winners' ID documents are deleted (see the official rules).
    const doc = view?.winner?.id_document_ref;
    if ((action === "paid" || action === "disqualify") && doc) await db().storage.from("claim-docs").remove([doc.replace(/^claim-docs:/, "")]);
    setMsg(await act(() => db().rpc("admin_tournament_decide", { p_month: month, p_action: action, p_note: note })) ?? "Saved.");
    setTick((t) => t + 1);
  };
  const w = view?.winner;

  return (
    <Page title="Tournament" subtitle="Audit the frozen leaderboard, verify the winner's ID and pay the prize."
      actions={<select value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm">
        {[0, -1, -2, -3, -4, -5].map((o) => <option key={o} value={monthKey(o)}>{monthKey(o)}{o === 0 ? " (live)" : ""}</option>)}
      </select>}>
      {view?.selfGrading && (
        <p className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm font-bold text-rose-700">
          Self-grading is ON: quiz and theory results are reported by the app and can be faked. Set SUPABASE_SERVICE_ROLE_KEY in production, then set academy.self_grading to false, before paying any cash prize.
        </p>
      )}
      {view && <p className="text-sm text-slate-500">{view.closed ? "Frozen and snapshotted." : "Live: the month is still running."} Cash prize (AED {view.settings.cash_aed}) applies from {view.settings.cash_from}.</p>}
      {msg && <p className="text-sm font-bold text-emerald-700">{msg}</p>}

      {w && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2"><b>Winner:</b> {w.username ? `@${w.username}` : "none"} <Badge status={w.status} /> <span className="text-slate-500">{w.prize === "cash" ? `AED ${w.amount_aed}` : "Non-cash prize"}</span></div>
          {w.full_name && <div>Name on ID: <b>{w.full_name}</b> · {w.country}</div>}
          {w.payout_details && <div className="whitespace-pre-wrap">Payout: {w.payout_details}</div>}
          {w.id_document_ref && <button className="text-sky-600 font-bold" onClick={() => openDocument(w.id_document_ref!)}>View ID document</button>}
          {w.disqualified.length > 0 && <div className="text-xs text-slate-500">Disqualified: {w.disqualified.map((d) => d.reason).join(" · ")}</div>}
          {w.review_note && <div className="text-xs text-slate-500">Note: {w.review_note}</div>}
          <div className="space-x-1 pt-1">
            {w.status === "under_review" && <Button onClick={() => decide("verify")}>Verify</Button>}
            {w.status === "verified" && <Button onClick={() => decide("paid")}>Mark prize paid</Button>}
            {w.user_id && !["paid", "no_winner"].includes(w.status) && <Button tone="danger" onClick={() => decide("disqualify")}>Disqualify</Button>}
          </div>
        </div>
      )}

      <Table head={["#", "Player", "Learning", "Scam", "Wellbeing", "Career", "Total", "Flags"]} empty={view?.rows.length === 0}>
        {(view?.rows ?? []).map((r) => (
          <tr key={r.userId} className={r.flags.length ? "bg-amber-50/60" : ""}>
            <td className="px-3 py-2 font-black">{r.rank}</td>
            <td className="px-3 py-2 font-bold">@{r.username}</td>
            <td className="px-3 py-2">{r.learning}</td><td className="px-3 py-2">{r.scam}</td><td className="px-3 py-2">{r.wellbeing}</td><td className="px-3 py-2">{r.career}</td>
            <td className="px-3 py-2 font-black">{r.total}</td>
            <td className="px-3 py-2 text-xs text-amber-700">{r.flags.map((f) => FLAG[f] ?? f).join(", ")}</td>
          </tr>
        ))}
      </Table>
    </Page>
  );
}
