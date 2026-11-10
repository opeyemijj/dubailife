"use client";

// 8-ball on a full-size table at the party (PartyGameBoard): drag back from anywhere on the felt to aim and set
// the power (the cue pulls back), let go to shoot. Every shot is replayed on every screen from where the balls
// started, with the same physics as Game City's pool (poolRules.simulate), so everyone sees the same shot.

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { poolRules, type PoolState } from "@/components/games/Pool";
import { gameAudio } from "@/utils/gameAudio";

const { W, H, R, RAIL, POCKET, POCKETS, colorOf } = poolRules;
const S = 0.003; // table units → m (3 m × 1.5 m)
const TOP = 0.82;
const BR = R * S * 1.12;
const to3 = (x: number, y: number): [number, number] => [(x - W / 2) * S, (y - H / 2) * S];

type Pos = Array<[number, number]>;
interface Controls { enabled: boolean }
/** Turning the camera off while aiming, so the drag aims instead (and back on after). */
function setOrbit(c: unknown, on: boolean) { if (c) (c as Controls).enabled = on; }

/** The glass deck over the swimming pool (4.5 × 8.5 m, PartyGameBoard): the table's 2:1 shape matches it. */
const DECK = { w: 4.5, l: 8.5 };
const TABLE = { l: W * S + 0.16, w: H * S + 0.16 };
const COVER = Math.min(DECK.l / TABLE.l, DECK.w / TABLE.w);

export function PoolTable3D({ state, canMove, onMove, cover = false, crosswise = false }: {
  state: PoolState; canMove: boolean; onMove: (s: PoolState) => void;
  /** Long side across (along x) instead of along the deck: the idle table on the pool's far-end coping. */
  crosswise?: boolean;
  /** Over a swimming pool: a giant table laid flat across the whole pool (no legs), balls and all scaled up. */
  cover?: boolean;
}) {
  const controls = useThree((s) => s.controls);
  const table = useRef<THREE.Group>(null);
  const ballsRef = useRef<THREE.Group>(null);
  const cueRef = useRef<THREE.Group>(null);
  const lineRef = useRef<THREE.Mesh>(null);
  const aimRef = useRef<{ angle: number; power: number } | null>(null);
  const [aiming, setAiming] = useState(false);
  const [rolling, setRolling] = useState(false);
  const order = useMemo(() => state.balls.map((b) => b.n), [state.balls]);
  const rest: Pos = state.balls.map((b) => [b.in ? -999 : b.x, b.y]);
  const restRef = useRef(rest);
  useEffect(() => { restRef.current = rest; });

  // A new shot: replay it from where the balls started.
  const replay = useRef<{ id: number; frames: Pos[]; order: number[]; t: number } | null>(null);
  const seen = useRef(state.shot?.id ?? 0);
  const shotId = state.shot?.id ?? 0;
  useEffect(() => {
    const shot = state.shot;
    if (!shot || shot.id === seen.current) return;
    seen.current = shot.id;
    const sim = poolRules.simulate(shot.from, shot.angle, shot.power);
    replay.current = { id: shot.id, frames: sim.frames, order: shot.from.map((b) => b.n), t: 0 };
    gameAudio.sfx("cue");
    if (sim.firstHit !== null) setTimeout(() => gameAudio.sfx("clack"), 80);
    if (sim.potted.length) setTimeout(() => gameAudio.sfx("pocket"), Math.max(180, Math.round((sim.frames.length * 1000) / 110)));
    const on = setTimeout(() => setRolling(true), 0);
    const off = setTimeout(() => setRolling(false), (sim.frames.length * 1000) / 60 + 50);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, [shotId]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    const g = ballsRef.current;
    if (!g) return;
    const r = replay.current;
    let pos: Pos = restRef.current, ns = order;
    if (r) {
      r.t += Math.min(dt, 0.05);
      const f = Math.floor(r.t * 60);
      if (f < r.frames.length) { pos = r.frames[f]; ns = r.order; } else replay.current = null;
    }
    g.children.forEach((child) => {
      const i = ns.indexOf(child.userData.n as number);
      const p = i >= 0 ? pos[i] : undefined;
      if (!p || p[0] < -100) { child.visible = false; return; }
      child.visible = true;
      const [x, z] = to3(p[0], p[1]);
      child.position.set(x, TOP + BR, z);
    });
    // The cue and the aim line, while aiming.
    const aim = aimRef.current, cue = restRef.current[order.indexOf(0)];
    const show = !!aim && !!cue && !replay.current;
    if (cueRef.current) cueRef.current.visible = show;
    if (lineRef.current) lineRef.current.visible = show;
    if (show && aim && cue) {
      const [cx, cz] = to3(cue[0], cue[1]);
      const back = (28 + aim.power * 110) * S;
      cueRef.current!.position.set(cx - Math.cos(aim.angle) * back, TOP + BR * 1.2, cz - Math.sin(aim.angle) * back);
      cueRef.current!.rotation.set(0, -aim.angle, -0.06);
      lineRef.current!.position.set(cx + Math.cos(aim.angle) * 0.6, TOP + 0.006, cz + Math.sin(aim.angle) * 0.6);
      lineRef.current!.rotation.set(-Math.PI / 2, 0, -aim.angle);
    }
  });

  const live = canMove && !rolling && state.winner === null;
  const cue = state.balls.find((b) => b.n === 0)!;
  /** The pointer over the felt, in table units. */
  const toTable = (e: ThreeEvent<PointerEvent>) => {
    const p = table.current!.worldToLocal(e.point.clone());
    return [p.x / S + W / 2, p.z / S + H / 2];
  };
  const aimAt = (e: ThreeEvent<PointerEvent>) => {
    const [x, y] = toTable(e);
    aimRef.current = { angle: Math.atan2(cue.y - y, cue.x - x), power: Math.min(1, Math.max(0.05, Math.hypot(cue.x - x, cue.y - y) / 320)) };
  };
  const stop = () => { setOrbit(controls, true); setAiming(false); };
  useEffect(() => () => setOrbit(controls, true), [controls]);
  const shoot = () => {
    const a = aimRef.current;
    aimRef.current = null;
    stop();
    if (!a || !live) return;
    onMove(poolRules.shoot(state, a.angle, a.power));
  };

  return (
    // The long side along the deck. Covering the pool, the felt sits just above the deck.
    <group ref={table} rotation={[0, crosswise ? 0 : Math.PI / 2, 0]} scale={cover ? COVER : 1} position={[0, cover ? -(TOP - 0.02) * COVER : 0, 0]}>
      {!cover && [[-1.3, -0.6], [1.3, -0.6], [-1.3, 0.6], [1.3, 0.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, TOP / 2, z]} castShadow><cylinderGeometry args={[0.09, 0.07, TOP, 14]} /><meshStandardMaterial color="#3b2412" roughness={0.5} /></mesh>
      ))}
      <mesh position={[0, cover ? TOP - 0.02 : TOP - 0.09, 0]} castShadow receiveShadow><boxGeometry args={[TABLE.l, cover ? 0.04 : 0.18, TABLE.w]} /><meshStandardMaterial color="#5b2c0c" roughness={0.35} metalness={0.1} /></mesh>
      {/* Cushions */}
      {[[0, -(H / 2 - RAIL / 2) * S, W * S, RAIL * S], [0, (H / 2 - RAIL / 2) * S, W * S, RAIL * S], [-(W / 2 - RAIL / 2) * S, 0, RAIL * S, H * S], [(W / 2 - RAIL / 2) * S, 0, RAIL * S, H * S]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, TOP + 0.02, z]}><boxGeometry args={[w, 0.04, d]} /><meshStandardMaterial color="#166534" roughness={0.8} /></mesh>
      ))}
      <mesh position={[0, TOP + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[(W - RAIL * 2) * S, (H - RAIL * 2) * S]} />
        <meshStandardMaterial color="#15803d" roughness={0.9} />
      </mesh>
      {POCKETS.map(([px, py], i) => {
        const [x, z] = to3(px, py);
        return <mesh key={i} position={[x, TOP + 0.045, z]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[POCKET * S * 1.05, 20]} /><meshBasicMaterial color="#050505" /></mesh>;
      })}
      {/* A lamp over the table (a normal-size one) */}
      {!cover && <mesh position={[0, 2.4, 0]}><boxGeometry args={[1.6, 0.12, 0.35]} /><meshStandardMaterial color="#14532d" emissive="#fef3c7" emissiveIntensity={0.3} /></mesh>}
      {!cover && [-0.8, 0.8].map((x) => <mesh key={x} position={[x, 2.7, 0]}><cylinderGeometry args={[0.008, 0.008, 0.5]} /><meshStandardMaterial color="#111" /></mesh>)}
      {!cover && <pointLight position={[0, 2.2, 0]} intensity={6} distance={4} color="#fff7ed" />}

      <group ref={ballsRef}>
        {order.map((n) => <Ball key={n} n={n} />)}
      </group>
      <group ref={cueRef} visible={false}>
        <mesh position={[-0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.008, 0.016, 1.2, 10]} /><meshStandardMaterial color="#d6a76c" roughness={0.35} /></mesh>
      </group>
      <mesh ref={lineRef} visible={false}><planeGeometry args={[1.2, 0.014]} /><meshBasicMaterial color="#fef08a" transparent opacity={0.85} /></mesh>

      {/* Aim: press on the felt and drag back; while aiming, a wide plane catches the pointer. */}
      <mesh position={[0, TOP + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(e) => {
          if (!live) return;
          e.stopPropagation();
          setOrbit(controls, false);
          setAiming(true);
          aimAt(e);
        }}>
        <planeGeometry args={[W * S, H * S]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {aiming && (
        <mesh position={[0, TOP + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}
          onPointerMove={(e) => { e.stopPropagation(); aimAt(e); }}
          onPointerUp={(e) => { e.stopPropagation(); shoot(); }}
          onPointerLeave={() => { aimRef.current = null; stop(); }}>
          <planeGeometry args={[12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/** A ball: solids in one colour, stripes white with a coloured band, the 8 black, the cue white. */
function Ball({ n }: { n: number }) {
  const color = colorOf(n);
  const stripe = n > 8;
  return (
    <group userData={{ n }}>
      <mesh castShadow>
        <sphereGeometry args={[BR, 18, 14]} />
        <meshPhysicalMaterial color={stripe ? "#fafaf9" : color} roughness={0.12} clearcoat={1} clearcoatRoughness={0.08} />
      </mesh>
      {stripe && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[BR * 1.01, 18, 8, 0, Math.PI * 2, Math.PI / 3, Math.PI / 3]} />
          <meshPhysicalMaterial color={color} roughness={0.12} clearcoat={1} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
