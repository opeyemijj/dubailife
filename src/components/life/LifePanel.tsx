"use client";

// The citizen's life at a glance, opened from the needs dock at home (or S on a keyboard): Profile,
// Needs and feelings, Goals (wishes, certificates, perks), Skills, People, Career and Settings.

import { emailStatus, sendVerification, type EmailStatus } from "@/lib/email";
import { InviteFriends } from "@/components/share/InviteFriends";
import { Roommates } from "./Roommates";
import { openPushCoach, pushStatus } from "@/lib/push/engage";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Bell, LogOut, RefreshCw, Volume2, VolumeX, X } from "lucide-react";
import { deleteMyAccount, myBlocks, unblockUser } from "@/lib/safety";
import { VisaBudgetTab } from "./VisaBudgetTab";
import { LeagueTab } from "./LeagueTab";
import { SeasonTab } from "./SeasonTab";
import { MyStyle } from "./MyStyle";
import { ModalPortal } from "@/components/ui/modal-portal";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { boostNeed, DEFAULT_NEEDS, signOut, updateCitizen, useCitizen, type Citizen, type NeedKey } from "@/lib/citizenStore";
import { LookPicker } from "@/components/avatar/LookPicker";
import { InstallApp } from "@/components/pwa/InstallApp";
import { flatRoute, flatTitle } from "@/lib/city/flats";
import {
  buyPerk, claimWish, feelingsOf, gainSkill, isRusty, lifeEvent, lifeOf, moodOf, PERKS, refreshWishes, rerollWish, REROLLS_PER_DAY, skillLevel, SKILLS, skillXp,
  wishDone, MAX_LEVEL, type WishVenue,
} from "@/lib/life";
import { PLACES } from "@/lib/city/places";
import { ACADEMIC_COURSES } from "@/lib/city/academic";
import { supabase } from "@/lib/supabase/client";
import { contacts, listConversations, type Contact } from "@/lib/messages";
import { gameAudio } from "@/utils/gameAudio";

export type LifeTab = "profile" | "visa" | "league" | "season" | "needs" | "goals" | "skills" | "people" | "career" | "settings";

const TABS: Array<{ id: LifeTab; label: string }> = [
  { id: "profile", label: "✏️ Profile" }, { id: "visa", label: "🛂 Visa & budget" }, { id: "league", label: "🏆 League" }, { id: "season", label: "🎟️ Season" }, { id: "needs", label: "Needs" }, { id: "goals", label: "Goals" }, { id: "skills", label: "Skills" },
  { id: "people", label: "People" }, { id: "career", label: "Career" }, { id: "settings", label: "⚙️ Settings" },
];

/** Venues worth a "visit X" wish: clubs, restaurants, beaches, shows, rinks and waterparks that are open. */
const WISH_VENUES: WishVenue[] = PLACES.flatMap((p) =>
  ["mall", "hotel", "club", "attraction", "food-hall", "park"].includes(p.kind)
    ? p.venues.filter((v) => !v.comingSoon && ["club", "dining", "theatre", "beach", "waterpark", "rink", "bar", "pooldeck"].includes(v.layout)).map((v) => ({ key: `${p.id}/${v.id}`, name: v.name, placeId: p.id }))
    : []);

export function LifePanel({ open, tab, onTab, onClose }: { open: boolean; tab: LifeTab; onTab: (t: LifeTab) => void; onClose: () => void }) {
  const { citizen } = useCitizen();
  const tabs = useRef<HTMLDivElement>(null);

  // Today's wishes are ready whenever the panel opens.
  useEffect(() => { if (open && citizen) refreshWishes(WISH_VENUES); }, [open, citizen?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the chosen tab in view in the scrolling tab bar.
  useEffect(() => {
    tabs.current?.querySelector<HTMLElement>(`[data-tab="${tab}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [tab, open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  if (!open || !citizen) return null;
  const feelings = feelingsOf(citizen);
  const mood = moodOf(feelings);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Your life">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
        <div className="relative w-full sm:max-w-lg bg-white text-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl max-h-[88dvh] flex flex-col animate-in slide-in-from-bottom-8 duration-300 pb-[env(safe-area-inset-bottom)]">
          <div className="pt-2.5 pb-1 flex justify-center sm:hidden" aria-hidden><span className="w-12 h-1.5 rounded-full bg-slate-200" /></div>
          <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600" aria-label="Close"><X className="w-4 h-4" /></button>

          <header className="flex items-center gap-3.5 px-5 sm:px-6 pt-2 sm:pt-6 pb-3 pr-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rosterThumb(presetFor(citizen.look ?? { gender: "woman" }))} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover object-top bg-sky-100 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-black truncate">{citizen.username}</h2>
              <p className="text-sm sm:text-base text-slate-500 truncate"><span className={mood.tone}>{mood.label}</span>{mood.top ? ` · ${mood.top.name}` : ""}</p>
              <MyStyle onOpen={() => onTab("season")} />
            </div>
          </header>

          <div ref={tabs} className="flex gap-2 overflow-x-auto px-5 sm:px-6 pb-3 shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => (
              <button key={t.id} data-tab={t.id} onClick={() => { gameAudio.playClickSound(); onTab(t.id); }}
                className={`shrink-0 h-10 px-4 rounded-full text-sm font-bold transition-colors ${tab === t.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 pb-6">
            {tab === "profile" && <ProfileTab c={citizen} onClose={onClose} />}
            {tab === "visa" && <VisaBudgetTab onClose={onClose} />}
            {tab === "league" && <LeagueTab onClose={onClose} />}
            {tab === "season" && <SeasonTab />}
            {tab === "needs" && <NeedsTab c={citizen} feelings={feelings} onClose={onClose} />}
            {tab === "goals" && <GoalsTab c={citizen} onClose={onClose} />}
            {tab === "skills" && <SkillsTab c={citizen} />}
            {tab === "people" && <PeopleTab c={citizen} onClose={onClose} />}
            {tab === "career" && <CareerTab c={citizen} onClose={onClose} />}
            {tab === "settings" && <SettingsTab onClose={onClose} onProfile={() => onTab("profile")} />}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

// ---------------------------------------------------------------- shared bits

const Section = ({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) => (
  <section className="pt-4 first:pt-1">
    <div className="flex items-center justify-between mb-2.5">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">{title}</h3>
      {right}
    </div>
    {children}
  </section>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-3xl bg-slate-100/80 p-4 ${className}`}>{children}</div>
);

const Sparkle = ({ n }: { n: number }) => <span className="font-black text-blue-600 whitespace-nowrap">+{n}✨</span>;

// ---------------------------------------------------------------- Profile

interface MyFlat { id: string; building_id: string; unit: string; property_type: string; owner_id: string | null; tenant_id: string | null; rent_price: number | null }

const InfoRow = ({ icon, title, value, sub }: { icon: string; title: string; value: string; sub?: React.ReactNode }) => (
  <div className="flex items-center gap-3.5">
    <span className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-xl shrink-0">{icon}</span>
    <div className="min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</div>
      <div className="font-bold leading-tight truncate">{value}</div>
      {sub && <div className="text-xs text-blue-600 mt-0.5">{sub}</div>}
    </div>
  </div>
);

/** Everything from the profile page: your look, wallet, friends, home, job and recent purchases. */
function ProfileTab({ c, onClose }: { c: Citizen; onClose: () => void }) {
  const [now] = useState(() => Date.now());
  const [picking, setPicking] = useState(false);
  const [flats, setFlats] = useState<MyFlat[] | null>(null);
  const [friends, setFriends] = useState<number | null>(null);
  useEffect(() => {
    const db = supabase();
    let live = true;
    db.from("flats").select("id, building_id, unit, property_type, owner_id, tenant_id, rent_price").or(`owner_id.eq.${c.id},tenant_id.eq.${c.id}`)
      .then(({ data }) => { if (live) setFlats((data as MyFlat[]) ?? []); });
    db.from("friendships").select("user_id", { count: "exact", head: true }).eq("status", "accepted").or(`user_id.eq.${c.id},friend_id.eq.${c.id}`)
      .then(({ count }) => { if (live) setFriends(count ?? 0); });
    return () => { live = false; };
  }, [c.id]);

  const days = Math.max(1, Math.ceil((now - Date.parse(c.createdAt)) / 86_400_000));
  const l = lifeOf(c);
  const best = SKILLS.map((s) => ({ s, lv: skillLevel(skillXp(l.skills[s.id], now)).level })).sort((a, b) => b.lv - a.lv)[0];
  const items = (c.inventory ?? []).length + (c.furniture ?? []).length;
  const recent = (c.inventory ?? []).slice(-6).reverse();
  const stats: Array<[string, string]> = [
    ["💰 Wallet", `AED ${c.balance.toLocaleString()}`],
    ["👥 Friends", friends === null ? "…" : String(friends)],
    ["🛍️ Items owned", String(items)],
    ["📍 Places visited", String(c.visited?.length ?? 0)],
    ["✨ Points", String(l.points)],
    ["⭐ Best skill", best && best.lv > 0 ? `${best.s.icon} ${best.s.name} · ${best.lv}` : "None yet"],
  ];
  return (
    <div className="space-y-4 pt-1">
      <div className="flex flex-col items-center text-center">
        <button onClick={() => setPicking(!picking)} className="relative mb-3" aria-label="Change your look">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={rosterThumb(presetFor(c.look ?? { gender: "woman" }))} alt="" className="w-28 h-28 rounded-full object-cover object-top bg-sky-100 ring-4 ring-slate-100" />
          <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[10px] font-black rounded-full px-2 py-1">Change</span>
        </button>
        <div className="text-2xl font-black">{c.name}</div>
        <div className="text-sm text-slate-500">@{c.username} · Dubai citizen for {days} {days === 1 ? "day" : "days"}</div>
        {c.look?.custom && <p className="text-[11px] text-amber-600 mt-1">Your selfie avatar is shown in 3D; pick a look below to switch back to the roster.</p>}
        {c.dream && <p className="mt-2 text-sm"><span className="font-bold">Dream:</span> {c.dream}</p>}
        {!!c.traits?.length && <div className="flex flex-wrap justify-center gap-1.5 mt-2">{c.traits.map((t) => <span key={t} className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-bold">{t}</span>)}</div>}
      </div>

      {picking && (
        <Card>
          <div className="flex items-center mb-3"><h3 className="flex-1 text-sm font-black">Your look</h3><button onClick={() => setPicking(false)} className="text-xs font-black text-emerald-600">Done</button></div>
          <LookPicker look={c.look ?? { gender: "woman" }} onChange={(look) => updateCitizen((x) => ({ ...x, look }))} />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {stats.map(([k, v]) => <Card key={k} className="!p-3.5"><div className="text-[11px] font-bold text-slate-500">{k}</div><div className="text-sm font-black truncate">{v}</div></Card>)}
      </div>

      <Section title="Right now">
        <Card className="space-y-4">
          {flats === null ? <InfoRow icon="🏠" title="Home" value="…" /> : flats.length === 0 ? (
            <InfoRow icon="🏠" title="Home" value={c.home ? `Starter home: ${c.home}` : "No home yet"} sub={<Link href="/explore" onClick={onClose} className="underline">Find a flat to rent or buy on the map</Link>} />
          ) : flats.map((f) => (
            <InfoRow key={f.id} icon="🏠" title={f.owner_id === c.id ? "Home (owned)" : "Home (renting)"}
              value={flatTitle({ ...f, residentName: c.name } as Parameters<typeof flatTitle>[0])}
              sub={<Link href={flatRoute(f as Parameters<typeof flatRoute>[0])} onClick={onClose} className="underline">{f.property_type}{f.tenant_id === c.id && f.rent_price ? ` · AED ${f.rent_price.toLocaleString()}/month` : ""} · go there</Link>} />
          ))}
          <InfoRow icon="💼" title="Job" value={c.job ? `${c.job.role} at ${c.job.storeName}` : "Not working"}
            sub={c.job ? `AED ${c.job.wage} per shift` : "Shops, cafés and clubs are hiring — talk to their staff."} />
          <InfoRow icon="📅" title="Joined" value={new Date(c.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })} />
        </Card>
      </Section>

      <Section title="Recent purchases">
        {recent.length === 0 ? <p className="text-sm text-slate-500">Nothing yet — visit The Dubai Mall to go shopping.</p> : (
          <Card className="space-y-2.5">
            {recent.map((i) => (
              <div key={i.uid} className="flex items-center gap-3">
                <span className="text-2xl">{i.icon ?? "🛍️"}</span>
                <span className="flex-1 min-w-0 text-sm font-bold truncate">{i.name}</span>
                <span className="text-xs text-emerald-600 font-mono font-bold">AED {i.price.toLocaleString()}</span>
              </div>
            ))}
          </Card>
        )}
      </Section>

      <InstallApp variant="light-row" />
      <button onClick={() => { onClose(); void signOut(); }} className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-rose-50 text-rose-600 font-black text-sm"><LogOut className="w-4 h-4" /> Log out</button>
    </div>
  );
}

// ---------------------------------------------------------------- Needs

const NEEDS: Array<{ key: NeedKey; label: string; icon: string; bar: string; bg: string }> = [
  { key: "hunger", label: "Hunger", icon: "🍛", bar: "bg-orange-400", bg: "bg-orange-50" },
  { key: "energy", label: "Energy", icon: "⚡", bar: "bg-blue-500", bg: "bg-blue-50" },
  { key: "fun", label: "Fun", icon: "🎉", bar: "bg-amber-400", bg: "bg-amber-50" },
  { key: "social", label: "Social", icon: "💬", bar: "bg-pink-500", bg: "bg-pink-50" },
  { key: "hygiene", label: "Hygiene", icon: "🫧", bar: "bg-teal-400", bg: "bg-teal-50" },
  { key: "bladder", label: "Bladder", icon: "🚽", bar: "bg-violet-500", bg: "bg-violet-50" },
];

/** What fixes each need: done right here at home, or somewhere to go. */
const FIX: Record<NeedKey, { home?: { label: string; amount: number }; go?: { label: string; href: string } }> = {
  hunger: { home: { label: "Eat at home", amount: 30 }, go: { label: "Eat out", href: "/explore" } },
  energy: { home: { label: "Take a nap", amount: 35 } },
  fun: { go: { label: "Go out", href: "/explore" } },
  social: { go: { label: "Message a friend", href: "/phone" } },
  hygiene: { home: { label: "Shower", amount: 60 } },
  bladder: { home: { label: "Bathroom", amount: 80 } },
};

function NeedsTab({ c, feelings, onClose }: { c: Citizen; feelings: ReturnType<typeof feelingsOf>; onClose: () => void }) {
  const atHome = usePathname() === "/home";
  const needs = { ...DEFAULT_NEEDS, ...c.needs };
  const fix = (k: NeedKey) => {
    const f = FIX[k].home;
    if (!f) return;
    gameAudio.playClickSound();
    boostNeed(k, f.amount);
    if (k === "hunger") { lifeEvent("cook"); gainSkill("cooking", 12); }
  };
  return (
    <div className="space-y-4 pt-1">
      {NEEDS.map((n) => {
        const v = Math.round(needs[n.key]);
        const f = FIX[n.key];
        return (
          <div key={n.key} className="flex items-center gap-3.5">
            <span className={`w-12 h-12 rounded-full ${n.bg} flex items-center justify-center text-xl shrink-0`}>{n.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold">{n.label}</span>
                <span className="flex items-center gap-2">
                  {v < 60 && f.home && atHome && <button onClick={() => fix(n.key)} className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-900 text-white">{f.home.label}</button>}
                  {v < 60 && f.home && !atHome && <Link href="/home" onClick={onClose} className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">Go home</Link>}
                  {v < 60 && !f.home && f.go && <Link href={f.go.href} onClick={onClose} className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">{f.go.label}</Link>}
                  <span className={`text-sm tabular-nums ${v < 15 ? "text-rose-500 font-bold" : "text-slate-500"}`}>{v}%</span>
                </span>
              </div>
              <div className="h-2.5 mt-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${n.bar} transition-[width] duration-500`} style={{ width: `${v}%` }} /></div>
            </div>
          </div>
        );
      })}
      <Section title="Feelings">
        {feelings.length === 0 ? <p className="text-sm text-slate-500">Nothing special right now. Life is steady.</p> : (
          <div className="space-y-2.5">
            {feelings.map((f) => (
              <Card key={f.id} className="flex items-center gap-3.5 !py-3.5">
                <span className="text-3xl shrink-0">{f.icon}</span>
                <div className="flex-1 min-w-0"><div className="font-bold">{f.name}</div><div className="text-sm text-slate-500">{f.text}</div></div>
                <span className={`font-black text-lg tabular-nums ${f.value > 0 ? "text-emerald-600" : "text-rose-500"}`}>{f.value > 0 ? "+" : "−"}{Math.abs(f.value)}</span>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- Goals

function GoalsTab({ c, onClose }: { c: Citizen; onClose: () => void }) {
  const l = lifeOf(c);
  const [flash, setFlash] = useState<string | null>(null);
  const say = (m: string) => { setFlash(m); setTimeout(() => setFlash(null), 2500); };
  const certs = Object.entries(c.academic?.enrolled ?? {}).map(([id, e]) => {
    const course = ACADEMIC_COURSES.find((x) => x.id === id);
    return course ? { id, icon: course.icon, title: course.title, done: e.completedLessons.length, total: course.lessons.length, graduated: !!e.graduatedAt } : null;
  }).filter((x) => !!x);

  return (
    <div className="pt-1">
      <Section title="Wishes" right={<span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-black text-sm">✨{l.points}</span>}>
        <div className="space-y-2.5">
          {l.wishes.map((w) => {
            const done = wishDone(c, w);
            return (
              <Card key={w.id} className="flex items-center gap-3.5 !py-3.5">
                <span className="text-3xl shrink-0">{w.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold leading-tight">{w.label}</div>
                  {!done && w.href && <Link href={w.href} onClick={onClose} className="text-xs font-bold text-blue-600">Go do it ›</Link>}
                </div>
                {done ? (
                  <button onClick={() => { const n = claimWish(w.id, WISH_VENUES); if (n) { gameAudio.playCoinSound(); say(`+${n}✨ collected!`); } }}
                    className="h-10 px-4 rounded-full bg-blue-600 text-white text-sm font-black shrink-0">Claim +{w.reward}✨</button>
                ) : (
                  <>
                    <Sparkle n={w.reward} />
                    <button onClick={() => { if (!rerollWish(w.id, WISH_VENUES)) say(`No more swaps today (${REROLLS_PER_DAY} a day).`); }}
                      disabled={l.rerolls >= REROLLS_PER_DAY} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-white disabled:opacity-30 shrink-0" aria-label="Swap this wish">
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </>
                )}
              </Card>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">New wishes every day · {REROLLS_PER_DAY - Math.min(REROLLS_PER_DAY, l.rerolls)} swaps left today</p>
      </Section>

      <Section title="Certificates" right={<Link href="/academics" onClick={onClose} className="text-sm font-bold text-blue-600">🎓 Courses</Link>}>
        {certs.length === 0 ? <p className="text-sm text-slate-500">No courses yet. Enrol in Academic City to earn diplomas and degrees.</p> : (
          <div className="flex flex-wrap gap-2">
            {certs.map((x) => (
              <Link key={x.id} href={`/academics/course/${x.id}`} onClick={onClose} className={`px-3.5 py-2 rounded-full text-sm font-bold ${x.graduated ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                {x.icon} {x.title} · {x.graduated ? "🎓 Graduated" : `${x.done}/${x.total}`}
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="Perks">
        <div className="grid grid-cols-2 gap-2.5">
          {PERKS.map((p) => {
            const owned = l.perks.includes(p.id);
            const can = !owned && l.points >= p.cost;
            return (
              <button key={p.id} disabled={!can}
                onClick={() => { if (buyPerk(p.id)) { gameAudio.playCoinSound(); say(`${p.icon} ${p.name} unlocked!`); } }}
                className={`text-left rounded-3xl p-4 transition ${owned ? "bg-emerald-50 ring-2 ring-emerald-300" : "bg-slate-100/80"} ${!owned && !can ? "opacity-55" : ""}`}>
                <div className="flex items-start justify-between"><span className="text-3xl">{p.icon}</span><span className={`text-sm font-black ${owned ? "text-emerald-600" : "text-blue-600"}`}>{owned ? "Owned" : `${p.cost}✨`}</span></div>
                <div className="font-bold mt-2 leading-tight">{p.name}</div>
                <div className="text-sm text-slate-500 leading-snug">{p.text}</div>
              </button>
            );
          })}
        </div>
      </Section>
      {flash && <div className="sticky bottom-2 mx-auto w-fit mt-3 px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-bold shadow-xl">{flash}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Skills

function SkillsTab({ c }: { c: Citizen }) {
  const [now] = useState(() => Date.now());
  const l = lifeOf(c);
  return (
    <div className="space-y-2.5 pt-1">
      {SKILLS.map((s) => {
        const st = l.skills[s.id];
        const { level, progress } = skillLevel(skillXp(st, now));
        return (
          <Card key={s.id} className="!px-5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg">{s.icon} {s.name}</span>
              <span className="font-black text-blue-600">Level {level}</span>
            </div>
            {level > 0 || progress > 0 ? (
              <div className="flex gap-1.5 mt-2.5">
                {Array.from({ length: Math.min(MAX_LEVEL, level + (level < MAX_LEVEL ? 1 : 0)) }, (_, i) => (
                  <span key={i} className="h-2.5 flex-1 max-w-[3rem] rounded-full bg-slate-200 overflow-hidden">
                    <span className="block h-full bg-blue-600 rounded-full" style={{ width: i < level ? "100%" : `${Math.round(progress * 100)}%` }} />
                  </span>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400 mt-1.5">{s.how}</p>}
            {isRusty(st, now) && <p className="text-sm text-slate-500 mt-2">🧹 Getting rusty: use it to stop the fade (it won&apos;t drop under level 1)</p>}
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- People

function PeopleTab({ c, onClose }: { c: Citizen; onClose: () => void }) {
  const [friends, setFriends] = useState<Contact[] | null>(null);
  const [recent, setRecent] = useState<Contact[]>([]);
  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase().from("friendships").select("user_id, friend_id").eq("status", "accepted").or(`user_id.eq.${c.id},friend_id.eq.${c.id}`);
      const ids = (data ?? []).map((f) => (f.user_id === c.id ? f.friend_id : f.user_id));
      const [map, convos] = await Promise.all([contacts(ids), listConversations(c.id).catch(() => [])]);
      if (!live) return;
      setFriends(ids.map((id) => map.get(id)).filter((x): x is Contact => !!x));
      setRecent(convos.map((x) => x.with).filter((p) => !ids.includes(p.id)).slice(0, 10));
    })();
    return () => { live = false; };
  }, [c.id]);

  const talked = useMemo(() => new Set(lifeOf(c).talked.filter((k) => k.startsWith(new Date().toISOString().slice(0, 10))).map((k) => k.split(":")[1])), [c]);
  const Row = ({ p, tag }: { p: Contact; tag: string }) => (
    <Link href="/phone" onClick={onClose} className="flex items-center gap-3 rounded-3xl bg-slate-100/80 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={rosterThumb(presetFor(p.look ?? { gender: "woman" }))} alt="" className="w-11 h-11 rounded-full object-cover object-top bg-white" />
      <div className="flex-1 min-w-0"><div className="font-bold truncate">{p.name}</div><div className="text-xs text-slate-500 truncate">@{p.username}</div></div>
      {talked.has(p.id) && <span className="text-[11px] font-bold text-emerald-600">Talked today</span>}
      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-white text-slate-600">{tag}</span>
    </Link>
  );
  if (friends === null) return <p className="text-sm text-slate-500 pt-2">Loading…</p>;
  return (
    <div className="pt-1">
      <InviteFriends username={c.username} />
      <Roommates me={c.id} onClose={onClose} />
      <Section title={`Friends · ${friends.length}`}>
        {friends.length === 0 ? <p className="text-sm text-slate-500">No friends yet. Say hi to people at venues and add them, or find them on your phone.</p>
          : <div className="space-y-2">{friends.map((p) => <Row key={p.id} p={p} tag="Friend" />)}</div>}
      </Section>
      {recent.length > 0 && (
        <Section title="Recently talked to">
          <div className="space-y-2">{recent.map((p) => <Row key={p.id} p={p} tag="Chat" />)}</div>
        </Section>
      )}
      <Link href="/phone" onClick={onClose} className="block text-center mt-4 h-12 leading-[3rem] rounded-2xl bg-slate-900 text-white font-black text-sm">Open your phone</Link>
    </div>
  );
}

// ---------------------------------------------------------------- Career

function CareerTab({ c, onClose }: { c: Citizen; onClose: () => void }) {
  const [now] = useState(() => Date.now());
  const job = c.job;
  const quals = [...(c.academic?.degrees ?? []).map((id) => ({ id, kind: "Degree" })), ...(c.academic?.diplomas ?? []).map((id) => ({ id, kind: "Diploma" }))]
    .map((q) => ({ ...q, course: ACADEMIC_COURSES.find((x) => x.id === q.id) })).filter((q) => q.course);
  const hustle = skillLevel(skillXp(lifeOf(c).skills.hustle, now)).level;
  return (
    <div className="pt-1">
      <div className="grid grid-cols-2 gap-2 mb-1">
        <Link href="/jobs" onClick={onClose} className="rounded-2xl bg-sky-50 p-3 text-sm font-black text-sky-800">💼 Job Board<span className="block text-[11px] font-bold text-sky-700/70">Work for player ventures</span></Link>
        <Link href="/ventures" onClick={onClose} className="rounded-2xl bg-emerald-50 p-3 text-sm font-black text-emerald-800">🏢 My ventures<span className="block text-[11px] font-bold text-emerald-700/70">Start a business, hire</span></Link>
      </div>
      <Section title="Job">
        {job ? (
          <Card>
            <div className="text-lg font-black">{job.role}</div>
            <div className="text-sm text-slate-500">{job.storeName}</div>
            <div className="flex flex-wrap gap-2 mt-3 text-sm font-bold">
              <span className="px-3 py-1 rounded-full bg-white">AED {job.wage.toLocaleString()} / shift</span>
              <span className="px-3 py-1 rounded-full bg-white">💼 Hustle level {hustle}</span>
              {job.lastShiftAt && <span className="px-3 py-1 rounded-full bg-white">Last shift {new Date(job.lastShiftAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>}
            </div>
            <p className="text-xs text-slate-500 mt-3">Go to {job.storeName} and talk to the staff to work a shift.</p>
          </Card>
        ) : (
          <Card>
            <div className="font-bold">Not working yet</div>
            <p className="text-sm text-slate-500 mt-1">Shops, cafés and clubs are hiring. Talk to their staff for an interview.</p>
            <Link href="/explore" onClick={onClose} className="inline-block mt-3 px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-black">Find a job on the map</Link>
          </Card>
        )}
      </Section>
      <Section title="Qualifications" right={<Link href="/academics" onClick={onClose} className="text-sm font-bold text-blue-600">🎓 Study</Link>}>
        {quals.length === 0 ? <p className="text-sm text-slate-500">No diplomas or degrees yet. Graduate from a course in Academic City to unlock its superpower.</p> : (
          <div className="space-y-2">
            {quals.map((q) => (
              <Card key={q.id} className="flex items-center gap-3 !py-3">
                <span className="text-2xl">{q.course!.icon}</span>
                <div className="flex-1 min-w-0"><div className="font-bold leading-tight">{q.course!.title}</div><div className="text-xs text-slate-500">{q.kind} · {q.course!.superpower.icon} {q.course!.superpower.name}</div></div>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- Settings

function SettingsTab({ onClose, onProfile }: { onClose: () => void; onProfile: () => void }) {
  const [muted, setMuted] = useState(() => gameAudio.getIsMuted());
  const [push] = useState(() => pushStatus());
  return (
    <div className="space-y-2.5 pt-1">
      <button onClick={() => { onClose(); setTimeout(() => openPushCoach(), 150); }} className="w-full flex items-center gap-3 rounded-3xl bg-slate-100/80 p-4 text-left">
        <Bell className={`w-5 h-5 ${push === "on" ? "text-emerald-600" : "text-amber-500"}`} />
        <span className="flex-1 font-bold">Notifications</span>
        <span className={`text-xs font-black px-2.5 py-1 rounded-full ${push === "on" ? "bg-emerald-100 text-emerald-700" : push === "blocked" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>
          {push === "on" ? "On" : push === "blocked" ? "Blocked · fix" : push === "install-first" ? "Install app" : push === "unsupported" ? "Not supported" : "Turn on"}
        </span>
      </button>
      <button onClick={() => setMuted(gameAudio.toggleMute())} className="w-full flex items-center gap-3 rounded-3xl bg-slate-100/80 p-4 text-left">
        {muted ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5 text-emerald-600" />}
        <span className="flex-1 font-bold">Sound & music</span>
        <span className={`w-12 h-7 rounded-full p-1 transition-colors ${muted ? "bg-slate-300" : "bg-emerald-500"}`}><span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${muted ? "" : "translate-x-5"}`} /></span>
      </button>
      <button onClick={() => onProfile()} className="w-full text-left flex items-center gap-3 rounded-3xl bg-slate-100/80 p-4 font-bold">👤 <span className="flex-1">Profile & look</span>›</button>
      <Link href="/wallet" onClick={onClose} className="flex items-center gap-3 rounded-3xl bg-slate-100/80 p-4 font-bold">💳 <span className="flex-1">Wallet</span>›</Link>
      <Link href="/guide" onClick={onClose} className="flex items-center gap-3 rounded-3xl bg-amber-50 p-4 font-bold">📖 <span className="flex-1">How Dubai works<span className="block text-xs font-semibold text-slate-500">Visas, money, jobs, prizes and more</span></span>›</Link>
      <div className="hidden sm:flex items-center gap-3 rounded-3xl bg-slate-100/80 p-4 text-sm text-slate-600">⌨️ <span className="flex-1">Press <kbd className="px-1.5 py-0.5 rounded bg-white font-mono font-bold">S</kbd> anywhere to open this panel, <kbd className="px-1.5 py-0.5 rounded bg-white font-mono font-bold">?</kbd> for all shortcuts.</span></div>
      <EmailRow />
      <BlockedPlayers />
      <button onClick={() => { onClose(); void signOut(); }} className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-rose-50 text-rose-600 font-black text-sm mt-3"><LogOut className="w-4 h-4" /> Log out</button>
      <DeleteAccount />
    </div>
  );
}

function EmailRow() {
  const [st, setSt] = useState<EmailStatus | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { void emailStatus().then(setSt); }, []);
  if (!st) return null;
  return (
    <div className={`rounded-3xl p-4 ${st.verified ? "bg-slate-100/80" : "bg-amber-50 border border-amber-200"}`}>
      <div className="flex items-center gap-3">
        <span className="text-xl">📧</span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold">{st.verified ? "Email verified" : "Verify your email"}</span>
          <span className="block text-xs text-slate-500 truncate">{st.email}{st.verified ? "" : " · needed for prizes and invite rewards"}</span>
        </span>
        {st.verified ? <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">✓</span>
          : <button onClick={async () => setNote((await sendVerification()).text)} className="text-xs font-black px-3 py-1.5 rounded-full bg-amber-500 text-white">{st.sentAt ? "Resend" : "Send link"}</button>}
      </div>
      {note && <p className="text-xs font-bold text-slate-600 mt-2">{note}</p>}
    </div>
  );
}

function BlockedPlayers() {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<{ id: string; username: string }[] | null>(null);
  const load = async () => {
    const ids = [...(await myBlocks())];
    if (!ids.length) return setPeople([]);
    const { data } = await supabase().from("profiles").select("id, username").in("id", ids);
    setPeople((data ?? []) as { id: string; username: string }[]);
  };
  return (
    <div className="rounded-3xl bg-slate-100/80">
      <button onClick={() => { setOpen(!open); if (!people) void load(); }} className="w-full flex items-center gap-3 p-4 text-left font-bold">
        <Ban className="w-5 h-5 text-slate-500" /><span className="flex-1">Blocked players</span><span className="text-slate-400">{open ? "⌄" : "›"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {people === null ? <p className="text-xs text-slate-500">Loading…</p>
            : people.length === 0 ? <p className="text-xs text-slate-500">You haven&apos;t blocked anyone. Block someone from their panel: tap them, then <b>Report or block</b>.</p>
            : people.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-2xl bg-white p-2.5">
                <span className="flex-1 text-sm font-bold">@{p.username}</span>
                <button onClick={async () => { if (!(await unblockUser(p.id))) setPeople(people.filter((x) => x.id !== p.id)); }} className="text-xs font-black px-3 py-1.5 rounded-full bg-slate-900 text-white">Unblock</button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function DeleteAccount() {
  const [step, setStep] = useState<"idle" | "confirm">("idle");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (step === "idle") {
    return <button onClick={() => setStep("confirm")} className="w-full text-center text-xs font-bold text-slate-400 hover:text-rose-600 pt-2">Delete my account</button>;
  }
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 space-y-2.5">
      <p className="font-black text-rose-800">Delete your account?</p>
      <p className="text-xs text-rose-900/80">This permanently deletes your citizen, AED, homes, businesses, friends, messages and progress. It can&apos;t be undone. Homes you own or rent go back on the market.</p>
      <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type DELETE to confirm" className="w-full h-11 rounded-xl border border-rose-200 px-3 text-base bg-white" />
      {error && <p className="text-xs font-bold text-rose-700">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => { setStep("idle"); setTyped(""); setError(null); }} className="flex-1 h-11 rounded-xl bg-white text-sm font-black">Keep my account</button>
        <button disabled={typed.trim().toUpperCase() !== "DELETE" || busy} onClick={async () => {
          setBusy(true);
          const e = await deleteMyAccount();
          setBusy(false);
          if (e) setError(e); else window.location.replace("/");
        }} className="flex-1 h-11 rounded-xl bg-rose-600 disabled:opacity-40 text-white text-sm font-black">{busy ? "Deleting…" : "Delete forever"}</button>
      </div>
    </div>
  );
}
