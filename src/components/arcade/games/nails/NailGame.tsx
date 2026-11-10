"use client";

// Nail bars: a close-up 3D manicure. A hand rests on the cushion; you
//   1 pick the shape the order asks for (square, round, almond, coffin, stiletto),
//   2 paint each nail by dragging on it (coverage is scored, and brushing onto the skin is a spill),
//   3 add the design: a French tip (paint the white tip), glitter (tap to sprinkle) or gems (tap to place),
//   4 cure under the UV lamp (hold; letting go early smudges),
// then the customer rates it. Pamper yourself (one of the wardrobe's nail sets, onto your look) or work as a nail
// technician for Local customers. Played at NStyle, N.Bar and The Nail Spa.

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import NAILS from "@/data/arcade/nails.json";
import { NAILS_CATALOG } from "@/components/avatar/roster";
import { adjustBalance, updateCitizen, useCitizen } from "@/lib/citizenStore";
import { useGameProgress, starsFor } from "@/lib/arcade";
import { loadOwnedCloset, saveOwnedCloset } from "@/lib/closet";
import { haptic, sfx } from "@/utils/gameAudio";
import type { ArcadeGameProps } from "../../ArcadeHost";
import { GameShell, type ShellApi } from "../../GameShell";
import { GameStage } from "../../GameStage";
import { Meter, Pill, useCallouts } from "../../hud";
import { applyShake, useGameFrame } from "../../stage";

type Shape = keyof typeof NAILS.shapes;
type Design = keyof typeof NAILS.designs;
interface Order { who: string; says?: string; shape: Shape; colour: string; design: Design; seconds: number; setId?: string; price?: number; local: boolean }
const GW = 32, GH = 48; // the coverage grid per nail
const FINGERS = 5;

/** Inside the nail at (u across, v from the cuticle to the tip), for a shape. */
function inside(shape: Shape, u: number, v: number) {
  if (v < 0.06) return false;
  const x = Math.abs(u - 0.5);
  if (x > 0.46) return false;
  switch (shape) {
    case "square": return v <= 0.94;
    case "round": return v <= 0.8 || (x / 0.46) ** 2 + ((v - 0.8) / 0.16) ** 2 <= 1;
    case "almond": { const k = Math.max(0, (v - 0.55) / 0.42); return v <= 0.97 && x <= 0.46 * (1 - k ** 1.6 * 0.82); }
    case "coffin": { const k = Math.max(0, (v - 0.6) / 0.36); return v <= 0.96 && x <= 0.46 * (1 - k * 0.38); }
    case "stiletto": { const k = Math.max(0, (v - 0.4) / 0.58); return v <= 0.98 && x <= 0.46 * (1 - k ** 1.2 * 0.97); }
  }
}

export default function NailGame({ params, onClose, onShare }: ArcadeGameProps) {
  const { citizen } = useCitizen();
  const progress = useGameProgress("nails");
  const career = !!params?.career;
  const bar = (params?.bar as string) ?? "NStyle Beauty Lounge";
  const [picked, setPicked] = useState<number | null>(null);
  const [setId, setSetId] = useState(NAILS.sets[0].id);
  const level = picked ?? Math.min(NAILS.customers.length, progress.level + 1);
  const cust = NAILS.customers[level - 1];
  const set = NAILS.sets.find((x) => x.id === setId) ?? NAILS.sets[0];
  const cat = NAILS_CATALOG.find((x) => x.id === set.id);
  const order: Order = career
    ? { who: cust.name, says: cust.says, shape: cust.shape as Shape, colour: cust.colour, design: cust.design as Design, seconds: cust.seconds, local: true }
    : { who: "You", shape: set.shape as Shape, colour: set.colour, design: set.design as Design, seconds: 150, setId: set.id, price: cat?.price ?? 0, local: false };

  return (
    <GameShell
      game="nails"
      title={career ? `${cust.name}'s manicure` : "Pamper yourself"}
      venue={bar}
      howTo={[
        { icon: "💅", text: "Pick the shape, then drag on each nail to paint it. Cover it all; brushing the skin is a spill." },
        { icon: "✨", text: "Add the design: paint the white French tip, tap to sprinkle glitter, or tap to place gems." },
        { icon: "💡", text: "Hold the UV lamp until it's cured. Letting go early smudges." },
      ]}
      levels={career ? NAILS.customers.map((c) => ({ n: c.n, label: c.name })) : undefined}
      onLevel={setPicked}
      onClose={onClose}
      onShare={onShare}
      intro={career ? (
        <p className="rounded-2xl bg-white/5 p-3 text-sm"><span className="rounded bg-amber-400/90 text-amber-950 px-1 text-[10px] font-black mr-1">Local</span><b>{cust.name}</b>: “{cust.says}”</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {NAILS.sets.map((s) => {
            const c = NAILS_CATALOG.find((x) => x.id === s.id);
            return (
              <button key={s.id} onClick={() => setSetId(s.id)} className={`rounded-xl p-2 text-left border ${setId === s.id ? "bg-pink-400 text-pink-950 border-pink-200" : "bg-white/5 border-white/10"}`}>
                <span className="inline-block w-3 h-3 rounded-full mr-1 align-middle border border-white/40" style={{ background: s.colour }} />
                <span className="text-[11px] font-black">{c?.label ?? s.id}</span>
                <span className="block text-[10px] opacity-75">AED {c?.price ?? 0}</span>
              </button>
            );
          })}
        </div>
      )}
    >
      {(api) => <Manicure key={`${order.who}:${order.setId ?? level}`} api={api} order={order} level={career ? level : 0} skin={citizen?.look?.gender === "man" ? "#c68642" : "#d9a066"} />}
    </GameShell>
  );
}

type Step = "shape" | "paint" | "design" | "uv" | "done";

interface NailState { grid: Uint8Array; tip: Uint8Array; glitter: number; gems: Array<[number, number]> }

function Manicure({ api, order, level, skin }: { api: ShellApi; order: Order; level: number; skin: string }) {
  const [step, setStep] = useState<Step>("shape");
  const [shape, setShape] = useState<Shape | null>(null);
  const [colour, setColour] = useState(order.local ? NAILS.palette[0] : order.colour);
  const [spills, setSpills] = useState(0);
  const [coverage, setCoverage] = useState<number[]>(() => Array(FINGERS).fill(0));
  const [designDone, setDesignDone] = useState<number[]>(() => Array(FINGERS).fill(0));
  const [uv, setUv] = useState(0);
  const [smudged, setSmudged] = useState(false);
  // Gems placed on each nail ([u, v] on the nail), drawn by the hand.
  const [gemList, setGemList] = useState<Array<Array<[number, number]>>>(() => Array.from({ length: FINGERS }, () => []));
  const [t, setT] = useState(0);
  const nailsRef = useRef<NailState[]>([]);
  const versionRef = useRef(0);
  const holdRef = useRef(false);
  const [holding, setHolding] = useState(false);
  const uvRef = useRef(0);
  const callouts = useCallouts();
  const playing = api.phase === "play";
  const shapeRef = useRef<Shape>("square");

  useEffect(() => {
    nailsRef.current = Array.from({ length: FINGERS }, () => ({ grid: new Uint8Array(GW * GH), tip: new Uint8Array(GW * GH), glitter: 0, gems: [] }));
  }, []);
  useEffect(() => { shapeRef.current = shape ?? "square"; versionRef.current++; }, [shape]);

  // The clock (the customer's patience) and the UV lamp.
  useEffect(() => {
    if (!playing || step === "done") return;
    const id = setInterval(() => {
      setT((x) => x + 0.1);
      if (step === "uv" && holdRef.current) {
        uvRef.current = Math.min(NAILS.uvSeconds, uvRef.current + 0.1);
        setUv(uvRef.current);
        if (uvRef.current >= NAILS.uvSeconds) { sfx("mgPerfect"); callouts.push("Cured! ✨", "great"); setStep("done"); }
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restarts when the step changes
  }, [playing, step]);

  // The rating, once done.
  useEffect(() => {
    if (step !== "done") return;
    const avgCov = coverage.reduce((a, b) => a + b, 0) / FINGERS;
    const designAcc = order.design === "plain" ? 1 : designDone.reduce((a, b) => a + b, 0) / FINGERS;
    const colourOk = colour.toLowerCase() === order.colour.toLowerCase();
    const score = Math.round((shape === order.shape ? 200 : 0) + avgCov * 600 + designAcc * 300 + (colourOk ? 150 : 0) + (smudged ? 0 : 100)
      + Math.max(0, 200 - Math.max(0, t - order.seconds * 0.6) * 4) - spills * 15);
    const stars = starsFor(score, [550, 850, 1100]);
    let applied = false;
    if (!order.local && order.setId && stars > 0) {
      const owned = loadOwnedCloset();
      if (owned.includes(order.setId) || !order.price || adjustBalance(-order.price)) {
        saveOwnedCloset([...owned, order.setId]);
        updateCitizen((c) => ({ ...c, look: { ...(c.look ?? { gender: "woman" }), nailId: order.setId } }));
        applied = true;
      }
    }
    const id = setTimeout(() => api.finish({
      score: Math.max(0, score), stars, level: stars > 0 ? level : 0,
      headline: order.local ? (stars === 3 ? `${order.who} loves them! Big tip 💸` : stars >= 1 ? `${order.who} is happy` : `${order.who} wants a redo`) : applied ? "Gorgeous. They're on your look 💅" : "Not quite salon-perfect",
      stats: [{ label: "Coverage", value: `${Math.round(avgCov * 100)}%` }, { label: "Spills", value: String(spills) }, { label: "Shape", value: shape === order.shape ? "✓" : "✗" }],
      share: order.local ? `💅 Did ${order.who}'s nails at the nail bar on Dubai Life` : `💅 Fresh nails on Dubai Life`,
    }), 1200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when done
  }, [step]);

  // Painting and design taps, from the 3D hand.
  const onPaint = (finger: number, u: number, v: number, kind: "down" | "move") => {
    const n = nailsRef.current[finger];
    if (!n || !playing) return;
    const sh = shapeRef.current;
    if (step === "paint" || (step === "design" && order.design === "french")) {
      const layer = step === "paint" ? n.grid : n.tip;
      const r = 0.12;
      for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
        const cu = (gx + 0.5) / GW, cv = (gy + 0.5) / GH;
        if ((cu - u) ** 2 + ((cv - v) * 0.66) ** 2 > r * r) continue;
        if (!inside(sh, cu, cv)) continue;
        // The French tip is the last quarter of the nail; white below it is a smudge.
        if (step === "design" && cv < 0.72) { if (kind === "down") setSpills((s) => s + 1); continue; }
        layer[gy * GW + gx] = 1;
      }
      versionRef.current++;
      if (step === "paint") {
        const total = maskCount(sh), painted = countIn(n.grid, sh);
        setCoverage((c) => { const x = [...c]; x[finger] = painted / total; return x; });
      } else {
        const tipTotal = maskCount(sh, 0.72), tipPainted = countIn(n.tip, sh, 0.72);
        setDesignDone((d) => { const x = [...d]; x[finger] = Math.min(1, tipPainted / tipTotal / 0.85); return x; });
      }
    } else if (step === "design" && kind === "down") {
      if (order.design === "glitter") { n.glitter += 1; setDesignDone((d) => { const x = [...d]; x[finger] = Math.min(1, n.glitter / 3); return x; }); sfx("mgStar"); }
      if (order.design === "gems" && n.gems.length < 3) { n.gems.push([u, v]); setGemList((g) => g.map((x, j) => (j === finger ? [...x, [u, v] as [number, number]] : x))); setDesignDone((d) => { const x = [...d]; x[finger] = Math.min(1, n.gems.length / 3) * (inside(sh, u, v) ? 1 : 0.4); return x; }); sfx("clack"); }
      versionRef.current++;
    }
  };
  const onSkin = () => { if (step === "paint" && playing) { setSpills((s) => s + 1); haptic(30); sfx("warn"); } };

  const avgCov = coverage.reduce((a, b) => a + b, 0) / FINGERS;
  const designAvg = designDone.reduce((a, b) => a + b, 0) / FINGERS;

  return (
    <div className="absolute inset-0">
      <GameStage camera={{ position: [0, 2.1, 1.4], fov: 42 }} background="#2a1a24" environment={0.7}>
        <Hand nailsRef={nailsRef} versionRef={versionRef} shapeRef={shapeRef} colour={colour} skin={skin} design={order.design} onPaint={onPaint} onSkin={onSkin} uvOn={step === "uv" && holding} gems={gemList} />
      </GameStage>

      <div className="absolute inset-x-0 top-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-14 space-y-1.5 pointer-events-none">
        <div className="flex flex-wrap gap-2">
          <Pill icon="⏱️" value={`${Math.max(0, Math.ceil(order.seconds - t))}s`} />
          <Pill icon="💅" value={`${NAILS.shapes[order.shape]} · ${NAILS.designs[order.design]}`} tone="gold" />
          <Pill icon="🎨" value={<span className="inline-block w-3 h-3 rounded-full align-middle border border-white/50" style={{ background: order.colour }} />} />
          {spills > 0 && <Pill icon="💧" value={`${spills} spills`} />}
        </div>
        {order.local && <p className="text-xs text-white/80"><span className="rounded bg-amber-400/90 text-amber-950 px-1 text-[9px] font-black mr-1">Local</span>{order.who}: “{order.says}”</p>}
      </div>
      {callouts.node}

      <div className="absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] space-y-2">
        {step === "shape" && (
          <>
            <p className="text-sm font-black text-center">File them into shape</p>
            <div className="grid grid-cols-5 gap-1.5">{(Object.keys(NAILS.shapes) as Shape[]).map((s) => (
              <button key={s} onClick={() => { setShape(s); sfx("rustle"); setStep("paint"); callouts.push(s === order.shape ? "Perfect shape" : "Hmm, not what they asked", s === order.shape ? "good" : "bad"); }} className="h-12 rounded-xl bg-white/10 text-[11px] font-black">{NAILS.shapes[s]}</button>
            ))}</div>
          </>
        )}
        {step === "paint" && (
          <>
            {order.local && <div className="flex gap-1.5 justify-center">{NAILS.palette.map((c) => <button key={c} onClick={() => setColour(c)} className={`w-8 h-8 rounded-full border-2 ${colour === c ? "border-white scale-110" : "border-white/20"}`} style={{ background: c }} aria-label="Polish colour" />)}</div>}
            <Meter label={`Painted ${Math.round(avgCov * 100)}%: drag on each nail`} value={avgCov} color="#ec4899" warnBelow={0} />
            <button disabled={avgCov < 0.5} onClick={() => { setStep(order.design === "plain" ? "uv" : "design"); sfx("chime"); }} className="w-full h-12 rounded-2xl bg-pink-500 font-black disabled:opacity-40">{order.design === "plain" ? "Into the UV lamp" : `Next: ${NAILS.designs[order.design]}`}</button>
          </>
        )}
        {step === "design" && (
          <>
            <Meter label={order.design === "french" ? "Paint the white tips (top quarter of each nail)" : order.design === "glitter" ? "Tap each nail three times to sprinkle glitter" : "Tap three gems onto each nail"} value={designAvg} color="#f8fafc" warnBelow={0} />
            <button onClick={() => { setStep("uv"); sfx("chime"); }} className="w-full h-12 rounded-2xl bg-pink-500 font-black">Into the UV lamp</button>
          </>
        )}
        {step === "uv" && (
          <>
            <Meter label={smudged ? "Smudged a little… hold steady" : "Hold to cure"} value={uv / NAILS.uvSeconds} color="#a78bfa" warnBelow={0} />
            <button
              onPointerDown={() => { holdRef.current = true; setHolding(true); haptic(5); }}
              onPointerUp={() => { holdRef.current = false; setHolding(false); if (uv > 0 && uv < NAILS.uvSeconds) { setSmudged(true); callouts.push("Too soon! Smudge", "bad"); } }}
              onPointerLeave={() => { holdRef.current = false; setHolding(false); }}
              className="w-full h-16 rounded-2xl bg-violet-500 font-black text-lg">💡 Hold under the lamp</button>
          </>
        )}
      </div>
    </div>
  );
}

const maskCache = new Map<string, number>();
function maskCount(shape: Shape, from = 0) {
  const key = `${shape}:${from}`;
  const hit = maskCache.get(key);
  if (hit) return hit;
  let n = 0;
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) if ((gy + 0.5) / GH >= from && inside(shape, (gx + 0.5) / GW, (gy + 0.5) / GH)) n++;
  maskCache.set(key, n);
  return n;
}
function countIn(grid: Uint8Array, shape: Shape, from = 0) {
  let n = 0;
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) if (grid[gy * GW + gx] && (gy + 0.5) / GH >= from && inside(shape, (gx + 0.5) / GW, (gy + 0.5) / GH)) n++;
  return n;
}

// ---------------------------------------------------------------- the hand

/** A finger's base position on the palm and its length (thumb first). */
const FINGER_DEFS: Array<{ x: number; z: number; len: number; yaw: number; r: number }> = [
  { x: -0.42, z: -0.05, len: 0.42, yaw: 0.55, r: 0.085 },
  { x: -0.2, z: -0.38, len: 0.52, yaw: 0.08, r: 0.075 },
  { x: 0, z: -0.42, len: 0.58, yaw: 0, r: 0.077 },
  { x: 0.2, z: -0.4, len: 0.54, yaw: -0.07, r: 0.074 },
  { x: 0.38, z: -0.32, len: 0.42, yaw: -0.18, r: 0.066 },
];

function Hand({ nailsRef, versionRef, shapeRef, colour, skin, design, onPaint, onSkin, uvOn, gems }: {
  nailsRef: RefObject<NailState[]>; versionRef: RefObject<number>; shapeRef: RefObject<Shape>; colour: string; skin: string; design: Design;
  onPaint: (finger: number, u: number, v: number, kind: "down" | "move") => void; onSkin: () => void; uvOn: boolean;
  gems: Array<Array<[number, number]>>;
}) {
  const camera = useThree((s) => s.camera);
  const look = useMemo(() => new THREE.Vector3(0, 0.1, -0.35), []);
  const home = useMemo(() => new THREE.Vector3(0, 2.1, 1.4), []);
  const canvases = useRef<HTMLCanvasElement[]>([]);
  const textures = useRef<THREE.CanvasTexture[]>([]);
  const mats = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  const seen = useRef(-1);
  const painting = useRef(false);
  const lamp = useRef<THREE.PointLight>(null);

  // One canvas and texture per nail, made once.
  useEffect(() => {
    canvases.current = Array.from({ length: FINGERS }, () => { const c = document.createElement("canvas"); c.width = GW * 4; c.height = GH * 4; return c; });
    textures.current = canvases.current.map((c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; });
    textures.current.forEach((t, i) => { const m = mats.current[i]; if (m) { m.map = t; m.needsUpdate = true; } });
    seen.current = -1;
    return () => textures.current.forEach((t) => t.dispose());
  }, []);

  useGameFrame((dt) => {
    camera.position.lerp(home, Math.min(1, dt * 2));
    camera.lookAt(look);
    applyShake(camera);
    if (lamp.current) lamp.current.intensity = uvOn ? 6 : 0;
    if (versionRef.current === seen.current) return;
    seen.current = versionRef.current;
    const shape = shapeRef.current;
    nailsRef.current.forEach((n, i) => {
      const c = canvases.current[i], g = c?.getContext("2d");
      if (!c || !g) return;
      g.clearRect(0, 0, c.width, c.height);
      for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
        if (!inside(shape, (gx + 0.5) / GW, (gy + 0.5) / GH)) continue;
        const k = gy * GW + gx;
        g.fillStyle = n.tip[k] ? "#ffffff" : n.grid[k] ? colour : "#d99b86"; // bare nail: a deeper natural tone, so any polish shows
        // Canvas y runs down; the nail's tip (v = 1) is at the top of the texture.
        g.fillRect(gx * 4, (GH - 1 - gy) * 4, 4, 4);
      }
      if (design === "glitter" && n.glitter) {
        for (let s = 0; s < n.glitter * 25; s++) { g.fillStyle = s % 3 ? "#fef9c3" : "#ffffff"; g.fillRect(((s * 37) % (GW * 4)), ((s * 53) % (GH * 4)), 2, 2); }
      }
      const tex = textures.current[i];
      if (tex) tex.needsUpdate = true;
    });
  });

  const handle = (finger: number, kind: "down" | "move") => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (kind === "down") painting.current = true;
    if (kind === "move" && !painting.current) return;
    if (e.uv) onPaint(finger, e.uv.x, e.uv.y, kind);
  };

  return (
    <group>
      <hemisphereLight args={["#fff1f2", "#3b1d2b", 0.9]} />
      <directionalLight position={[1, 4, 2]} intensity={1.6} />
      <pointLight ref={lamp} position={[0, 0.9, -0.3]} color="#a78bfa" intensity={0} distance={3} />
      {/* The table and cushion */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerUp={() => { painting.current = false; }}><planeGeometry args={[6, 6]} /><meshStandardMaterial color="#f5e6e8" roughness={0.6} /></mesh>
      <mesh position={[0, 0.03, -0.25]}><boxGeometry args={[1.6, 0.12, 1.3]} /><meshStandardMaterial color="#fbcfe8" roughness={0.9} /></mesh>
      {/* Polish bottles */}
      {[["#ec4899", -1.1], ["#dc2626", -0.85], ["#d4af37", 1.0]].map(([c, x]) => (
        <group key={String(x)} position={[Number(x), 0.15, -0.8]}>
          <mesh><cylinderGeometry args={[0.07, 0.08, 0.2, 14]} /><meshStandardMaterial color={String(c)} roughness={0.2} metalness={0.2} /></mesh>
          <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.03, 0.03, 0.14, 10]} /><meshStandardMaterial color="#111827" /></mesh>
        </group>
      ))}
      {/* The UV lamp arch */}
      <mesh position={[0, 0.45, -0.35]} rotation={[0, 0, 0]}><torusGeometry args={[0.75, 0.05, 8, 32, Math.PI]} /><meshStandardMaterial color="#e5e7eb" emissive={uvOn ? "#8b5cf6" : "#000000"} emissiveIntensity={uvOn ? 1.2 : 0} /></mesh>
      {/* The hand, palm down, fingers away from you */}
      <group position={[0, 0.2, 0.15]} onPointerUp={() => { painting.current = false; }} onPointerLeave={() => { painting.current = false; }}>
        <mesh scale={[0.95, 0.32, 1]} onPointerMove={(e) => { if (painting.current) { e.stopPropagation(); onSkin(); } }}>
          <sphereGeometry args={[0.36, 24, 16]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        {FINGER_DEFS.map((f, i) => (
          <group key={i} position={[f.x, 0, f.z]} rotation={[0, f.yaw, 0]}>
            <mesh position={[0, 0, -f.len / 2]} rotation={[Math.PI / 2, 0, 0]} onPointerMove={(e) => { if (painting.current) { e.stopPropagation(); onSkin(); } }}>
              <capsuleGeometry args={[f.r, f.len - f.r * 2, 6, 14]} />
              <meshStandardMaterial color={skin} roughness={0.6} />
            </mesh>
            {/* The nail plate at the tip, facing up: the texture shows its shape and paint */}
            <mesh position={[0, f.r + 0.006, -f.len + 0.13]} rotation={[-Math.PI / 2, 0, 0]}
              onPointerDown={handle(i, "down")} onPointerMove={handle(i, "move")} onPointerUp={() => { painting.current = false; }}>
              <planeGeometry args={[f.r * 1.85, f.r * 3]} />
              <meshStandardMaterial ref={(m) => { mats.current[i] = m; }} transparent alphaTest={0.05} roughness={0.15} metalness={0.1} color="#ffffff" />
              {/* Gems sit on the nail, in its own frame (u across, v to the tip). */}
              {gems[i]?.map(([u, v], k) => (
                <mesh key={k} position={[(u - 0.5) * f.r * 1.85, (v - 0.5) * f.r * 3, 0.012]}>
                  <octahedronGeometry args={[0.016]} />
                  <meshStandardMaterial color="#e0f2fe" metalness={0.9} roughness={0.05} emissive="#93c5fd" emissiveIntensity={0.4} />
                </mesh>
              ))}
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
