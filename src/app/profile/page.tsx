"use client";

// The citizen's profile: who they are, their wallet, home, job and what they own — all from their
// saved game and the database.

import { InstallApp } from "@/components/pwa/InstallApp";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireCitizen, signOut, updateCitizen } from "@/lib/citizenStore";
import { supabase } from "@/lib/supabase/client";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Briefcase, Home, LogOut, MapPin, ShoppingBag, Users, Wallet, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { LookPicker } from "@/components/avatar/LookPicker";
import { flatRoute, flatTitle } from "@/lib/city/flats";

interface MyFlat { id: string; building_id: string; unit: string; property_type: string; owner_id: string | null; tenant_id: string | null; rent_price: number | null; residentName?: string | null }

export default function ProfilePage() {
  const { citizen } = useRequireCitizen();
  const [flats, setFlats] = useState<MyFlat[] | null>(null);
  const [friends, setFriends] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [now] = useState(() => Date.now());
  const me = citizen?.id;

  useEffect(() => {
    if (!me) return;
    const db = supabase();
    // Results arrive asynchronously; state is only set when they do.
    db.from("flats").select("id, building_id, unit, property_type, owner_id, tenant_id, rent_price").or(`owner_id.eq.${me},tenant_id.eq.${me}`)
      .then(({ data }) => setFlats((data as MyFlat[]) ?? []));
    db.from("friendships").select("user_id", { count: "exact", head: true }).eq("status", "accepted").or(`user_id.eq.${me},friend_id.eq.${me}`)
      .then(({ count }) => setFriends(count ?? 0));
  }, [me]);

  if (!citizen) return <main className="min-h-screen bg-black" />;

  const preset = presetFor(citizen.look ?? { gender: "woman" });
  const days = Math.max(1, Math.ceil((now - Date.parse(citizen.createdAt)) / 86400000));
  const items = (citizen.inventory ?? []).length + (citizen.furniture ?? []).length;
  const visited = citizen.visited?.length ?? 0;
  const recent = (citizen.inventory ?? []).slice(-6).reverse();

  return (
    <main className="relative min-h-screen bg-black overflow-hidden flex flex-col pb-32">
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-900/40 to-black pointer-events-none" />
      <TopBar />

      <div className="relative z-10 flex-1 overflow-y-auto pt-24 px-4 w-full max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col items-center text-center">
          <button onClick={() => setPicking(!picking)} className="relative mb-4" aria-label="Change your look">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rosterThumb(preset)} alt="" className="w-32 h-32 rounded-full object-cover object-top border-4 border-black ring-2 ring-white/20 bg-slate-800" />
            <span className="absolute -bottom-1 -right-1 bg-white text-black text-[10px] font-black rounded-full px-2 py-1">Change</span>
          </button>
          <h1 className="text-3xl font-black text-white">{citizen.name}</h1>
          <p className="text-gray-400 font-medium">@{citizen.username} · Dubai citizen for {days} {days === 1 ? "day" : "days"}</p>
          {citizen.look?.custom && <p className="text-[11px] text-amber-300 mt-1">Your selfie avatar is shown in 3D; pick a look below to switch back to the roster.</p>}
        </div>

        {picking && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
            <div className="flex items-center mb-3">
              <h2 className="flex-1 text-sm font-bold text-white">Your look</h2>
              <button onClick={() => setPicking(false)} className="text-xs font-bold text-emerald-300">Done</button>
            </div>
            <LookPicker dark look={citizen.look ?? { gender: "woman" }} onChange={(look) => updateCitizen((c) => ({ ...c, look }))} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<Wallet className="w-5 h-5 text-emerald-400" />} label="Wallet" value={`AED ${citizen.balance.toLocaleString()}`} />
          <Stat icon={<Users className="w-5 h-5 text-sky-400" />} label="Friends" value={friends === null ? "…" : String(friends)} />
          <Stat icon={<ShoppingBag className="w-5 h-5 text-violet-400" />} label="Items owned" value={String(items)} />
          <Stat icon={<MapPin className="w-5 h-5 text-rose-400" />} label="Places visited" value={String(visited)} />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-5">
          <h2 className="text-lg font-bold text-white">Right now</h2>
          {flats === null ? <Row icon={<Home className="w-6 h-6 text-cyan-400" />} title="Home" value="…" /> : flats.length === 0 ? (
            <Row icon={<Home className="w-6 h-6 text-cyan-400" />} title="Home" value={citizen.home ? `Starter home: ${citizen.home}` : "No home yet"} sub={<Link href="/explore" className="underline">Find a flat to rent or buy on the map</Link>} />
          ) : flats.map((f) => (
            <Row key={f.id} icon={<Home className="w-6 h-6 text-cyan-400" />} title={f.owner_id === me ? "Home (owned)" : "Home (renting)"}
              value={flatTitle({ ...f, residentName: citizen.name } as Parameters<typeof flatTitle>[0])}
              sub={<Link href={flatRoute(f as Parameters<typeof flatRoute>[0])} className="underline">{f.property_type}{f.tenant_id === me && f.rent_price ? ` · AED ${f.rent_price.toLocaleString()}/month` : ""} · go there</Link>} />
          ))}
          <Row icon={<Briefcase className="w-6 h-6 text-blue-400" />} title="Job"
            value={citizen.job ? `${citizen.job.role} at ${citizen.job.storeName}` : "Not working"}
            sub={citizen.job ? `AED ${citizen.job.wage} per shift` : "Shops, cafés and clubs are hiring — talk to their staff."} />
          <Row icon={<CalendarDays className="w-6 h-6 text-amber-400" />} title="Joined" value={new Date(citizen.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })} />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
          <h2 className="text-lg font-bold text-white mb-3">Recent purchases</h2>
          {recent.length === 0 ? <p className="text-sm text-gray-400">Nothing yet — visit The Dubai Mall to go shopping.</p> : (
            <ul className="space-y-2">
              {recent.map((i) => (
                <li key={i.uid} className="flex items-center gap-3 text-white">
                  <span className="text-2xl">{i.icon ?? "🛍️"}</span>
                  <span className="flex-1 min-w-0 text-sm font-bold truncate">{i.name}</span>
                  <span className="text-xs text-emerald-400 font-mono">AED {i.price.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <InstallApp variant="row" />

        <Button variant="outline" onClick={signOut} className="w-full h-12 rounded-xl border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 font-bold">
          <LogOut className="w-4 h-4 mr-2" /> Log out
        </Button>
      </div>

      <BottomNav />
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 min-w-0">
      <div className="bg-black/50 p-2.5 rounded-full shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-lg font-black text-white leading-none mb-1 truncate">{value}</div>
        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function Row({ icon, title, value, sub }: { icon: React.ReactNode; title: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-black/50 border border-white/5 flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-gray-400 mb-0.5 font-medium uppercase tracking-wider">{title}</div>
        <div className="text-base font-bold text-white leading-tight truncate">{value}</div>
        {sub && <div className="text-xs text-blue-400/80 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
