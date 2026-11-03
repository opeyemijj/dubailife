"use client";

// A hostess bringing drinks at a house party: in through the front door with a champagne bottle and a lit sparkler,
// across to whoever ordered, a "for @name" tag over her, then back out. Everyone in the room sees the same delivery.

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CitizenAvatar, type CarryMode } from "@/components/avatar/CitizenAvatar";
import { ChampagneBottle, HandHeldProp } from "@/components/interior/served";

export interface HostessRun { id: string; name: string; to: [number, number]; /** Who ordered (their user id). */ who?: string }

// The front door is in the west wall of the home; she comes in just inside it.
const DOOR_IN: [number, number] = [-4.4, -0.5];
const WALK = 1.4;      // metres a second
const PRESENT = 1.8;   // seconds holding the sparkling bottle up in front of them
const CHEER = 2.6;     // seconds clapping once it's handed over

type Phase = "in" | "present" | "cheer" | "out";

/** Like the club's bottle service: in with the bottle held high and the sparkler lit, presented to whoever ordered,
    handed over (their drink is now in their hand), a cheer, and back out. */
function Hostess({ run, onArrive, onDone }: { run: HostessRun; onArrive?: (run: HostessRun) => void; onDone: (id: string) => void }) {
  const body = useRef<THREE.Group>(null);
  const live = useRef<{ phase: Phase; t: number }>({ phase: "in", t: 0 });
  const [phase, setPhase] = useState<Phase>("in");
  // Stand just in front of them, facing them.
  const [tx, tz] = run.to;
  const dx = tx - DOOR_IN[0], dz = tz - DOOR_IN[1];
  const len = Math.hypot(dx, dz) || 1;
  const stop: [number, number] = [tx - (dx / len) * 0.75, tz - (dz / len) * 0.75];
  const walk = Math.hypot(stop[0] - DOOR_IN[0], stop[1] - DOOR_IN[1]) / WALK;

  useFrame((_, dt) => {
    const g = body.current, l = live.current;
    if (!g) return;
    l.t += dt;
    const go = (p: Phase) => { l.phase = p; l.t = 0; setPhase(p); };
    let k = 1, back = false;
    if (l.phase === "in") { k = Math.min(1, l.t / walk); if (k >= 1) go("present"); }
    else if (l.phase === "present") { if (l.t > PRESENT) { onArrive?.(run); go("cheer"); } }
    else if (l.phase === "cheer") { if (l.t > CHEER) go("out"); }
    else { k = Math.max(0, 1 - l.t / walk); back = true; if (k === 0) { l.t = -1e9; onDone(run.id); } }
    g.position.set(DOOR_IN[0] + (stop[0] - DOOR_IN[0]) * k, 0, DOOR_IN[1] + (stop[1] - DOOR_IN[1]) * k);
    g.rotation.y = Math.atan2(back ? -dx : dx, back ? -dz : dz);
  });

  const carrying = phase === "in" || phase === "present";
  return (
    <group ref={body} position={[DOOR_IN[0], 0, DOOR_IN[1]]}>
      <Suspense fallback={null}>
        <CitizenAvatar look={{ gender: "woman", preset: "Female_Party_02" }}
          animation={phase === "in" || phase === "out" ? "walk" : phase === "cheer" ? "clap" : "idle"}
          holding={carrying ? <group position={[0, -0.12, 0]} scale={1.2}><ChampagneBottle sparkler /></group> : undefined}
          raiseHand />
      </Suspense>
      <Html position={[0, 2.25, 0]} center zIndexRange={[20, 0]}>
        <div className="whitespace-nowrap rounded-full bg-amber-400 text-slate-950 text-[11px] font-black px-2.5 py-1 shadow-lg pointer-events-none">{phase === "cheer" ? `🥂 Cheers @${run.name}!` : `🍾 for @${run.name}`}</div>
      </Html>
    </group>
  );
}

export function PartyHostesses({ runs, onArrive, onDone }: { runs: HostessRun[]; onArrive?: (run: HostessRun) => void; onDone: (id: string) => void }) {
  return <>{runs.map((r) => <Hostess key={r.id} run={r} onArrive={onArrive} onDone={onDone} />)}</>;
}

/** A drink in your hand once the hostess has handed it over: sipping and celebrating at first, then a cup held for
    the rest of the party. Shared with everyone there, so they see it too. */
export type PartyDrink = "sip" | "cup";
export function usePartyDrink() {
  const [drink, setDrink] = useState<PartyDrink | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handed = useCallback(() => {
    setDrink("sip");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDrink("cup"), 20_000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return [drink, handed] as const;
}
/** How a drink is held, for the 3D avatar. */
export function drinkInHand(d: PartyDrink | null | undefined): { prop: React.ReactNode; mode: CarryMode } | undefined {
  return d ? { prop: <HandHeldProp kind="cocktail" tint="#facc15" />, mode: d === "sip" ? "drink" : "hold" } : undefined;
}
