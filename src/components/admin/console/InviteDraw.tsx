"use client";

// The invite draw in the back office (src/data/social/draw.json; public.admin_draw_report): the funnel from the
// popup to friends who joined (views, sharers, WhatsApp taps, sign-ups through links, friends that count, entrants),
// day by day, the top inviters with their contact, and picking the winner once the draw has closed.

import { useEffect, useState } from "react";
import { Page, Card, Stat, Table, Button, act, db, when } from "./ui";

interface Totals { viewers: number; views: number; sharers: number; whatsapp: number; copies: number; signups: number; joined: number; inviters: number; entrants: number; entries: number; players: number; newPlayers: number }
interface Day { day: string; views: number; shares: number; signups: number; newPlayers: number }
interface Top { userId: string; username: string; email: string | null; views: number; whatsapp: number; copies: number; signups: number; joined: number; entries: number }
interface Report { campaign: string; startsAt: string; endsAt: string; target: number; prizeAed: number; totals: Totals; daily: Day[]; top: Top[]; winner: { username: string | null; email: string | null; entries: number; pickedAt: string } | null }

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "—");
const n = (x: number) => x.toLocaleString();

export function InviteDraw() {
  const [r, setR] = useState<Report | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let live = true;
    void db().rpc("admin_draw_report", { p_limit: 200 }).then(({ data, error }) => { if (live) { setR(data as Report); setMsg(error?.message ?? null); setClosed(!!data && Date.now() > Date.parse((data as Report).endsAt)); } });
    // Live: refreshes every minute.
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => { live = false; clearInterval(t); };
  }, [tick]);
  const pick = async () => {
    if (!confirm("Pick the winner now? This can only be done once.")) return;
    setMsg(await act(() => db().rpc("admin_draw_pick")) ?? "Winner picked.");
    setTick((x) => x + 1);
  };
  const csv = () => {
    if (!r) return;
    const rows = [["username", "email", "popup views", "whatsapp taps", "link copies", "signed up", "joined (count)", "entries"], ...r.top.map((t) => [t.username, t.email ?? "", t.views, t.whatsapp, t.copies, t.signups, t.joined, t.entries])];
    const blob = new Blob([rows.map((x) => x.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `invite-draw-${r.campaign}.csv`; a.click();
  };
  const t = r?.totals;

  return (
    <Page title="Invite Draw" subtitle={r ? `${r.campaign} · invite ${r.target} friends, win AED ${r.prizeAed.toLocaleString()} · ${when(r.startsAt)} – ${when(r.endsAt)}` : "Returning players inviting friends on WhatsApp"}
      actions={<div className="flex gap-2"><Button tone="secondary" onClick={() => setTick((x) => x + 1)}>Refresh</Button><Button tone="secondary" onClick={csv}>Export CSV</Button></div>}>
      {msg && <p className="text-sm font-bold text-rose-700">{msg}</p>}
      {t && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Saw the popup" value={n(t.viewers)} hint={`${n(t.views)} views`} />
            <Stat label="Shared their link" value={n(t.sharers)} hint={`${pct(t.sharers, t.viewers)} of viewers · ${n(t.whatsapp)} WhatsApp taps, ${n(t.copies)} copies`} tone="sky" />
            <Stat label="Friends signed up" value={n(t.signups)} hint={`${t.sharers ? (t.signups / t.sharers).toFixed(2) : "—"} per sharer (K)`} tone="emerald" />
            <Stat label="Friends that count" value={n(t.joined)} hint={`${pct(t.joined, t.signups)} verified & played`} tone="emerald" />
            <Stat label="Players inviting" value={n(t.inviters)} hint="brought in at least one sign-up" />
            <Stat label="In the draw" value={n(t.entrants)} hint={`${n(t.entries)} entries in all`} tone="amber" />
            <Stat label="New players since start" value={n(t.newPlayers)} hint={`${n(t.players)} players in all`} tone="sky" />
            <Stat label="Goal: 1,000,000 players" value={pct(t.players, 1_000_000)} hint={`${n(Math.max(0, 1_000_000 - t.players))} to go`} tone="rose" />
          </div>

          <Card title="Day by day (Dubai time)">
            <Table head={["Day", "Popup views", "Shares", "Sign-ups via links", "All new players"]} empty={!r.daily.length}>
              {r.daily.map((d) => (
                <tr key={d.day} className="border-t border-slate-100"><td className="py-2 font-bold">{d.day}</td><td>{n(d.views)}</td><td>{n(d.shares)}</td><td>{n(d.signups)}</td><td>{n(d.newPlayers)}</td></tr>
              ))}
            </Table>
          </Card>

          <Card title="The winner">
            {r.winner ? (
              <p className="text-sm"><b>@{r.winner.username}</b> · {r.winner.email ?? "no email"} · {r.winner.entries} entries · picked {when(r.winner.pickedAt)}. Verify their ID and pay as for the tournament (see /prize-rules#draw).</p>
            ) : closed ? (
              <Button onClick={() => void pick()}>Pick the winner (random, by entries)</Button>
            ) : (
              <p className="text-sm text-slate-500">The draw is open until {when(r.endsAt)}; the winner can be picked after that.</p>
            )}
          </Card>

          <Card title={`Top inviters (${r.top.length})`}>
            <Table head={["Player", "Email", "Popup views", "WhatsApp taps", "Copies", "Signed up", "Count", "Entries"]} empty={!r.top.length}>
              {r.top.map((x) => (
                <tr key={x.userId} className="border-t border-slate-100">
                  <td className="py-2 font-bold">@{x.username}</td><td className="text-xs">{x.email ?? "—"}</td><td>{x.views}</td><td>{x.whatsapp}</td><td>{x.copies}</td>
                  <td>{x.signups}</td><td className="font-black text-emerald-700">{x.joined}</td><td className="font-black">{x.entries}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </Page>
  );
}
