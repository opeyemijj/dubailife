"use client";

// Hiring an interior decorator at home: choose a look (with what it costs in this home), then who does it, a
// player decorator (with their fee) or a Local studio, and hand over your key at the front door in 3D. A
// banner says how it's going (waiting for them to pick up the key, decorating); when it's done and you're
// home, the new look is in and you get your key back.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { ModalPortal } from "@/components/ui/modal-portal";
import { doorThud, footstep } from "@/components/transit/transitAudio";
import { canvasQuality } from "@/lib/device";
import { useNow } from "@/lib/dubaiClock";
import { useCitizen } from "@/lib/citizenStore";
import { usePresentCitizens } from "@/lib/presence";
import { CATALOG, FLOOR_FINISHES, WALL_PAINTS, type HomeStyle, type HousingTier } from "@/lib/furniture";
import { applyDecor, cancelDecor, DECORATORS, decorators, hireDecor, localDecoratorLook, quote, studioOf, type DecoratorPro, type DecorJob, type Studio } from "@/lib/decorator";
import { gameAudio } from "@/utils/gameAudio";

const aed = (n: number) => `AED ${n.toLocaleString()}`;
const FLOOR_SWATCH: Record<string, string> = {
  oak: "#d4b48c", herringbone: "#b98a5e", walnut: "#5b3a29", travertine: "#e3d5bf", "white-marble": "#f1efeb", "black-marble": "#1c1c1f",
};

// ---------------------------------------------------------------- the key handover

function Doorway({ look, decorator, onDone }: { look?: AvatarLookProps; decorator: AvatarLookProps; onDone: () => void }) {
  const her = useRef<THREE.Group>(null);
  const key = useRef<THREE.Group>(null);
  const t = useRef(0);
  const stride = useRef(0);
  const done = useRef(false);
  const [herAnim, setHerAnim] = useState<AvatarAnimation>("walk");
  const [myAnim, setMyAnim] = useState<AvatarAnimation>("idle");
  useFrame(({ camera }, dt) => {
    t.current += dt;
    const T = t.current;
    // She walks down the corridor (0–3 s), you hand over the key (3–5 s), she waves and goes in (5–6.5 s).
    if (her.current) {
      const k = Math.min(1, T / 3);
      her.current.position.set(0.9, 0, -7 + 5.4 * k);
      her.current.rotation.y = T < 5.2 ? 0 : Math.PI;
      if (T < 3) { const b = Math.floor(stride.current); stride.current += dt * 1.8; if (Math.floor(stride.current) !== b) footstep("stone", 0.2); }
      else if (T < 5.2 && herAnim !== "talk") setHerAnim("talk");
      else if (T >= 5.2 && herAnim !== "wave") setHerAnim("wave");
    }
    if (T > 3 && T < 3.2 && myAnim !== "talk") setMyAnim("talk");
    // The key: in your hand, across to hers.
    if (key.current) {
      const k = Math.max(0, Math.min(1, (T - 3.4) / 0.8));
      key.current.position.set(-0.55 + 1.1 * k, 1.05 + Math.sin(k * Math.PI) * 0.18, -0.6 - 0.3 * k);
      key.current.rotation.set(0, T * 2, 0.4);
      key.current.visible = T > 3 && T < 5.4;
    }
    // From further down the corridor's side: you at your door and her walking up, both in view.
    camera.position.lerp(new THREE.Vector3(1.4, 2.0, 3.9), Math.min(1, dt * 2));
    camera.lookAt(0.1, 1.0, -1.6);
    if (T > 6.6 && !done.current) { done.current = true; doorThud(); onDone(); }
  });
  return (
    <>
      <color attach="background" args={["#e7e0d5"]} />
      <hemisphereLight args={["#ffffff", "#c9b99f", 1.1]} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} />
      {/* the corridor: floor, walls, your front door standing open, a neighbour's door further down */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[4, 20]} /><meshStandardMaterial color="#cbbfa8" roughness={0.6} /></mesh>
      {[-1.8, 1.8].map((x) => <mesh key={x} position={[x, 1.5, -3]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}><planeGeometry args={[20, 3]} /><meshStandardMaterial color="#efe8dc" /></mesh>)}
      <mesh position={[-1.78, 1.05, -0.4]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.1, 2.1]} /><meshStandardMaterial color="#1f2937" /></mesh>
      <mesh position={[-1.3, 1.05, 0.2]} rotation={[0, -0.9, 0]}><boxGeometry args={[1.0, 2.1, 0.06]} /><meshStandardMaterial color="#7c5a3a" /></mesh>
      <mesh position={[1.78, 1.05, -6]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[1.1, 2.1]} /><meshStandardMaterial color="#7c5a3a" /></mesh>
      {[-2, -8].map((z) => <pointLight key={z} position={[0, 2.8, z]} intensity={8} distance={7} color="#fff1d6" />)}
      <group ref={key}>
        <mesh><torusGeometry args={[0.05, 0.015, 8, 16]} /><meshStandardMaterial color="#facc15" metalness={0.9} roughness={0.2} /></mesh>
        <mesh position={[0.1, 0, 0]}><boxGeometry args={[0.13, 0.02, 0.02]} /><meshStandardMaterial color="#facc15" metalness={0.9} roughness={0.2} /></mesh>
      </group>
      <group position={[-0.6, 0, -0.6]} rotation={[0, Math.PI * 0.85, 0]}><Suspense fallback={null}><CitizenAvatar look={look} animation={myAnim} /></Suspense></group>
      <group ref={her}><Suspense fallback={null}><CitizenAvatar look={decorator} animation={herAnim} /></Suspense></group>
    </>
  );
}

export function KeyHandover({ studio, name, decoratorLook, look, local, onDone }: {
  studio: Studio; name: string; decoratorLook: AvatarLookProps; look?: AvatarLookProps; local: boolean; onDone: () => void;
}) {
  const quality = useMemo(() => canvasQuality(), []);
  const [say, setSay] = useState(local ? `${name} from ${studio.studio} is here.` : `@${name} the decorator is here.`);
  useEffect(() => {
    const a = setTimeout(() => setSay("Here's my key. Make it beautiful!"), 3000);
    const b = setTimeout(() => setSay(local ? `Leave it with me. It'll be ready in about ${DECORATORS.minutes} minutes.` : `I'll get to work on your ${studio.title} look. You'll hear when it's done.`), 4400);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [local, studio]);
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[205] bg-stone-200" role="dialog" aria-modal="true" aria-label="Handing over your key">
        <Canvas dpr={quality.dpr} camera={{ position: [1.4, 2.0, 3.9], fov: 50 }}>
          <Doorway look={look} decorator={decoratorLook} onDone={onDone} />
        </Canvas>
        <div className="absolute top-[max(1rem,env(safe-area-inset-top))] inset-x-3 flex justify-center pointer-events-none">
          <p className="max-w-sm rounded-2xl bg-white px-4 py-2.5 font-semibold text-slate-900 shadow-xl">🔑 {say}</p>
        </div>
        <button onClick={onDone} className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 h-11 px-5 rounded-full bg-white/90 font-bold text-slate-800 shadow-lg">Skip ›</button>
      </div>
    </ModalPortal>
  );
}

// ---------------------------------------------------------------- choosing a decorator

export function DecoratorSheet({ tier, current, onClose, onHired }: { tier: HousingTier; current: HomeStyle; onClose: () => void; onHired?: () => void }) {
  const { citizen } = useCitizen();
  const online = usePresentCitizens();
  const [look, setLook] = useState<Studio | null>(null);
  const [pros, setPros] = useState<DecoratorPro[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [handover, setHandover] = useState<{ studio: Studio; name: string; look: AvatarLookProps; local: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void decorators().then((r) => setPros(r.data ?? [])); }, []);
  if (handover) return <KeyHandover studio={handover.studio} name={handover.name} decoratorLook={handover.look} look={citizen?.look} local={handover.local} onDone={() => { onHired?.(); onClose(); }} />;

  const hire = async (s: Studio, pro: DecoratorPro | null) => {
    setError(null);
    const q = quote(s, current);
    if ((citizen?.balance ?? 0) < q.costs + (pro?.fee ?? 0)) { setError(`You need ${aed(q.costs + (pro?.fee ?? 0))} for that.`); return; }
    setBusy(true);
    const r = await hireDecor(pro?.id ?? null, s.id, tier, q.costs);
    setBusy(false);
    if (r.error) { setError(r.error); return; }
    gameAudio.playCoinSound();
    setHandover(pro ? { studio: s, name: pro.username, look: pro.look ?? localDecoratorLook(s), local: false } : { studio: s, name: s.decorator, look: localDecoratorLook(s), local: true });
  };
  // Players working as decorators, the ones in the game right now first.
  const isOnline = (u: string) => online.some((p) => p.username === u);
  const sorted = [...(pros ?? [])].sort((a, b) => Number(isOnline(b.username)) - Number(isOnline(a.username)) || a.fee - b.fee);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Hire an interior decorator" onClick={onClose}>
        <div className="w-full max-w-md max-h-[88vh] overflow-y-auto bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-3">
            {look ? <button onClick={() => setLook(null)} className="w-8 h-8 rounded-full bg-slate-100 font-black text-slate-500" aria-label="Back">‹</button> : <span className="text-3xl">🧑‍🎨</span>}
            <div className="flex-1">
              <h3 className="text-lg font-black leading-tight">{look ? `Who decorates? ${look.icon} ${look.title}` : "Hire an interior decorator"}</h3>
              <p className="text-xs text-slate-500">{look ? "A player decorator does it for their fee; if none is free, a Local studio does it." : "Pick a look, then who does it. You hand over your key and come back to it done."}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 font-black text-slate-500" aria-label="Close">✕</button>
          </div>

          {!look && DECORATORS.studios.map((s) => {
            const q = quote(s, current);
            return (
              <button key={s.id} onClick={() => setLook(s)} className="w-full text-left rounded-3xl border border-slate-200 p-3 space-y-2 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  {/* the look at a glance: the floor and the wall colour */}
                  <span className="w-12 h-12 rounded-2xl overflow-hidden grid grid-rows-2 shrink-0 border border-black/5">
                    <span style={{ background: WALL_PAINTS.find((w) => w.id === s.wall)?.color }} />
                    <span style={{ background: FLOOR_SWATCH[s.floor] }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black leading-tight">{s.icon} {s.title}</p>
                    <p className="text-[11px] text-slate-500">from {aed(q.costs)} · finish {aed(q.finish)} · pieces {aed(q.pieces)}</p>
                  </div>
                  <span className="text-slate-400">›</span>
                </div>
                <p className="text-xs text-slate-600">{s.blurb}</p>
                <p className="text-[11px] text-slate-500">
                  {FLOOR_FINISHES.find((f) => f.id === s.floor)?.label} · {WALL_PAINTS.find((w) => w.id === s.wall)?.label} walls{s.panels ? " · panelling" : ""} · {s.items.map((i) => CATALOG.find((c) => c.id === i)?.icon).join(" ")}
                </p>
              </button>
            );
          })}

          {look && (
            <>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Player decorators</p>
              {pros === null ? <p className="text-sm text-slate-500">Finding decorators…</p>
                : sorted.length === 0 ? <p className="text-sm text-slate-500">No players are working as decorators right now. A Local studio will do it (or take the job yourself on the Job Board).</p>
                : sorted.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-2.5">
                    <span className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-xl">🧑‍🎨</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate">@{p.username} {isOnline(p.username) && <span className="text-[10px] font-black text-emerald-600">● online</span>}</p>
                      <p className="text-[11px] text-slate-500">Fee {aed(p.fee)} · total {aed(quote(look, current).costs + p.fee)}</p>
                    </div>
                    <button disabled={busy} onClick={() => hire(look, p)} className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-black disabled:opacity-50">🔑 Hire</button>
                  </div>
                ))}
              <p className="text-xs font-black uppercase tracking-wider text-slate-400 pt-1">Or a Local studio</p>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5">
                <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl">{look.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm">{look.decorator} · {look.studio}</p>
                  <p className="text-[11px] text-slate-500">No fee · ready in about {DECORATORS.minutes} min · total {aed(quote(look, current).costs)}</p>
                </div>
                <button disabled={busy} onClick={() => hire(look, null)} className="h-9 px-3 rounded-xl bg-slate-900 text-white text-xs font-black disabled:opacity-50">🔑 Hire</button>
              </div>
              <p className="text-[11px] text-slate-400">A player has {DECORATORS.acceptMinutes} minutes to pick up your key; if they don&apos;t, a Local takes over and their fee comes back to you.</p>
            </>
          )}
          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        </div>
      </div>
    </ModalPortal>
  );
}

// ---------------------------------------------------------------- while they work, and the reveal

/** How your decorator job is going, and the reveal (with your key back) once it's done and you're home. */
export function DecoratorStatus({ tier, job, reload }: { tier: HousingTier; job: DecorJob | null; reload: () => void }) {
  const now = useNow();
  const [reveal, setReveal] = useState<{ studio: Studio; placed: number; stored: number; by: string } | null>(null);
  const applying = useRef(false);
  const ready = !!job && job.tier === tier && (job.ready || (job.status === "working" && !job.decorator && !!job.readyAt && now > 0 && Date.parse(job.readyAt) <= now));
  useEffect(() => {
    if (!ready || !job || applying.current) return;
    applying.current = true;
    void applyDecor(job).then((r) => {
      applying.current = false;
      if (r) { gameAudio.playCoinSound(); setReveal({ ...r, by: job.decorator ? `@${job.decorator}` : r.studio.decorator }); }
      reload();
    });
  }, [ready, job, reload]);

  if (reveal) {
    return (
      <div className="fixed inset-x-3 bottom-[max(6rem,calc(env(safe-area-inset-bottom)+6rem))] z-[195] flex justify-center">
        <div className="w-full max-w-md rounded-[26px] bg-white p-4 shadow-2xl space-y-2 text-slate-900 animate-[sheetUp_0.3s_ease-out]">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">✨ Your new home</p>
          <p className="font-black text-lg leading-tight">{reveal.studio.icon} {reveal.studio.title}, by {reveal.by}</p>
          <p className="text-sm text-slate-600">New floors and walls, and {reveal.placed} piece{reveal.placed === 1 ? "" : "s"} placed{reveal.stored ? ` (${reveal.stored} in your storage: there wasn't room)` : ""}. Move anything in Decorate.</p>
          <button onClick={() => setReveal(null)} className="w-full h-11 rounded-2xl bg-emerald-600 text-white font-black">🔑 Take your key back</button>
        </div>
      </div>
    );
  }
  if (!job) return null;
  const studio = studioOf(job.studio);
  const elsewhere = job.tier !== tier ? " your other home" : "";
  const mins = job.readyAt && now ? Math.max(0, Math.ceil((Date.parse(job.readyAt) - now) / 60000)) : null;
  const text = job.status === "requested"
    ? `🔑 Waiting for @${job.decorator} to pick up your key`
    : job.decorator
      ? `🧑‍🎨 @${job.decorator} is decorating${elsewhere}`
      : `🧑‍🎨 ${studio?.decorator ?? "Your decorator"} is decorating${elsewhere}${job.fallback ? " (your decorator didn't come)" : ""} · ${mins ? `ready in ${mins} min` : "almost done"}`;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-[calc(max(0.75rem,env(safe-area-inset-top))+7rem)] z-[45] flex items-center gap-2">
      <p className="rounded-full bg-white/95 shadow-lg px-4 py-2 text-xs font-black text-slate-800 whitespace-nowrap">{text}</p>
      {job.status === "requested" && (
        <button onClick={async () => { await cancelDecor(job.id); reload(); }} className="rounded-full bg-white/95 shadow-lg px-3 py-2 text-xs font-black text-rose-600">Cancel</button>
      )}
    </div>
  );
}
