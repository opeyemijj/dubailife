"use client";

// A hostess bringing drinks at a house party: in through the front door with a champagne bottle and a lit sparkler,
// across to whoever ordered, a "for @name" tag over her, then back out. Everyone in the room sees the same delivery.

import { Suspense, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import { ChampagneBottle } from "@/components/interior/served";

export interface HostessRun { id: string; name: string; to: [number, number] }

// The front door is in the west wall of the home; she comes in just inside it.
const DOOR_IN: [number, number] = [-4.4, -0.5];
const WALK = 1.4;   // metres a second
const STAY = 6;     // seconds at the guest, sparkler burning

function Hostess({ run, onDone }: { run: HostessRun; onDone: (id: string) => void }) {
  const body = useRef<THREE.Group>(null);
  const t = useRef(0);
  const done = useRef(false);
  const [anim, setAnim] = useState<AvatarAnimation>("walk");
  const [serving, setServing] = useState(true);
  // Stand just in front of them, facing them.
  const [tx, tz] = run.to;
  const dx = tx - DOOR_IN[0], dz = tz - DOOR_IN[1];
  const len = Math.hypot(dx, dz) || 1;
  const stop: [number, number] = [tx - (dx / len) * 0.75, tz - (dz / len) * 0.75];
  const there = Math.hypot(stop[0] - DOOR_IN[0], stop[1] - DOOR_IN[1]) / WALK;

  useFrame((_, dt) => {
    t.current += dt;
    const T = t.current, g = body.current;
    if (!g) return;
    let k: number, back = false;
    if (T < there) k = T / there;
    else if (T < there + STAY) { k = 1; if (anim !== "idle") setAnim("idle"); }
    else { k = Math.max(0, 1 - (T - there - STAY) / there); back = true; if (anim !== "walk") setAnim("walk"); if (serving) setServing(false); }
    g.position.set(DOOR_IN[0] + (stop[0] - DOOR_IN[0]) * k, 0, DOOR_IN[1] + (stop[1] - DOOR_IN[1]) * k);
    g.rotation.y = Math.atan2(back ? -dx : dx, back ? -dz : dz);
    if (k === 0 && back && !done.current) { done.current = true; onDone(run.id); }
  });

  return (
    <group ref={body} position={[DOOR_IN[0], 0, DOOR_IN[1]]}>
      <Suspense fallback={null}><CitizenAvatar look={{ gender: "woman", preset: "Female_Party_02" }} animation={anim} /></Suspense>
      {/* The bottle held up in front of her, sparkler lit, until she's handed it over. */}
      {serving && <group position={[0.18, 1.35, 0.28]}><ChampagneBottle sparkler /></group>}
      <Html position={[0, 2.25, 0]} center zIndexRange={[20, 0]}>
        <div className="whitespace-nowrap rounded-full bg-amber-400 text-slate-950 text-[11px] font-black px-2.5 py-1 shadow-lg pointer-events-none">🍾 for @{run.name}</div>
      </Html>
    </group>
  );
}

export function PartyHostesses({ runs, onDone }: { runs: HostessRun[]; onDone: (id: string) => void }) {
  return <>{runs.map((r) => <Hostess key={r.id} run={r} onDone={onDone} />)}</>;
}
