"use client";

// A venue interior in 3D: the room, its fixtures and stations, staff, shoppers and the citizen.
// Clicking a station walks the citizen there; on arrival the page opens that station's panel.

import { canvasQuality } from "@/lib/device";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { CitizenAvatar, StudioEnvironment, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";
import type { Accessory, Venue } from "@/lib/city/types";
import { approachPoint, type Plan, type StationDef } from "./layouts";
import { floorTexture, signTexture } from "./materials";
import { ChampagneBottle, ServedItem, type ServedDef } from "./served";
import type { Peer } from "@/lib/room";

const WALL_H = 4.4;
const WALK_SPEED = 1.6; // m/s
const DRAG = 6;

export interface WalkTarget {
  point: [number, number];
  /** Changes for every new request so repeated clicks on the same spot still work. */
  key: number;
  /** Which way to face on arrival (e.g. sitting down); otherwise the way they walked. */
  face?: number;
}

/** Bottle service on its way: hosts walk from `from` to their spots at the table, then back. */
export interface DeliveryDef {
  id: string;
  from: [number, number];
  hosts: Array<{ preset: string; stand: [number, number]; face: number }>;
}

interface Props {
  venue: Venue;
  plan: Plan;
  look?: AvatarLookProps;
  worn?: Accessory[];
  playerAnimation: AvatarAnimation;
  /** Raises the citizen when sitting on a seat higher than a chair. */
  playerLift?: number;
  /** Where the citizen appears on entering (defaults to the entrance). */
  start?: [number, number];
  walkTo: WalkTarget | null;
  onArrive: (key: number) => void;
  onStation: (s: StationDef) => void;
  onStaff: () => void;
  staffAnimation: AvatarAnimation;
  highlight?: string | null;
  served: ServedDef[];
  deliveries: DeliveryDef[];
  /** A host has put their bottle down. */
  onPlaced: (deliveryId: string, host: number) => void;
  onDeliveryDone: (deliveryId: string) => void;
  /** Other citizens in the venue right now. */
  peers?: Peer[];
  /** Speech bubbles by user id ("me" for the citizen). */
  bubbles?: Record<string, string>;
  /** Unread message counts by user id, shown on their name tag. */
  peerBadges?: Record<string, number>;
  onPeer?: (peer: Peer) => void;
  /** Dubai Life's hosts in this venue (labelled "Local", never passed off as players). */
  locals?: Peer[];
  onLocal?: (local: Peer) => void;
  /** Tapped a free spot on the floor (or the dance floor). */
  onFloor?: (point: [number, number]) => void;
}

function Room({ venue, plan, onFloor }: { venue: Venue; plan: Plan; onFloor?: (point: [number, number]) => void }) {
  const [w, d] = plan.size;
  const floor = useMemo(() => floorTexture(plan.floor, venue.palette.floor, [w / 4, d / 4]), [plan.floor, venue.palette.floor, w, d]);
  const dark = venue.layout === "club" || venue.palette.wall === "#2a2420" || venue.palette.wall === "#0f172a" || venue.palette.wall === "#5a3e2b";
  const sign = useMemo(() => signTexture(venue.name, dark ? "#f8fafc" : venue.palette.accent, null), [venue.name, venue.palette.accent, dark]);
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        name="floor"
        onClick={onFloor ? (e) => { if (e.delta > DRAG) return; e.stopPropagation(); onFloor([e.point.x, e.point.z]); } : undefined}
      >
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floor} roughness={plan.floor === "marble" ? 0.25 : plan.floor === "concrete" ? 0.6 : 0.75} metalness={plan.floor === "marble" ? 0.1 : 0} />
      </mesh>
      {plan.walls && (
        <>
          <mesh position={[0, WALL_H / 2, -d / 2]} receiveShadow><boxGeometry args={[w, WALL_H, 0.12]} /><meshStandardMaterial color={venue.palette.wall} roughness={0.9} /></mesh>
          <mesh position={[-w / 2, WALL_H / 2, 0]} receiveShadow><boxGeometry args={[0.12, WALL_H, d]} /><meshStandardMaterial color={venue.palette.wall} roughness={0.9} /></mesh>
          <mesh position={[w / 2, WALL_H / 2, 0]} receiveShadow><boxGeometry args={[0.12, WALL_H, d]} /><meshStandardMaterial color={venue.palette.wall} roughness={0.9} /></mesh>
          {/* Skirting and a lit cove line give the room its finish. */}
          <mesh position={[0, 0.06, -d / 2 + 0.07]}><boxGeometry args={[w, 0.12, 0.02]} /><meshStandardMaterial color={venue.palette.accent} /></mesh>
          <mesh position={[0, WALL_H - 0.1, -d / 2 + 0.08]}><boxGeometry args={[w, 0.04, 0.02]} /><meshStandardMaterial color="#fff7e6" emissive="#fff1d6" emissiveIntensity={1.2} /></mesh>
          <mesh position={[0, WALL_H - 0.55, -d / 2 + 0.07]}>
            <planeGeometry args={[Math.min(6, w * 0.5), 1.1]} />
            <meshStandardMaterial map={sign} transparent emissive={dark ? "#ffffff" : "#000000"} emissiveMap={dark ? sign : null} emissiveIntensity={dark ? 0.6 : 0} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Lights({ venue, plan }: { venue: Venue; plan: Plan }) {
  const [w, d] = plan.size;
  const club = venue.layout === "club";
  return (
    <>
      {/* Clubs stay moody but bright enough to see yourself and others. */}
      <hemisphereLight args={[club ? "#ddd6fe" : "#fffaf0", club ? "#312e81" : "#d6d3d1", club ? 1.25 : 0.9]} />
      <directionalLight
        position={[4, 9, 6]}
        intensity={club ? 1.4 : 1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-w / 2 - 1}
        shadow-camera-right={w / 2 + 1}
        shadow-camera-top={d / 2 + 1}
        shadow-camera-bottom={-d / 2 - 1}
        shadow-bias={-0.0004}
      />
      {club && <pointLight position={[-2, WALL_H - 0.4, -0.6]} intensity={6} distance={10} color="#e879f9" />}
      {club && <pointLight position={[2, WALL_H - 0.4, -0.6]} intensity={6} distance={10} color="#22d3ee" />}
      {/* Ceiling spots over the floor area */}
      {!club && [-w / 4, w / 4].flatMap((x) => [-d / 4, d / 6].map((z) => (
        <pointLight key={`${x},${z}`} position={[x, WALL_H - 0.3, z]} intensity={4} distance={9} color="#fff4e0" />
      )))}
    </>
  );
}

/**
 * A station: its model (which may still be loading) plus the floor ring where the citizen will stand.
 * Its label is drawn by the page's label overlay.
 */
function Station({ s, active, hover, onHover, onClick }: { s: StationDef; active: boolean; hover: boolean; onHover: (on: boolean) => void; onClick: (e: ThreeEvent<MouseEvent>) => void }) {
  const [ax, az] = approachPoint(s, 0.85);
  return (
    <group>
      <Suspense fallback={null}>
        <group
          position={[s.position[0], 0, s.position[1]]}
          rotation={[0, s.rotation, 0]}
          onClick={onClick}
          onPointerOver={(e) => { e.stopPropagation(); onHover(true); document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { onHover(false); document.body.style.cursor = ""; }}
        >
          {s.visual}
        </group>
      </Suspense>
      {/* Where the citizen will stand; lights up on hover. */}
      <mesh position={[ax, 0.015, az]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[0.32, 0.42, 32]} />
        <meshBasicMaterial color={active ? "#10b981" : "#f8fafc"} transparent opacity={hover || active ? 0.9 : 0.25} />
      </mesh>
    </group>
  );
}

interface Label {
  id: string;
  text: string;
  /** Room position, or an offset from a moving object when `follow` names one. */
  at: [number, number, number];
  follow?: string;
  className: string;
}

/**
 * Keeps the DOM labels pinned over their 3D anchors. One plain DOM layer instead of a drei <Html> per
 * label: those each mount their own React root, which React 19 objects to as the scene streams in.
 */
function LabelTracker({ labels, nodes, follow }: { labels: Label[]; nodes: React.RefObject<Map<string, HTMLDivElement>>; follow: React.RefObject<Map<string, THREE.Object3D>> }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    for (const l of labels) {
      const el = nodes.current.get(l.id);
      if (!el) continue;
      const target = l.follow ? follow.current.get(l.follow) : null;
      if (l.follow && !target) { el.style.display = "none"; continue; }
      v.set(l.at[0], l.at[1], l.at[2]);
      if (target) v.add(target.position);
      v.project(camera);
      const visible = v.z < 1;
      el.style.display = visible ? "" : "none";
      if (visible) el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`;
    }
  });
  return null;
}

/** Turns smoothly toward a heading, the short way round. */
function turnToward(g: THREE.Object3D, heading: number, dt: number) {
  const delta = Math.atan2(Math.sin(heading - g.rotation.y), Math.cos(heading - g.rotation.y));
  g.rotation.y += delta * Math.min(1, dt * 10);
}

/** Steps toward a point; true once there. */
function stepToward(g: THREE.Object3D, [x, z]: [number, number], dt: number) {
  const dx = x - g.position.x;
  const dz = z - g.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.05) return true;
  const step = Math.min(dist, WALK_SPEED * dt);
  g.position.x += (dx / dist) * step;
  g.position.z += (dz / dist) * step;
  turnToward(g, Math.atan2(dx, dz), dt);
  return false;
}

type HostPhase = "wait" | "in" | "present" | "cheer" | "out" | "gone";

/**
 * A bottle-service host: walks out with a sparkling bottle held high, presents it at the table,
 * sets it down, cheers, and heads back.
 */
function Host({ preset, from, stand, face, delay, onPlaced, onGone }: { preset: string; from: [number, number]; stand: [number, number]; face: number; delay: number; onPlaced: () => void; onGone: () => void }) {
  const group = useRef<THREE.Group>(null);
  const [phase, setPhase] = useState<HostPhase>("wait");
  // The frame loop reads and advances the phase; state mirrors it for rendering.
  const live = useRef<{ phase: HostPhase; since: number | null }>({ phase: "wait", since: null });

  useFrame((state, dt) => {
    const g = group.current;
    const now = state.clock.elapsedTime;
    const l = live.current;
    if (!g || l.phase === "gone") return;
    if (l.since === null) l.since = now;
    const t = now - l.since;
    const go = (p: HostPhase) => { l.phase = p; l.since = now; setPhase(p); };
    switch (l.phase) {
      case "wait": if (t > delay) go("in"); break;
      case "in": if (stepToward(g, stand, dt)) go("present"); break;
      case "present":
        turnToward(g, face, dt);
        if (t > 1.8) { onPlaced(); go("cheer"); }
        break;
      case "cheer":
        turnToward(g, face, dt);
        if (t > 2.6) go("out");
        break;
      case "out": if (stepToward(g, from, dt)) { go("gone"); onGone(); } break;
    }
  });

  const carrying = phase === "in" || phase === "present";
  return (
    <group ref={group} position={[from[0], 0, from[1]]} visible={phase !== "wait" && phase !== "gone"}>
      <CitizenAvatar
        look={{ gender: "woman", preset }}
        animation={phase === "in" || phase === "out" ? "walk" : phase === "cheer" ? "clap" : "idle"}
        holding={carrying ? <group position={[0, -0.12, 0]} scale={1.2}><ChampagneBottle sparkler /></group> : undefined}
        raiseHand
      />
    </group>
  );
}

function Delivery({ d, onPlaced, onDone }: { d: DeliveryDef; onPlaced: (id: string, host: number) => void; onDone: (id: string) => void }) {
  const gone = useRef(0);
  return (
    <>
      {d.hosts.map((h, i) => (
        <Suspense key={i} fallback={null}>
          <Host
            preset={h.preset}
            from={[d.from[0] + (i - (d.hosts.length - 1) / 2) * 0.7, d.from[1]]}
            stand={h.stand}
            face={h.face}
            delay={i * 0.6}
            onPlaced={() => onPlaced(d.id, i)}
            onGone={() => { gone.current += 1; if (gone.current === d.hosts.length) onDone(d.id); }}
          />
        </Suspense>
      ))}
    </>
  );
}

const TARGET = new THREE.Vector3(0, 0.9, -0.5);

/**
 * Frames the room for the screen's shape. On a wide screen the default view fits; on a tall phone
 * screen the camera widens its lens and pulls back so the whole room width still fits, and the
 * zoom-out limit follows.
 */
function FitCamera({ width, depth }: { width: number; depth: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  // Fitting the view means setting the camera's lens and position in place.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const portrait = aspect < 1;
    camera.fov = portrait ? 58 : 42;
    camera.updateProjectionMatrix();
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfW = halfH * aspect;
    // Phones look down more steeply, so the room's depth fills the tall screen.
    const base = (portrait ? new THREE.Vector3(0, 11, depth / 2 + 2.5) : new THREE.Vector3(0, 7.5, depth / 2 + 6)).sub(TARGET);
    // Far enough that the room (plus a margin) fits across the screen.
    const needed = (width / 2 + 0.8) / halfW;
    const distance = Math.max(base.length(), Math.min(needed, base.length() * 2.6));
    camera.position.copy(TARGET).add(base.setLength(distance));
    camera.lookAt(TARGET);
    if (controls) {
      controls.maxDistance = Math.max(Math.max(width, depth) + 6, distance + 2);
      controls.minDistance = Math.min(6, distance);
      controls.update();
    }
  }, [camera, controls, size.width, size.height, width, depth]);
  /* eslint-enable react-hooks/immutability */
  return null;
}

/** Another citizen in the venue: walks to wherever they are, faces where they face, tappable. */
type Follow = React.RefObject<Map<string, THREE.Object3D>>;

/** Lets labels find a moving object by key. */
function useFollowable(follow: Follow, key: string, group: React.RefObject<THREE.Group | null>) {
  useEffect(() => {
    const map = follow.current;
    if (group.current) map.set(key, group.current);
    return () => { map.delete(key); };
  }, [follow, key, group]);
}

function RemotePeer({ peer, follow, followKey, onClick, ring = "#38bdf8" }: { peer: Peer; follow: Follow; followKey: string; onClick: () => void; ring?: string }) {
  const group = useRef<THREE.Group>(null);
  const [walking, setWalking] = useState(false);
  const moving = useRef(false);
  useFollowable(follow, followKey, group);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const there = stepToward(g, [peer.x, peer.z], dt);
    if (there && peer.face !== undefined) turnToward(g, peer.face, dt);
    if (moving.current === there) { moving.current = !there; setWalking(!there); }
  });
  return (
    <group
      ref={group}
      position={[peer.x, 0, peer.z]}
      onClick={(e) => { if (e.delta > DRAG) return; e.stopPropagation(); onClick(); }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <Suspense fallback={null}>
        <CitizenAvatar look={peer.look} animation={walking ? "walk" : peer.animation} position={[0, !walking && peer.animation === "sit" ? peer.lift ?? 0 : 0, 0]} />
      </Suspense>
      {/* A soft ring so other players stand out from staff and shoppers. */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[0.36, 0.44, 32]} />
        <meshBasicMaterial color={ring} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

/** Moves the citizen toward the walk target; reports arrival once. */
function Player({ look, worn, start, walkTo, onArrive, animation, lift, follow, followKey }: { look?: AvatarLookProps; worn?: Accessory[]; start: [number, number]; walkTo: WalkTarget | null; onArrive: (key: number) => void; animation: AvatarAnimation; lift: number; follow: Follow; followKey: string }) {
  const group = useRef<THREE.Group>(null);
  useFollowable(follow, followKey, group);
  // Walking until the latest target has been reached.
  const [arrivedKey, setArrivedKey] = useState<number | null>(null);
  const walking = !!walkTo && walkTo.key !== arrivedKey;
  const target = useRef<WalkTarget | null>(null);
  const facing = useRef<number | null>(null);

  useEffect(() => {
    target.current = walkTo;
    facing.current = walkTo?.face ?? null;
  }, [walkTo]);

  useFrame((_, dt) => {
    const g = group.current;
    const t = target.current;
    if (!g) return;
    if (!t) {
      if (facing.current !== null) turnToward(g, facing.current, dt);
      return;
    }
    const dx = t.point[0] - g.position.x;
    const dz = t.point[1] - g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) {
      target.current = null;
      setArrivedKey(t.key);
      onArrive(t.key);
      return;
    }
    const step = Math.min(dist, WALK_SPEED * dt);
    g.position.x += (dx / dist) * step;
    g.position.z += (dz / dist) * step;
    turnToward(g, Math.atan2(dx, dz), dt);
  });

  return (
    <group ref={group} position={[start[0], 0, start[1]]} rotation={[0, Math.PI, 0]}>
      <CitizenAvatar look={look} animation={walking ? "walk" : animation} accessories={worn} position={[0, walking ? 0 : lift, 0]} />
    </group>
  );
}

export function InteriorScene({ venue, plan, look, worn, playerAnimation, playerLift = 0, start, walkTo, onArrive, onStation, onStaff, staffAnimation, highlight, served, deliveries, onPlaced, onDeliveryDone, peers = [], bubbles = {}, peerBadges = {}, onPeer, locals = [], onLocal, onFloor }: Props) {
  const quality = useMemo(() => canvasQuality(), []);
  const [w, d] = plan.size;
  const shoppers = useMemo(() => {
    const spots: Array<[number, number, number]> = [[-w / 4, 0.3, 0.6], [w / 5, d / 5, -2.2]];
    const people = [{ gender: "woman" as const, preset: "Female_Adult_01" }, { gender: "man" as const, preset: "Male_Adult_10" }];
    return venue.layout === "outdoor" || venue.layout === "lobby" || venue.layout === "club" ? [] : spots.map((p, i) => ({ ...people[i], position: p }));
  }, [venue.layout, w, d]);

  const [hovered, setHovered] = useState<string | null>(null);
  const labelNodes = useRef(new Map<string, HTMLDivElement>());
  // Moving things labels follow: other citizens by user id, and "me".
  const followNodes = useRef(new Map<string, THREE.Object3D>());

  const labels: Label[] = [
    ...plan.stations.map((s) => ({
      id: s.id,
      text: s.label,
      at: [s.position[0], 2.6, s.position[1]] as [number, number, number],
      className: hovered === s.id || highlight === s.id ? "bg-emerald-500 text-white scale-110" : "bg-white/90 text-slate-800",
    })),
    { id: "staff", text: `💬 ${venue.staff.role}`, at: [plan.staff.position[0], 2.15, plan.staff.position[1]], className: "bg-slate-900/85 text-white" },
    ...peers.map((p) => ({ id: `peer:${p.userId}`, text: `@${p.username}${peerBadges[p.userId] ? ` · 💬${peerBadges[p.userId]}` : ""}`, at: [0, p.animation === "sit" ? 1.6 : 2.05, 0] as [number, number, number], follow: p.userId, className: "bg-sky-500 text-white" })),
    ...locals.map((p) => ({ id: `peer:${p.userId}`, text: `✨ @${p.username} · Local`, at: [0, p.animation === "sit" ? 1.6 : 2.05, 0] as [number, number, number], follow: p.userId, className: "bg-amber-400 text-slate-900" })),
    ...Object.entries(bubbles).map(([who, text]) => ({
      id: `bubble:${who}`, text: `💬 ${text}`, at: [0, 2.5, 0] as [number, number, number], follow: who, className: "bg-white text-slate-900 max-w-[220px] whitespace-normal",
    })),
  ];

  const clickStation = (s: StationDef) => (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > DRAG) return;
    e.stopPropagation();
    // The dance floor is somewhere to stand: go to the exact spot tapped.
    if (s.kind === "dancefloor" && onFloor) { onFloor([e.point.x, e.point.z]); return; }
    onStation(s);
  };

  return (
    <div className="relative w-full h-full">
    <Canvas shadows={quality.shadows ? { type: THREE.PCFShadowMap } : false} camera={{ position: [0, 7.5, d / 2 + 6], fov: 42 }} dpr={quality.dpr}>
      <color attach="background" args={[venue.layout === "club" ? "#120a24" : venue.layout === "outdoor" ? "#bae6fd" : "#e7e5e4"]} />
      <StudioEnvironment intensity={venue.layout === "club" ? 0.35 : 0.45} />
      <Lights venue={venue} plan={plan} />
      {/* The room appears at once; everything with a model streams in on its own as it arrives. */}
      <Room venue={venue} plan={plan} onFloor={onFloor} />
      <Suspense fallback={null}>{plan.decor}</Suspense>
      {plan.stations.map((s) => (
        <Station key={s.id} s={s} active={highlight === s.id} hover={hovered === s.id} onHover={(on) => setHovered((h) => (on ? s.id : h === s.id ? null : h))} onClick={clickStation(s)} />
      ))}

      <group
        position={[plan.staff.position[0], 0, plan.staff.position[1]]}
        rotation={[0, plan.staff.rotation, 0]}
        onClick={(e) => { if (e.delta > DRAG) return; e.stopPropagation(); onStaff(); }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <Suspense fallback={null}>
          <CitizenAvatar look={{ gender: venue.staff.gender, preset: venue.staff.preset }} animation={staffAnimation} />
        </Suspense>
      </group>
      {shoppers.map((s, i) => (
        <Suspense key={i} fallback={null}>
          <CitizenAvatar look={{ gender: s.gender, preset: s.preset }} animation="idle" position={[s.position[0], 0, s.position[1]]} rotation={[0, s.position[2], 0]} />
        </Suspense>
      ))}
      {served.map((s) => <ServedItem key={s.id} def={s} />)}
      {deliveries.map((d) => <Delivery key={d.id} d={d} onPlaced={onPlaced} onDone={onDeliveryDone} />)}
      {peers.map((p) => <RemotePeer key={p.userId} peer={p} follow={followNodes} followKey={p.userId} onClick={() => onPeer?.(p)} />)}
      {locals.map((p) => <RemotePeer key={p.userId} peer={p} follow={followNodes} followKey={p.userId} ring="#f59e0b" onClick={() => onLocal?.(p)} />)}
      <Suspense fallback={null}>
        <Player look={look} worn={worn} start={start ?? plan.entrance} walkTo={walkTo} onArrive={onArrive} animation={playerAnimation} lift={playerLift} follow={followNodes} followKey="me" />
      </Suspense>
      <LabelTracker labels={labels} nodes={labelNodes} follow={followNodes} />
      <FitCamera width={w} depth={d} />
      <OrbitControls
        makeDefault
        target={TARGET}
        enablePan={false}
        enableDamping
        minPolarAngle={0.45}
        maxPolarAngle={1.2}
        minAzimuthAngle={-0.9}
        maxAzimuthAngle={0.9}
        minDistance={6}
        maxDistance={Math.max(w, d) + 6}
      />
    </Canvas>
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1]">
      {labels.map((l) => (
        <div
          key={l.id}
          ref={(el) => { if (el) labelNodes.current.set(l.id, el); else labelNodes.current.delete(l.id); }}
          className="absolute left-0 top-0 will-change-transform"
        >
          <div className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] sm:px-2.5 sm:py-1 sm:text-[11px] font-black shadow-lg transition-all ${l.className}`}>{l.text}</div>
        </div>
      ))}
    </div>
    </div>
  );
}
