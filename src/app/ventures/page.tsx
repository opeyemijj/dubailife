"use client";

// Player ventures and crews (design spec sections 10 and 20.1): start a business, bring up to 4 friends in
// as partners, post jobs, hire players, and split the profit. Revenue grows 0.5x for each qualified staff
// member who works shifts, up to 3x. Payroll comes out of the venture's own takings every Friday 17:00 GST.

import { useLifeLoop } from "@/lib/lifeLoop";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plus, Users } from "lucide-react";
import { useRequireCitizen } from "@/lib/citizenStore";
import { supabase } from "@/lib/supabase/client";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  aed, answerCrewInvite, buyVenture, closeJob, collectProfit, daysUntil, endJob, inviteToCrew, myEconomy, postJob, reviewApplication,
  VENTURES, ventureType, type Economy, type Requirement, type Venture,
} from "@/lib/economy";
import { gameAudio } from "@/utils/gameAudio";

export default function VenturesPage() {
  const { citizen } = useRequireCitizen();
  const [eco, setEco] = useState<Economy | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [shop, setShop] = useState(false);
  const load = useCallback(async () => { const r = await myEconomy(); if (r.data) setEco(r.data); }, []);
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, [load]);
  const say = (ok: boolean, text: string) => { setNote({ ok, text }); if (ok) gameAudio.playClickSound(); };

  return (
    <main className="min-h-[100dvh] bg-slate-950 text-white pb-32">
      <div className="max-w-lg mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/explore" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-black">🏢 My ventures</h1>
            <p className="text-xs text-slate-400">Run a business with friends and hire players</p>
          </div>
          <Link href="/jobs" className="text-xs font-black px-3 py-2 rounded-full bg-white/10">Job Board</Link>
        </div>
        {note && <p className={`text-sm font-bold text-center ${note.ok ? "text-emerald-300" : "text-rose-300"}`}>{note.text}</p>}

        {eco?.invites.map((i) => (
          <div key={i.id} className="rounded-2xl bg-amber-500/15 border border-amber-400/40 p-3.5 flex items-center gap-3">
            <span className="text-2xl">{ventureType(i.type)?.icon}</span>
            <span className="flex-1 text-sm"><b>{i.name}</b> invited you to join their crew as a partner.</span>
            <button onClick={async () => { const r = await answerCrewInvite(i.id, true); if (r.error) say(false, r.error); else { say(true, `You're now a partner in ${i.name}!`); void load(); } }}
              className="text-xs font-black px-3 py-1.5 rounded-full bg-emerald-500 text-slate-950">Join</button>
            <button onClick={async () => { await answerCrewInvite(i.id, false); void load(); }} className="text-xs font-bold text-slate-400">No</button>
          </div>
        ))}

        {eco === null ? <p className="text-sm text-slate-500">Loading…</p>
          : eco.ventures.map((v) => <VentureCard key={v.id} v={v} me={citizen?.id ?? ""} say={say} reload={load} />)}

        {eco && (shop || eco.ventures.length === 0) ? <Shop balance={citizen?.balance ?? 0} onDone={(ok, text) => { say(ok, text); if (ok) { setShop(false); void load(); } }} />
          : eco && eco.ventures.length < 3 && (
            <button onClick={() => setShop(true)} className="w-full h-12 rounded-2xl bg-white/10 font-black text-sm flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Start another venture</button>
          )}
      </div>
      <BottomNav />
    </main>
  );
}

function Shop({ balance, onDone }: { balance: number; onDone: (ok: boolean, text: string) => void }) {
  const life = useLifeLoop();
  const [type, setType] = useState(VENTURES.types[0].id);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const t = ventureType(type)!;
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Start a venture</h2>
      <div className="grid grid-cols-2 gap-2">
        {VENTURES.types.map((o) => (
          <button key={o.id} onClick={() => setType(o.id)} className={`rounded-2xl p-3 text-left border ${type === o.id ? "bg-sky-600 border-sky-400" : "bg-slate-900 border-white/10"}`}>
            <span className="text-2xl">{o.icon}</span>
            <span className="block font-black text-sm mt-1">{o.label}</span>
            <span className="block text-[11px] text-white/70">{aed(o.cost)} · earns {aed(o.daily)}/day</span>
          </button>
        ))}
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={`Name your ${t.label.toLowerCase()}`} className="w-full h-12 rounded-2xl bg-white/10 px-4 text-base outline-none" />
      <button disabled={busy || name.trim().length < 2 || balance < t.cost} onClick={async () => {
        // Sustainability before luxury: warn before a purchase that leaves little runway.
        const left = balance - t.cost, daily = life?.daily ?? 0;
        if (left < balance / 2 && !confirm(`This leaves you ${aed(left)}${daily > 0 ? `, about ${Math.floor(left / daily)} days of living costs` : ""}. The venture earns from tomorrow. Buy anyway?`)) return;
        setBusy(true); const r = await buyVenture(type, name); setBusy(false);
        onDone(!r.error, r.error ?? `🎉 ${name.trim()} is open for business!`);
      }} className="w-full h-12 rounded-2xl bg-emerald-500 text-slate-950 font-black disabled:opacity-40">
        {balance < t.cost ? `You need ${aed(t.cost)}` : `Buy for ${aed(t.cost)}`}
      </button>
      <p className="text-[11px] text-slate-500">Revenue is paid into the venture each day, up to 3 days at a time. Staff wages come only from that revenue.</p>
    </section>
  );
}

function VentureCard({ v, me, say, reload }: { v: Venture; me: string; say: (ok: boolean, t: string) => void; reload: () => void }) {
  const t = ventureType(v.type);
  const [now] = useState(() => Date.now());
  const [posting, setPosting] = useState(false);
  const [inviting, setInviting] = useState(false);
  const run = async (p: Promise<{ error?: string; data?: unknown }>, ok: string) => { const r = await p; if (r.error) say(false, r.error); else { say(true, ok); reload(); } };
  const reserve = v.staff.reduce((s, x) => s + x.weeklyWage, 0);

  return (
    <section className="rounded-3xl bg-slate-900 border border-white/10 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{t?.icon}</span>
        <div className="flex-1 min-w-0"><p className="font-black text-lg leading-tight truncate">{v.name}</p><p className="text-xs text-slate-400">{t?.label} · {t?.area}</p></div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-white/5 p-2"><p className="text-[10px] text-slate-400">Takings</p><p className="font-black text-sm">{aed(v.treasury)}</p></div>
        <div className="rounded-2xl bg-white/5 p-2"><p className="text-[10px] text-slate-400">Per day</p><p className="font-black text-sm">{aed(v.daily * v.multiplier)}</p><p className="text-[10px] text-emerald-300">×{Number(v.multiplier).toFixed(1)}</p></div>
        <div className="rounded-2xl bg-white/5 p-2"><p className="text-[10px] text-slate-400">Payroll in</p><p className="font-black text-sm">{daysUntil(v.nextPayroll, now)}</p></div>
      </div>
      <button disabled={v.treasury - reserve <= 0} onClick={() => run(collectProfit(v.id), "Profit shared with your crew 💸")}
        className="w-full h-11 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm disabled:opacity-40">
        Collect profit{reserve > 0 ? ` (keeps ${aed(reserve)} for wages)` : ""}
      </button>

      <div>
        <div className="flex items-center justify-between mb-1.5"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Crew</p>
          {v.members.length < VENTURES.maxPartners && <button onClick={() => setInviting(!inviting)} className="text-xs font-black text-sky-300 flex items-center gap-1"><Users className="w-3 h-3" /> Invite a friend</button>}</div>
        <div className="flex flex-wrap gap-1.5">
          {v.members.map((m) => <span key={m.id} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${m.role === "invited" ? "bg-white/5 text-slate-400" : "bg-white/10"}`}>@{m.username}{m.id === me ? " (you)" : ""} · {m.role}</span>)}
        </div>
        {inviting && <InviteFriend me={me} exclude={v.members.map((m) => m.id)} onPick={(id) => { setInviting(false); void run(inviteToCrew(v.id, id), "Invite sent"); }} />}
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">Staff · ×{Number(v.multiplier).toFixed(1)} revenue</p>
        {v.staff.length === 0 ? <p className="text-xs text-slate-500">No staff yet. Each qualified employee who works shifts adds 0.5× revenue (up to 3×).</p>
          : v.staff.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-xl bg-white/5 p-2.5 mb-1">
              <span className="flex-1 text-sm"><b>@{s.username}</b> · {s.title}{s.qualified ? " 🎓" : ""}<span className="block text-[11px] text-slate-400">{aed(s.weeklyWage)}/wk · {s.shifts}/{s.shiftsPerWeek} shifts this week</span></span>
              <button onClick={() => { if (confirm(`Let @${s.username} go?`)) void run(endJob(s.id), "They've left the venture."); }} className="text-[11px] font-bold text-rose-300">Let go</button>
            </div>
          ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Jobs</p>
          <button onClick={() => setPosting(!posting)} className="text-xs font-black text-sky-300">+ Post a job</button></div>
        {posting && <PostJob roles={t?.roles ?? ["Staff"]} onPost={(title, wage, shifts, req) => { setPosting(false); void run(postJob(v.id, title, wage, shifts, req), "Job posted on the Job Board"); }} />}
        {v.jobs.map((j) => (
          <div key={j.id} className="rounded-xl bg-white/5 p-2.5 mb-1 space-y-1.5">
            <div className="flex items-center gap-2"><span className="flex-1 text-sm font-bold">{j.title} · {aed(j.weeklyWage)}/wk · {j.shiftsPerWeek} shifts</span>
              <button onClick={() => run(closeJob(j.id), "Job closed")} className="text-[11px] font-bold text-slate-400">Close</button></div>
            {j.applicants.length === 0 ? <p className="text-[11px] text-slate-500">No applicants yet.</p> : j.applicants.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1">@{a.username} {a.qualified ? "🎓" : ""}{a.licence ? " 🚗" : ""}</span>
                <button onClick={() => run(reviewApplication(j.id, a.id, true), `@${a.username} hired!`)} className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950">Hire</button>
                <button onClick={() => run(reviewApplication(j.id, a.id, false), "Application declined")} className="text-[11px] font-bold text-slate-400">Decline</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function PostJob({ roles, onPost }: { roles: string[]; onPost: (title: string, wage: number, shifts: number, req: Requirement) => void }) {
  const [title, setTitle] = useState(roles[0]);
  const [wage, setWage] = useState(2000);
  const [shifts, setShifts] = useState(3);
  const [req, setReq] = useState<Requirement>("none");
  return (
    <div className="rounded-2xl bg-white/5 p-3 space-y-2 mb-2">
      <select value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-10 rounded-xl bg-slate-800 px-3 text-sm">{roles.map((r) => <option key={r}>{r}</option>)}</select>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-slate-400">Weekly wage (AED)<input type="number" min={100} max={50000} step={100} value={wage} onChange={(e) => setWage(Number(e.target.value))} className="w-full h-10 rounded-xl bg-slate-800 px-3 text-base text-white" /></label>
        <label className="text-[11px] text-slate-400">Shifts a week<input type="number" min={1} max={7} value={shifts} onChange={(e) => setShifts(Number(e.target.value))} className="w-full h-10 rounded-xl bg-slate-800 px-3 text-base text-white" /></label>
      </div>
      <select value={req} onChange={(e) => setReq(e.target.value as Requirement)} className="w-full h-10 rounded-xl bg-slate-800 px-3 text-sm">
        {Object.entries(VENTURES.requirements).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </select>
      <button disabled={wage < 100 || wage > 50000 || shifts < 1 || shifts > 7} onClick={() => onPost(title, Math.round(wage), Math.round(shifts), req)} className="w-full h-10 rounded-xl bg-sky-500 font-black text-sm disabled:opacity-40">Post on the Job Board</button>
    </div>
  );
}

function InviteFriend({ me, exclude, onPick }: { me: string; exclude: string[]; onPick: (id: string) => void }) {
  const [friends, setFriends] = useState<Array<{ id: string; username: string }> | null>(null);
  useEffect(() => {
    void (async () => {
      const { data } = await supabase().from("friendships").select("user_id, friend_id").eq("status", "accepted").or(`user_id.eq.${me},friend_id.eq.${me}`);
      const ids = (data ?? []).map((f) => (f.user_id === me ? f.friend_id : f.user_id)).filter((id) => !exclude.includes(id));
      if (!ids.length) return setFriends([]);
      const { data: ps } = await supabase().from("profiles").select("id, username").in("id", ids);
      setFriends((ps ?? []) as Array<{ id: string; username: string }>);
    })();
  }, [me]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!friends) return <p className="text-xs text-slate-500 mt-2">Loading friends…</p>;
  if (!friends.length) return <p className="text-xs text-slate-500 mt-2">Add friends first. Only friends can join your crew.</p>;
  return <div className="flex flex-wrap gap-1.5 mt-2">{friends.map((f) => <button key={f.id} onClick={() => onPick(f.id)} className="text-xs font-black px-3 py-1.5 rounded-full bg-sky-500">@{f.username}</button>)}</div>;
}
