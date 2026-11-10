"use client";

// Bridal shops at Meena Bazaar: "The Dress Hunt". Stand on the podium and try outfits from the racks on your own
// avatar (gowns, lehengas, gele gowns, sherwanis, agbadas, kandura…), turning in the three-way mirror while the
// entourage on the sofa (Locals) react. Five tries to find the one that fits the brief; say yes, then pin the
// alterations as the podium turns, and take it home into your wardrobe. The bridal consultant job dresses Local
// brides and grooms to their brief instead.

import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import BRIDAL from "@/data/arcade/bridal.json";
import { CitizenAvatar } from "@/components/avatar/CitizenAvatar";
import { outfitById, type AvatarLookProps } from "@/components/avatar/roster";
import { adjustBalance, updateCitizen, useCitizen } from "@/lib/citizenStore";
import { useGameProgress } from "@/lib/arcade";
import { loadOwnedCloset, saveOwnedCloset } from "@/lib/closet";
import { haptic, sfx } from "@/utils/gameAudio";
import type { ArcadeGameProps } from "../../ArcadeHost";
import { GameShell, type ShellApi } from "../../GameShell";
import { GameStage, useQuality } from "../../GameStage";
import { Pill, useCallouts } from "../../hud";
import { applyShake, useGameFrame } from "../../stage";

type Gender = "woman" | "man";
type Rack = (typeof BRIDAL.racks.woman)[number];
interface Brief { who: string; gender: Gender; style: string; colour: string; budget: number; says?: string; look: AvatarLookProps; client: boolean }
const aed = (n: number) => `AED ${n.toLocaleString()}`;
const STYLES = BRIDAL.styles as Record<string, string>;
const COLOURS = BRIDAL.colours as Record<string, string>;

/** How well a piece fits the brief, out of 100: style 50, colour 30, within budget 20. */
const fitOf = (r: Rack, b: Brief) => (r.style === b.style ? 50 : 0) + (r.colour === b.colour ? 30 : 0) + ((outfitById(r.id)?.price ?? 0) <= b.budget ? 20 : 0);

export default function BridalGame({ params, onClose, onShare }: ArcadeGameProps) {
  const { citizen } = useCitizen();
  const progress = useGameProgress("bridal");
  const career = !!params?.career;
  const [picked, setPicked] = useState<number | null>(null);
  const myGender: Gender = citizen?.look?.gender === "man" ? "man" : "woman";
  const [style, setStyle] = useState(myGender === "man" ? "emirati" : "classic");
  const [colour, setColour] = useState("white");
  const level = picked ?? Math.min(BRIDAL.clients.length, progress.level + 1);
  const c = BRIDAL.clients[level - 1];
  const brief: Brief = career
    ? { who: c.name, gender: c.gender as Gender, style: c.style, colour: c.colour, budget: c.budget, says: c.says, look: { gender: c.gender as Gender, preset: c.preset }, client: true }
    : { who: "You", gender: myGender, style, colour, budget: citizen?.balance ?? 0, look: citizen?.look ?? { gender: myGender }, client: false };

  return (
    <GameShell
      game="bridal"
      title={career ? `Dress ${c.name}` : myGender === "man" ? "The Groom's Fitting" : "The Dress Hunt"}
      venue="Meena Bazaar · Bur Dubai"
      howTo={[
        { icon: "👗", text: `Pick from the racks to try it on. ${BRIDAL.tries} tries to find the one that fits the brief.` },
        { icon: "💬", text: "Watch the sofa: the entourage (Locals) love some looks more than others." },
        { icon: "📍", text: "Say yes, then pin the alterations: tap as each mark turns to the front." },
      ]}
      levels={career ? BRIDAL.clients.map((x) => ({ n: x.n, label: x.name })) : undefined}
      onLevel={setPicked}
      onClose={onClose}
      onShare={onShare}
      intro={career ? (
        <p className="rounded-2xl bg-white/5 p-3 text-sm"><span className="rounded bg-amber-400/90 text-amber-950 px-1 text-[10px] font-black mr-1">Local</span><b>{c.name}</b>: “{c.says}” · {STYLES[c.style]}, {COLOURS[c.colour].toLowerCase()}, up to {aed(c.budget)}</p>
      ) : (
        <div className="rounded-2xl bg-white/5 p-3 space-y-2">
          <p className="text-xs font-black uppercase text-white/50">Your brief</p>
          <div className="flex flex-wrap gap-1.5">{Object.entries(STYLES).map(([k, v]) => <button key={k} onClick={() => setStyle(k)} className={`rounded-full px-2.5 py-1 text-xs font-black border ${style === k ? "bg-amber-400 text-amber-950 border-amber-300" : "border-white/20"}`}>{v}</button>)}</div>
          <div className="flex flex-wrap gap-1.5">{Object.entries(COLOURS).map(([k, v]) => <button key={k} onClick={() => setColour(k)} className={`rounded-full px-2.5 py-1 text-xs font-black border ${colour === k ? "bg-pink-400 text-pink-950 border-pink-300" : "border-white/20"}`}>{v}</button>)}</div>
        </div>
      )}
    >
      {(api) => <Fitting key={`${brief.who}:${brief.style}:${brief.colour}`} api={api} brief={brief} level={career ? level : 0} />}
    </GameShell>
  );
}

type Step = "browse" | "pins" | "decide";

function Fitting({ api, brief, level }: { api: ShellApi; brief: Brief; level: number }) {
  const rack = BRIDAL.racks[brief.gender] as Rack[];
  const [wearing, setWearing] = useState<Rack | null>(null);
  const [tries, setTries] = useState(0);
  const [best, setBest] = useState(0);
  const [step, setStep] = useState<Step>("browse");
  const [reactions, setReactions] = useState<string[]>(["", "", ""]);
  const [pins, setPins] = useState<number[]>([]);
  const turnRef = useRef(0);
  const [turn, setTurn] = useState(0);
  const callouts = useCallouts();
  const playing = api.phase === "play";

  // The podium's angle for the pins dial (the 3D turns from the same ref).
  useEffect(() => {
    let raf = 0;
    const loop = () => { setTurn(turnRef.current); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const tryOn = (r: Rack) => {
    if (tries >= BRIDAL.tries || step !== "browse") return;
    setWearing(r);
    setTries(tries + 1);
    sfx("rustle"); haptic(8);
    const fit = fitOf(r, brief);
    setBest(Math.max(best, fit));
    setReactions(BRIDAL.entourage.map((e) => (e.loves.includes(r.style) ? "😍" : fit >= 80 ? "🙂" : "🤔")));
    callouts.push(fit >= 80 ? (brief.client ? `${brief.who} is in tears 😭` : "That's the one?!") : fit >= 50 ? "Lovely… but?" : "Hmm, not quite", fit >= 80 ? "great" : fit >= 50 ? "good" : "info");
    if (fit >= 80) sfx("applause");
  };
  const sayYes = () => { if (!wearing) return; setStep("pins"); sfx("chime"); callouts.push("Say yes! 💍 Now the alterations", "great"); };
  // A pin: tap as the next mark (evenly round the podium) comes to the front.
  const pin = () => {
    if (step !== "pins" || pins.length >= BRIDAL.pins) return;
    const target = (pins.length / BRIDAL.pins) * Math.PI * 2;
    const a = ((turnRef.current - target) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    const acc = Math.max(0, 1 - Math.abs(a) / 0.45);
    const next = [...pins, acc];
    setPins(next);
    sfx(acc > 0.8 ? "mgPerfect" : acc > 0.3 ? "tap" : "warn"); haptic(10);
    if (next.length >= BRIDAL.pins) setTimeout(() => setStep("decide"), 500);
  };
  const finish = (take: boolean) => {
    if (!wearing) return;
    const fit = fitOf(wearing, brief);
    const pinAcc = pins.reduce((a, b) => a + b, 0) / BRIDAL.pins;
    const score = Math.round(fit * 20 + pinAcc * 1000 + (BRIDAL.tries - tries) * 100);
    const stars = fit >= 80 && pinAcc > 0.6 ? 3 : fit >= 80 ? 2 : fit >= 50 ? 1 : 0;
    const o = outfitById(wearing.id);
    let bought = false;
    if (take && !brief.client) {
      const owned = loadOwnedCloset();
      const price = o?.price ?? 0;
      if (owned.includes(wearing.id) || !price || adjustBalance(-price)) {
        saveOwnedCloset([...owned, wearing.id]);
        updateCitizen((cz) => ({ ...cz, look: { ...(cz.look ?? { gender: brief.gender }), wear: wearing.id, custom: undefined } }));
        bought = true;
        sfx("cash");
      } else callouts.push("Not enough AED for this one", "bad");
    }
    api.finish({
      score, stars, level: stars > 0 ? level : 0,
      headline: brief.client ? (stars >= 2 ? `${brief.who} said yes! 💍` : `${brief.who} will keep looking`) : bought ? "It's yours 💍" : stars >= 2 ? "You found the one" : "Keep looking",
      stats: [{ label: "Fit", value: `${fit}%` }, { label: "Pins", value: `${Math.round(pinAcc * 100)}%` }, { label: "Tries", value: `${tries}/${BRIDAL.tries}` }],
      share: brief.client ? `👗 Dressed ${brief.who} in the ${wearing.silhouette} at Meena Bazaar on Dubai Life` : `💍 Said yes to the ${o?.label.replace(/^\S+\s/, "") ?? wearing.silhouette} at Meena Bazaar on Dubai Life`,
    });
  };

  const look: AvatarLookProps = useMemo(() => ({ ...brief.look, custom: undefined, wear: wearing?.id ?? brief.look.wear }), [brief.look, wearing]);
  const next = (pins.length / BRIDAL.pins) * Math.PI * 2;

  return (
    <div className="absolute inset-0">
      <GameStage camera={{ position: [0, 1.5, 3.4], fov: 45 }} background="#2b1a1f" environment={0.7}>
        <Salon look={look} turnRef={turnRef} spinning={playing} reactions={reactions} rack={rack} />
      </GameStage>
      <div className="absolute inset-x-0 top-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-14 flex flex-wrap gap-2 pointer-events-none">
        <Pill icon="👗" value={`Try ${tries}/${BRIDAL.tries}`} />
        <Pill icon="🎯" value={`${STYLES[brief.style]} · ${COLOURS[brief.colour]}`} tone="gold" />
        {brief.client && <Pill value={<span><span className="rounded bg-amber-400/90 text-amber-950 px-1 text-[9px] mr-1">Local</span>{brief.who}</span>} />}
      </div>
      {callouts.node}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] space-y-2">
        {step === "browse" && (
          <>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {rack.map((r) => {
                const o = outfitById(r.id);
                const on = wearing?.id === r.id;
                return (
                  <button key={r.id} onClick={() => tryOn(r)} disabled={tries >= BRIDAL.tries && !on}
                    className={`shrink-0 w-32 rounded-2xl p-2 text-left border ${on ? "bg-pink-400 text-pink-950 border-pink-200" : "bg-black/60 border-white/15"} disabled:opacity-40`}>
                    <span className="block text-[11px] font-black leading-tight">{r.silhouette}</span>
                    <span className="block text-[10px] opacity-75">{STYLES[r.style]} · {COLOURS[r.colour]}</span>
                    <span className="text-[10px] font-mono">{o?.price ? aed(o.price) : "In stock"}</span>
                  </button>
                );
              })}
            </div>
            <button disabled={!wearing} onClick={sayYes} className="w-full h-12 rounded-2xl bg-pink-500 font-black disabled:opacity-40">💍 Say yes to this one</button>
          </>
        )}
        {step === "pins" && (
          <div className="flex items-center gap-3">
            <div className="relative w-28 h-28 rounded-full border-4 border-white/20 shrink-0">
              <div className="absolute left-1/2 -top-1 w-1 h-5 -ml-0.5 bg-amber-300 rounded" />
              <div className="absolute w-5 h-5 rounded-full bg-pink-400 border-2 border-white" style={{ left: `calc(50% + ${Math.sin(next - turn) * 44}px - 10px)`, top: `calc(50% - ${Math.cos(next - turn) * 44}px - 10px)` }} />
            </div>
            <div className="flex-1 space-y-1.5">
              <p className="text-sm font-black">Pin {pins.length + 1} of {BRIDAL.pins}: tap when the pink mark reaches the gold line</p>
              <button onClick={pin} className="w-full h-14 rounded-2xl bg-amber-400 text-amber-950 font-black text-lg">📍 Pin</button>
            </div>
          </div>
        )}
        {step === "decide" && (
          brief.client
            ? <button onClick={() => finish(false)} className="w-full h-12 rounded-2xl bg-amber-400 text-amber-950 font-black">Send {brief.who} off happy</button>
            : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => finish(false)} className="h-12 rounded-2xl bg-white/10 font-black">Not today</button>
                <button onClick={() => finish(true)} className="h-12 rounded-2xl bg-pink-500 font-black">Take it home · {wearing && outfitById(wearing.id)?.price ? aed(outfitById(wearing.id)!.price!) : "free"}</button>
              </div>
            )
        )}
      </div>
    </div>
  );
}

/** The salon: racks of outfits round the walls, the podium turning in the three-way mirror, the sofa. */
function Salon({ look, turnRef, spinning, reactions, rack }: { look: AvatarLookProps; turnRef: React.RefObject<number>; spinning: boolean; reactions: string[]; rack: Rack[] }) {
  const tier = useQuality();
  const camera = useThree((s) => s.camera);
  const lookAt = useMemo(() => new THREE.Vector3(0, 1.0, 0), []);
  const home = useMemo(() => new THREE.Vector3(0.2, 1.45, 3.7), []);
  const podium = useRef<THREE.Group>(null);
  const mirrorCopy = useRef<THREE.Group>(null);
  useGameFrame((dt) => {
    if (spinning) turnRef.current = (turnRef.current + dt * 0.7) % (Math.PI * 2);
    if (podium.current) podium.current.rotation.y = turnRef.current;
    if (mirrorCopy.current) mirrorCopy.current.rotation.y = -turnRef.current + Math.PI;
    camera.position.lerp(home, Math.min(1, dt * 2));
    camera.lookAt(lookAt);
    applyShake(camera);
  });
  const colourOf: Record<string, string> = { white: "#fafaf9", gold: "#d4af37", crimson: "#b91c1c", black: "#111827", lace: "#f5f5f4" };
  return (
    <group>
      <hemisphereLight args={["#fff1f2", "#3f1d2b", 0.8]} />
      <spotLight position={[0, 4.2, 1.5]} angle={0.5} penumbra={0.6} intensity={40} castShadow={tier === 2} color="#fff7ed" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[10, 10]} /><meshStandardMaterial color="#f5e6e8" roughness={0.5} /></mesh>
      <mesh position={[0, 2, -2.4]}><planeGeometry args={[10, 4]} /><meshStandardMaterial color="#fbeff2" /></mesh>
      {/* The three-way mirror behind the podium, and your reflection in the middle panel */}
      {[-1, 0, 1].map((i) => (
        <mesh key={i} position={[i * 1.05, 1.3, -1.55 + Math.abs(i) * 0.3]} rotation={[0, -i * 0.5, 0]}>
          <planeGeometry args={[1, 2.4]} /><meshStandardMaterial color="#e0f2fe" metalness={0.9} roughness={0.05} transparent opacity={0.55} />
        </mesh>
      ))}
      {tier > 0 && <group ref={mirrorCopy} position={[0, 0.25, -3.1]} scale={[-1, 1, 1]}><CitizenAvatar look={look} animation="idle" /></group>}
      {/* The podium */}
      <mesh position={[0, 0.12, 0]} receiveShadow><cylinderGeometry args={[0.75, 0.8, 0.24, 40]} /><meshStandardMaterial color="#f8fafc" roughness={0.3} /></mesh>
      <mesh position={[0, 0.245, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.66, 0.74, 48]} /><meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.25} /></mesh>
      <group ref={podium} position={[0, 0.25, 0]}><CitizenAvatar look={look} animation="idle" /></group>
      {/* Racks along the side walls, each piece in its colour */}
      {[-3.3, 3.3].map((x, side) => (
        <group key={x} position={[x, 0, -0.6]}>
          <mesh position={[0, 1.85, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.02, 0.02, 2.4, 8]} /><meshStandardMaterial color="#d4af37" metalness={0.8} /></mesh>
          {rack.filter((_, i) => i % 2 === side).map((r, i) => (
            <mesh key={r.id} position={[0, 1.15, -1 + i * 0.5]}><coneGeometry args={[0.28, 1.3, 12, 1, true]} /><meshStandardMaterial color={colourOf[r.colour] ?? "#fafaf9"} side={THREE.DoubleSide} roughness={0.6} /></mesh>
          ))}
        </group>
      ))}
      {/* The sofa and the entourage (Locals), reacting */}
      {/* To the side, facing the podium, so they never stand between you and the camera */}
      <mesh position={[2.35, 0.25, 0.6]}><boxGeometry args={[0.8, 0.5, 2.6]} /><meshStandardMaterial color="#9d174d" roughness={0.7} /></mesh>
      {BRIDAL.entourage.map((e, i) => (
        <group key={e.name} position={[2.4, 0.05, 0.6 + (i - 1) * 0.85]} rotation={[0, -Math.PI / 2, 0]}>
          <CitizenAvatar look={{ gender: "woman", preset: e.preset }} animation={reactions[i] === "😍" ? "clap" : reactions[i] ? "talk" : "sit"} />
        </group>
      ))}
    </group>
  );
}
