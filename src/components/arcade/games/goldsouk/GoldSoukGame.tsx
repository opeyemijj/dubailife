"use client";

// The Gold Souk in Al Ras, Deira: buying gold the way it's really done. Each piece is priced by weight at the
// day's rate for its carat plus a making charge, and the merchant (a Local) opens high. Check it first: the
// loupe reads the hallmark (GP means plated), the scale gives the true weight (some merchants round up), the
// magnet catches fakes. Then haggle against the merchant's patience: lowball and they lose it, walk away and
// they may call you back. Deals are real: the gold goes into your inventory. The trader job turns it round:
// you run a stall and read Local customers.

import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import SOUK from "@/data/arcade/goldsouk.json";
import { CitizenAvatar } from "@/components/avatar/CitizenAvatar";
import type { Accessory } from "@/lib/city/types";
import { adjustBalance, updateCitizen, useCitizen } from "@/lib/citizenStore";
import { useGameProgress, starsFor } from "@/lib/arcade";
import { haptic, sfx } from "@/utils/gameAudio";
import type { ArcadeGameProps } from "../../ArcadeHost";
import { GameShell, type ShellApi } from "../../GameShell";
import { GameStage, useQuality } from "../../GameStage";
import { Pill, useCallouts } from "../../hud";
import { applyShake, useGameFrame } from "../../stage";

type Piece = (typeof SOUK.pieces)[number];
type Carat = keyof typeof SOUK.carats;
const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;

/** The day's 24K rate (AED/gram): the same for everyone today. */
export function goldRate(day = new Date()) {
  const key = day.toISOString().slice(0, 10);
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const r = ((h >>> 0) % 10000) / 10000;
  return SOUK.base24 * (1 + SOUK.swing * (r * 2 - 1));
}
const rateFor = (carat: Carat, r24: number) => r24 * SOUK.carats[carat];

interface Deal {
  piece: Piece; carat: Carat; weight: number; claimed: number; making: number; fake: boolean;
  /** What it's really worth, and what it would be worth if it were what it claims. */
  worth: number; claimedWorth: number;
  opening: number; ask: number; floor: number; patience: number; maxPatience: number;
  loupe: boolean; scale: boolean; magnet: boolean; calledBack: boolean;
  outcome: null | "bought" | "walked" | "refused"; paid: number;
}

let seedN = 1;
const rnd = () => { seedN = (seedN * 16807) % 2147483647; return seedN / 2147483647; };
const between = ([a, b]: number[]) => a + rnd() * (b - a);

function makeDeal(level: (typeof SOUK.levels)[number], r24: number): Deal {
  const m = SOUK.merchants[level.merchant];
  const piece = SOUK.pieces[Math.floor(rnd() * SOUK.pieces.length)];
  const carat = piece.carat as Carat;
  const weight = Math.round(between(piece.weight) * 10) / 10;
  const claimed = Math.round(weight * (1 + rnd() * level.weightCheat) * 10) / 10;
  const making = Math.round(between(piece.making));
  const fake = rnd() < level.fakeChance;
  const claimedWorth = claimed * (rateFor(carat, r24) + making);
  const genuine = weight * (rateFor(carat, r24) + making);
  const worth = fake ? genuine * 0.05 : genuine;
  const opening = Math.round(claimedWorth * (1 + between(m.markup)));
  // A fake's seller won't come down far (they know what they're pretending it is).
  const floor = fake ? claimedWorth * 0.9 : genuine * (1 + m.margin);
  return { piece, carat, weight, claimed, making, fake, worth, claimedWorth, opening, ask: opening, floor, patience: m.patience, maxPatience: m.patience, loupe: false, scale: false, magnet: false, calledBack: false, outcome: null, paid: 0 };
}

export default function GoldSoukGame({ params, onClose, onShare }: ArcadeGameProps) {
  const progress = useGameProgress("goldsouk");
  const trader = !!params?.career;
  const [picked, setPicked] = useState<number | null>(null);
  const [r24] = useState(() => goldRate());
  const level = picked ?? Math.min(SOUK.levels.length, progress.level + 1);
  const lv = SOUK.levels[level - 1];
  return (
    <GameShell
      game="goldsouk"
      title={trader ? "Run a gold stall" : "Buying gold"}
      venue="Dubai Gold Souk · Al Ras, Deira"
      howTo={trader ? [
        { icon: "🏷️", text: "Customers want your piece. Quote a price: too high and they lose patience; they may counter." },
        { icon: "💰", text: "Profit is what you sell for over the gold and making charge. Read each customer." },
      ] : [
        { icon: "🔍", text: "Check each piece: the loupe reads the hallmark (GP means plated), the scale gives the true weight, the magnet catches fakes." },
        { icon: "🤝", text: "Haggle: offer below the asking price. Lowball and the merchant loses patience. Walk away, and they may call you back." },
        { icon: "🪙", text: `Today's 24K rate is ${aed(r24)} a gram. Gold is sold by weight plus a making charge.` },
      ]}
      levels={trader ? undefined : SOUK.levels.map((l) => ({ n: l.n, label: l.label }))}
      onLevel={setPicked}
      onClose={onClose}
      onShare={onShare}
      intro={<RateBoard r24={r24} />}
    >
      {(api) => trader ? <Stall api={api} r24={r24} /> : <Buying key={level} api={api} level={lv} n={level} r24={r24} />}
    </GameShell>
  );
}

function RateBoard({ r24 }: { r24: number }) {
  return (
    <div className="rounded-2xl bg-black/60 border border-amber-400/30 p-2.5 grid grid-cols-4 gap-1 text-center">
      {(Object.keys(SOUK.carats) as Carat[]).sort((a, b) => Number(b) - Number(a)).map((c) => (
        <div key={c}><p className="text-[10px] font-black text-amber-300">{c}K</p><p className="text-xs font-black tabular-nums">{rateFor(c, r24).toFixed(1)}</p></div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- buying

function Buying({ api, level, n, r24 }: { api: ShellApi; level: (typeof SOUK.levels)[number]; n: number; r24: number }) {
  const { citizen } = useCitizen();
  const merchant = SOUK.merchants[level.merchant];
  const [deals, setDeals] = useState<Deal[]>(() => { seedN = Math.floor(Date.now() % 100000) + 7; return Array.from({ length: SOUK.piecesPerVisit }, () => makeDeal(level, r24)); });
  const [i, setI] = useState(0);
  const [offerPct, setOfferPct] = useState(0.75);
  const [line, setLine] = useState(`Welcome, my friend! For you, a special price.`);
  const [mood, setMood] = useState<"idle" | "talk" | "wave" | "clap">("talk");
  const callouts = useCallouts();
  const finished = useRef(false);
  const d = deals[i];
  const update = (patch: Partial<Deal>) => setDeals((ds) => ds.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const next = (final: Deal) => {
    const all = deals.map((x, j) => (j === i ? final : x));
    setDeals(all);
    if (i + 1 < all.length) { setTimeout(() => { setI(i + 1); setOfferPct(0.75); setLine("Something else? Look at this beauty!"); setMood("talk"); }, 1400); return; }
    if (finished.current) return;
    finished.current = true;
    let score = 0, fakesBought = 0, saved = 0;
    for (const x of all) {
      if (x.outcome === "bought") {
        if (x.fake) { score -= 600; fakesBought++; }
        else { const s = (x.opening - x.paid) / x.opening; saved += x.opening - x.paid; score += 300 + s * 1200 + (x.paid <= x.worth * 1.05 ? 200 : 0); }
      } else if (x.fake) score += x.loupe || x.magnet ? 400 : 150;
    }
    score = Math.max(0, Math.round(score));
    const stars = fakesBought ? Math.min(1, starsFor(score, [600, 1300, 2000])) : starsFor(score, [600, 1300, 2000]);
    setTimeout(() => api.finish({
      score, stars, level: stars > 0 ? n : 0,
      headline: fakesBought ? "Plated! You got stung 😬" : saved > 0 ? `You saved ${aed(saved)} 💪` : "A day at the souk",
      stats: [{ label: "Bought", value: String(all.filter((x) => x.outcome === "bought").length) }, { label: "Saved", value: aed(saved) }, { label: "Fakes dodged", value: String(all.filter((x) => x.fake && x.outcome !== "bought").length) }],
      share: saved > 0 ? `🪙 Haggled ${aed(saved)} off at the Dubai Gold Souk on Dubai Life` : `🪙 Went gold shopping at the Dubai Gold Souk on Dubai Life`,
    }), 1600);
  };

  const buyAt = (price: number) => {
    if (!adjustBalance(-price)) { callouts.push("Not enough AED", "bad"); return; }
    sfx("cash"); haptic(20);
    setMood("wave");
    setLine(d.fake ? "Mabrook! Wear it in good health. (He's smiling a little too much.)" : "Mabrook! A fine piece, wear it in good health.");
    callouts.push(d.fake ? "Bought…" : "Deal! 🤝", d.fake ? "info" : "great");
    const wearable = ("wearable" in d.piece ? d.piece.wearable : undefined) as Accessory | undefined;
    updateCitizen((c) => ({ ...c, inventory: [...(c.inventory ?? []), {
      uid: `gold-${Date.now().toString(36)}`, productId: `gold-souk:${d.piece.id}`, storeId: "gold-souk", name: `${d.piece.name} · ${d.carat}K · ${d.weight} g${d.fake ? " (plated)" : ""}`,
      price, boughtAt: new Date().toISOString(), icon: d.piece.icon, ...(wearable ? { wearable } : {}),
    }] }));
    next({ ...d, outcome: "bought", paid: price });
  };
  const offer = () => {
    const o = Math.round(d.ask * offerPct);
    if (o >= d.floor) { buyAt(o); return; }
    const insult = o < d.claimedWorth * 0.85;
    const patience = d.patience - (insult ? 2 : 1);
    sfx(insult ? "warn" : "tap");
    if (patience <= 0) {
      setMood("idle");
      setLine("No, no. Yallah, no deal today, habibi.");
      callouts.push("He's had enough", "bad");
      next({ ...d, patience: 0, outcome: "refused" });
      return;
    }
    const ask = Math.round(Math.max(d.floor, d.ask - (d.ask - o) * 0.4));
    setMood("talk");
    setLine(insult ? `${aed(o)}?! You want me to close my shop? Best I can do, ${aed(ask)}.` : `For you, my friend… ${aed(ask)}. Final!`);
    update({ patience, ask });
  };
  const walk = () => {
    if (!d.calledBack && rnd() < 0.55) {
      const ask = Math.round(Math.max(d.floor * 0.99, d.ask * 0.94));
      setLine(`Wait, wait! Come back. ${aed(ask)}, last price!`);
      callouts.push("He's calling you back!", "good");
      update({ ask, calledBack: true });
      sfx("chime");
      return;
    }
    setLine(d.fake ? "…" : "As you like. Ma'a salama!");
    next({ ...d, outcome: "walked" });
  };
  const test = (kind: "loupe" | "scale" | "magnet") => {
    sfx("tap"); haptic(6);
    update({ [kind]: true } as Partial<Deal>);
    if (kind === "magnet" && d.fake) { callouts.push("🧲 It stuck! Plated", "bad"); setLine("Ah, that magnet is broken, my friend."); }
    if (kind === "loupe" && d.fake) callouts.push("🔍 Stamped GP: gold plated", "bad");
    if (kind === "scale" && d.claimed > d.weight + 0.05) callouts.push(`⚖️ ${d.weight} g, not ${d.claimed} g!`, "bad");
  };

  const known = d.scale && d.loupe ? (d.fake ? d.worth : d.weight * (rateFor(d.carat, r24) + d.making)) : null;

  return (
    <div className="absolute inset-0">
      <GameStage camera={{ position: [0, 1.65, 1.9], fov: 50 }} background="#1a1208" environment={0.6}>
        <Shop piece={d.piece} carat={d.carat} other={{ gender: "man", preset: merchant.preset }} mood={mood} />
      </GameStage>
      <div className="absolute inset-x-0 top-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-14 space-y-1.5 pointer-events-none">
        <div className="flex flex-wrap gap-2">
          <Pill icon="🪙" value={`24K ${r24.toFixed(1)}/g`} tone="gold" />
          <Pill icon="🛍️" value={`Piece ${i + 1}/${deals.length}`} />
          <Pill icon="💰" value={aed(citizen?.balance ?? 0)} />
        </div>
        <div className="rounded-2xl bg-black/65 p-2.5 text-sm">
          <p className="text-[10px] font-black text-white/50"><span className="rounded bg-amber-400/90 text-amber-950 px-1 mr-1">Local</span>{merchant.name}</p>
          <p className="font-bold">“{line}”</p>
        </div>
      </div>
      {callouts.node}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] space-y-2">
        <div className="rounded-2xl bg-black/70 p-2.5 text-xs space-y-1">
          <p className="font-black text-sm">{d.piece.icon} {d.piece.name} · {d.carat}K (he says) · {d.claimed} g · making {aed(d.making)}/g</p>
          <p className="text-white/70">{d.loupe ? (d.fake ? "🔍 Hallmark: GP (gold plated)" : `🔍 Hallmark: ${d.carat}K ${Math.round(SOUK.carats[d.carat] * 1000)}`) : "🔍 Hallmark not checked"} · {d.scale ? `⚖️ ${d.weight} g` : "⚖️ Not weighed"} · {d.magnet ? (d.fake ? "🧲 Sticks!" : "🧲 No pull") : "🧲 Not tested"}</p>
          {known !== null && <p className="text-amber-300 font-black">Worth about {aed(known)}</p>}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button disabled={d.loupe || !!d.outcome} onClick={() => test("loupe")} className="h-10 rounded-xl bg-white/10 text-xs font-black disabled:opacity-40">🔍 Loupe</button>
          <button disabled={d.scale || !!d.outcome} onClick={() => test("scale")} className="h-10 rounded-xl bg-white/10 text-xs font-black disabled:opacity-40">⚖️ Scale</button>
          <button disabled={d.magnet || !!d.outcome} onClick={() => test("magnet")} className="h-10 rounded-xl bg-white/10 text-xs font-black disabled:opacity-40">🧲 Magnet</button>
        </div>
        {!d.outcome && (
          <>
            <div className="flex items-center justify-between text-xs font-black">
              <span>Asking {aed(d.ask)}</span><span>{"🙂".repeat(d.patience)}{"😤".repeat(d.maxPatience - d.patience)}</span>
            </div>
            <input type="range" min={0.4} max={1} step={0.01} value={offerPct} onChange={(e) => setOfferPct(Number(e.target.value))} className="w-full accent-amber-400" aria-label="Your offer" />
            <div className="grid grid-cols-3 gap-1.5">
              <button onClick={offer} className="h-12 rounded-2xl bg-amber-400 text-amber-950 font-black text-sm">Offer {aed(d.ask * offerPct)}</button>
              <button onClick={() => buyAt(d.ask)} className="h-12 rounded-2xl bg-emerald-600 font-black text-sm">Buy at {aed(d.ask)}</button>
              <button onClick={walk} className="h-12 rounded-2xl bg-white/10 font-black text-sm">Walk away</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the trader job

function Stall({ api, r24 }: { api: ShellApi; r24: number }) {
  const [state] = useState(() => {
    seedN = Math.floor(Date.now() % 100000) + 3;
    return SOUK.customers.map((c) => {
      const piece = SOUK.pieces[Math.floor(rnd() * SOUK.pieces.length)];
      const weight = Math.round(between(piece.weight) * 10) / 10;
      const worth = weight * (rateFor(piece.carat as Carat, r24) + between(piece.making));
      return { c, piece, weight, worth, max: worth * (1 + between(c.willing)) };
    });
  });
  const [i, setI] = useState(0);
  const [quotePct, setQuotePct] = useState(1.4);
  const [patience, setPatience] = useState(SOUK.customers[0].patience);
  const [counter, setCounter] = useState<number | null>(null);
  const [profit, setProfit] = useState(0);
  const [sold, setSold] = useState(0);
  const [line, setLine] = useState("How much for this one?");
  const callouts = useCallouts();
  const s = state[i];

  const close = (sale: number | null) => {
    const p = sale ? sale - s.worth : 0;
    if (sale) { setProfit((x) => x + p); setSold((x) => x + 1); sfx("cash"); callouts.push(`Sold! +${aed(p)}`, "great"); setLine("Shukran! It's beautiful."); }
    else { callouts.push("They walked", "bad"); setLine("Too much. Ma'a salama."); }
    const totalProfit = profit + p, totalSold = sold + (sale ? 1 : 0);
    if (i + 1 >= state.length) {
      const score = Math.max(0, Math.round(totalProfit / 10 + totalSold * 200));
      setTimeout(() => api.finish({ score, stars: starsFor(score, [400, 900, 1500]), headline: `${totalSold} sold · ${aed(totalProfit)} profit`, stats: [{ label: "Sold", value: `${totalSold}/${state.length}` }, { label: "Profit", value: aed(totalProfit) }, { label: "Stall", value: "Al Ras" }], share: `🪙 Ran a stall at the Dubai Gold Souk: ${aed(totalProfit)} profit on Dubai Life` }), 1400);
      return;
    }
    setTimeout(() => { setI(i + 1); setPatience(state[i + 1].c.patience); setCounter(null); setQuotePct(1.4); setLine("Salaam! What's the price on this?"); }, 1300);
  };
  const quote = () => {
    const q = Math.round(s.worth * quotePct);
    if (q <= s.max) { close(q); return; }
    const p = patience - 1;
    if (p <= 0) { close(null); return; }
    const c = Math.round(Math.min(s.max * (0.86 + rnd() * 0.1), q * 0.9));
    setPatience(p); setCounter(c);
    setLine(`Too much! I'll give you ${aed(c)}.`);
    sfx("tap");
  };

  return (
    <div className="absolute inset-0">
      <GameStage camera={{ position: [0, 1.65, 1.9], fov: 50 }} background="#1a1208" environment={0.6}>
        <Shop piece={s.piece} carat={s.piece.carat as Carat} other={{ gender: s.c.preset.startsWith("Female") ? "woman" : "man", preset: s.c.preset }} mood="talk" />
      </GameStage>
      <div className="absolute inset-x-0 top-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-14 space-y-1.5 pointer-events-none">
        <div className="flex flex-wrap gap-2"><Pill icon="🪙" value={`24K ${r24.toFixed(1)}/g`} tone="gold" /><Pill icon="💰" value={`Profit ${aed(profit)}`} /></div>
        <div className="rounded-2xl bg-black/65 p-2.5 text-sm"><p className="text-[10px] font-black text-white/50"><span className="rounded bg-amber-400/90 text-amber-950 px-1 mr-1">Local</span>{s.c.name}</p><p className="font-bold">“{line}”</p></div>
      </div>
      {callouts.node}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] space-y-2">
        <p className="rounded-2xl bg-black/70 p-2.5 text-xs"><b>{s.piece.icon} {s.piece.name}</b> · {s.piece.carat}K · {s.weight} g · gold and making: <b className="text-amber-300">{aed(s.worth)}</b> · patience {"🙂".repeat(patience)}</p>
        <input type="range" min={1} max={1.8} step={0.01} value={quotePct} onChange={(e) => setQuotePct(Number(e.target.value))} className="w-full accent-amber-400" aria-label="Your price" />
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={quote} className="h-12 rounded-2xl bg-amber-400 text-amber-950 font-black text-sm">Quote {aed(s.worth * quotePct)}</button>
          {counter !== null
            ? <button onClick={() => close(counter)} className="h-12 rounded-2xl bg-emerald-600 font-black text-sm">Accept {aed(counter)}</button>
            : <button onClick={() => close(null)} className="h-12 rounded-2xl bg-white/10 font-black text-sm">Let them go</button>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the shop

const GOLD_OF: Record<string, string> = { "24": "#ffcc33", "22": "#f2c14e", "21": "#e8b84a", "18": "#d9b46a" };

/** A souk shopfront from across the counter: gold in the cases, a scale, the person across from you, the piece on the velvet. */
function Shop({ piece, carat, other, mood }: { piece: Piece; carat: Carat; other: { gender: "man" | "woman"; preset: string }; mood: "idle" | "talk" | "wave" | "clap" }) {
  const tier = useQuality();
  const camera = useThree((s) => s.camera);
  const look = useMemo(() => new THREE.Vector3(0, 1.05, -0.4), []);
  const home = useMemo(() => new THREE.Vector3(0, 1.65, 1.9), []);
  const tray = useRef<THREE.Group>(null);
  const goldMat = useMemo(() => new THREE.MeshStandardMaterial({ color: GOLD_OF[carat], metalness: 1, roughness: 0.22 }), [carat]);
  useEffect(() => () => goldMat.dispose(), [goldMat]);
  useGameFrame((dt, t) => {
    if (tray.current) tray.current.rotation.y = t * 0.6;
    camera.position.lerp(home, Math.min(1, dt * 2));
    camera.lookAt(look);
    applyShake(camera);
  });
  return (
    <group>
      <hemisphereLight args={["#fff7ed", "#3f2a14", 0.6]} />
      <spotLight position={[0, 3, 1]} angle={0.6} penumbra={0.5} intensity={30} castShadow={tier === 2} color="#fff1d6" />
      <pointLight position={[0, 1.4, -1.6]} intensity={5} distance={4} color="#fbbf24" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[8, 8]} /><meshStandardMaterial color="#5a3a1c" roughness={0.8} /></mesh>
      {/* Back wall of lit shelves, gold glinting on them */}
      <mesh position={[0, 1.6, -2]}><planeGeometry args={[6, 3.2]} /><meshStandardMaterial color="#3f2a14" /></mesh>
      {[0.9, 1.4, 1.9, 2.4].map((y) => (
        <group key={y}>
          <mesh position={[0, y, -1.85]}><boxGeometry args={[3.6, 0.04, 0.3]} /><meshStandardMaterial color="#d6c19a" emissive="#fbbf24" emissiveIntensity={0.15} /></mesh>
          {Array.from({ length: 9 }).map((_, k) => <mesh key={k} position={[-1.6 + k * 0.4, y + 0.08, -1.82]} rotation={[Math.PI / 2, 0, 0]} material={goldMat}><torusGeometry args={[0.07, 0.012, 8, 20]} /></mesh>)}
        </group>
      ))}
      {/* The person across the counter */}
      <group position={[0, 0, -0.95]}><CitizenAvatar look={other} animation={mood} /></group>
      {/* The glass counter, the scale, the velvet tray with the piece */}
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[2.4, 1, 0.7]} /><meshStandardMaterial color="#cbd5e1" transparent opacity={0.3} metalness={0.4} roughness={0.05} /></mesh>
      <mesh position={[0, 1.01, 0]}><boxGeometry args={[2.45, 0.03, 0.75]} /><meshStandardMaterial color="#e0f2fe" transparent opacity={0.5} roughness={0.05} /></mesh>
      {Array.from({ length: 6 }).map((_, k) => <mesh key={k} position={[-0.9 + k * 0.36, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} material={goldMat}><torusGeometry args={[0.08, 0.015, 8, 24]} /></mesh>)}
      <group position={[0.75, 1.03, 0.05]}>
        <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.24, 0.06, 0.18]} /><meshStandardMaterial color="#111827" /></mesh>
        <mesh position={[0, 0.07, 0]}><cylinderGeometry args={[0.08, 0.08, 0.01, 20]} /><meshStandardMaterial color="#e5e7eb" metalness={0.8} roughness={0.2} /></mesh>
      </group>
      <mesh position={[0, 1.035, 0.1]}><boxGeometry args={[0.5, 0.02, 0.36]} /><meshStandardMaterial color="#7f1d1d" roughness={0.95} /></mesh>
      <group ref={tray} position={[0, 1.13, 0.1]}>
        <PieceMesh kind={piece.kind} mat={goldMat} />
      </group>
    </group>
  );
}

function PieceMesh({ kind, mat }: { kind: string; mat: THREE.Material }) {
  switch (kind) {
    case "chain": return <group rotation={[0.3, 0, 0]}>{Array.from({ length: 22 }).map((_, i) => { const a = (i / 21) * Math.PI * 1.6 - Math.PI * 0.8; return <mesh key={i} position={[Math.sin(a) * 0.12, -Math.cos(a) * 0.08 + 0.02, 0]} rotation={[i % 2 ? Math.PI / 2 : 0, 0, a]} material={mat}><torusGeometry args={[0.012, 0.004, 6, 12]} /></mesh>; })}</group>;
    case "bangle": return <group><mesh rotation={[Math.PI / 2.4, 0, 0]} material={mat}><torusGeometry args={[0.09, 0.016, 12, 40]} /></mesh></group>;
    case "ring": return <group><mesh rotation={[Math.PI / 2.2, 0, 0]} material={mat}><torusGeometry args={[0.035, 0.008, 10, 28]} /></mesh><mesh position={[0, 0.04, 0]} material={mat}><boxGeometry args={[0.03, 0.012, 0.03]} /></mesh></group>;
    case "set": return <group rotation={[0.3, 0, 0]}><mesh rotation={[0, 0, Math.PI]} material={mat}><torusGeometry args={[0.12, 0.012, 8, 40, Math.PI]} /></mesh><mesh position={[0, -0.14, 0]} material={mat}><octahedronGeometry args={[0.035]} /></mesh>{[-0.17, 0.17].map((x) => <mesh key={x} position={[x, -0.04, 0]} material={mat}><coneGeometry args={[0.02, 0.05, 10]} /></mesh>)}</group>;
    case "earrings": return <group>{[-0.05, 0.05].map((x) => <group key={x} position={[x, 0, 0]}><mesh position={[0, 0.02, 0]} material={mat}><torusGeometry args={[0.012, 0.003, 6, 12]} /></mesh><mesh position={[0, -0.02, 0]} rotation={[Math.PI, 0, 0]} material={mat}><coneGeometry args={[0.022, 0.04, 12, 1, true]} /></mesh></group>)}</group>;
    default: return <mesh rotation={[Math.PI / 2.5, 0, 0]} material={mat}><cylinderGeometry args={[0.05, 0.05, 0.008, 32]} /></mesh>;
  }
}
