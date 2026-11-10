"use client";

// A venue interior in 3D: the room, its fixtures and stations, staff, shoppers and the citizen.
// Clicking a station walks the citizen there; on arrival the page opens that station's panel.

import { Ceiling } from "@/components/interior/Ceiling";
import { Flies } from "@/components/avatar/Flies";
import { VenueLuxury } from "./VenueLuxury";
import { canvasQuality } from "@/lib/device";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { CitizenAvatar, StudioEnvironment, type AvatarAnimation, type CarryMode } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";
import type { Accessory, Venue } from "@/lib/city/types";
import { approachPoint, type Plan, type StationDef } from "./layouts";
import { floorTexture, signTexture, wallAdScreenTexture } from "./materials";
import { getVenueWallAd, WALL_PANELS, type WallPanelId } from "@/lib/venueAds";
import { ChampagneBottle, HandHeldProp, ServedItem, type ServeKind, type ServedDef } from "./served";
import type { Peer } from "@/lib/room";
import { ActivityStageFX } from "./ActivityStageFX";
import type { ActivityCategory } from "./ActivityExperienceOverlay";
import type { ActiveRide } from "./rides/RideRig";
import type { RideResult } from "./rides/rideIO";

// The rides engine (about 160 KB) loads only when a ride starts, not with every venue.
const RideRig = lazy(() => import("./rides/RideRig").then((m) => ({ default: m.RideRig })));

export interface Activity3DFX {
  active: boolean;
  type: ActivityCategory;
  combo: number;
  burstKey: number;
}

const WALL_H = 4.4;
const WALK_SPEED = 1.6; // m/s
const DRAG = 6;

export interface CarryingState {
  prop?: React.ReactNode;
  mode?: CarryMode;
}

export interface VipTableReservation {
  tableId: string;
  username: string;
}

export interface WalkTarget {
  point: [number, number];
  /** Changes for every new request so repeated clicks on the same spot still work. */
  key: number;
  /** Which way to face on arrival (e.g. sitting down); otherwise the way they walked. */
  face?: number;
  /** Custom walk animation (e.g. "angry_walk" for stomping in anger before slap or fight). */
  anim?: AvatarAnimation;
}

/** Bottle service on its way: hosts walk from `from` to their spots at the table, then back. */
export interface DeliveryDef {
  id: string;
  from: [number, number];
  hosts: Array<{ preset: string; stand: [number, number]; face: number }>;
}

interface Props {
  /** A ride under way (water slides, swimming…): the rig plays it and the walking citizen steps aside. */
  ride?: ActiveRide | null;
  onRideEnd?: (r: RideResult) => void;
  /** Things left in the venue this visit (a sandcastle). */
  extras?: React.ReactNode;
  /** Party lights out. */
  dim?: boolean;
  /** Puts the citizen at a spot (after a ride); a new key moves them again. */
  placeAt?: { point: [number, number]; key: number } | null;
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
  /** Active food or drink being held / consumed */
  carrying?: CarryingState;
  /** Active food or drink consumption for peers in the room */
  peerConsumptions?: Record<string, { action: "drink" | "eat"; prop: string; tint?: string }>;
  /** Active money spraying state for peers in the room */
  peerSpraying?: Record<string, boolean>;
  /** VIP booths reserved by citizens */
  vipTables?: VipTableReservation[];
  /** Tapped an in-venue wall advertisement screen */
  onWallAdClick?: (panelId: WallPanelId) => void;
  /** Active 3D stage visual effects for venue activities (spotlight, floor rings, confetti) */
  activityFX?: Activity3DFX;
  /** Over-the-shoulder camera in the room instead of the overview. */
  inside?: boolean;
  /** First person: the camera at the citizen's eyes. */
  eye?: boolean;
  /** On a yacht: the whole boat seen from out on the water. */
  boat?: boolean;
  /** I haven't washed: flies buzz round me. */
  playerDirty?: boolean;
  /** The on-screen stick and RUN (Inside and Eye views), and where it takes me. */
  stick?: React.RefObject<{ x: number; y: number; sprint?: boolean }>;
  stickRun?: boolean;
  onStickMove?: (x: number, z: number, yaw: number, moving: boolean) => void;
  onAutoWalkStep?: (x: number, z: number, yaw: number, moving: boolean, anim?: AvatarAnimation) => void;
}

const NATURAL_FLOOR: Partial<Record<string, string>> = { sand: "#f3dfae", deck: "#ece7df", ice: "#e0f2fe" };

/** Venues under the open sky (no walls or ceiling). */
const OPEN_AIR = new Set(["outdoor", "beach", "pooldeck", "waterpark"]);

function Room({
  venue,
  plan,
  onFloor,
  onWallAdClick,
  ceiling = false,
}: {
  venue: Venue;
  plan: Plan;
  /** Eye view indoors: a ceiling overhead. */
  ceiling?: boolean;
  onFloor?: (point: [number, number]) => void;
  onWallAdClick?: (panelId: WallPanelId) => void;
}) {
  const [w, d] = plan.size;
  // Sand, pool decks and ice have their own natural colour whatever the venue's palette.
  const floorBase = NATURAL_FLOOR[plan.floor] ?? venue.palette.floor;
  // Plain tiles and concrete are upgraded to polished marble, like the homes.
  const floorKind = plan.walls && (plan.floor === "tiles" || plan.floor === "concrete") ? "marble" : plan.floor;
  const floor = useMemo(() => floorTexture(floorKind, floorBase, [w / 4, d / 4]), [floorKind, floorBase, w, d]);
  const dark = venue.layout === "club" || venue.palette.wall === "#2a2420" || venue.palette.wall === "#0f172a" || venue.palette.wall === "#5a3e2b";
  const sign = useMemo(() => signTexture(venue.name, dark ? "#f8fafc" : venue.palette.accent, null), [venue.name, venue.palette.accent, dark]);

  // Multi-panel digital screens placed strategically across the room
  const panelsData = useMemo(() => {
    return WALL_PANELS.map((p) => {
      const ad = getVenueWallAd(venue.id, p.id);
      const texture = wallAdScreenTexture(ad.headline, ad.sponsorName, ad.badge);
      let pos: [number, number, number] = [0, 2.3, 0];
      let rot: [number, number, number] = [0, 0, 0];
      const adW = Math.min(2.4, w * 0.32);
      const adH = (adW * 9) / 16;

      if (p.id === "panel_main") {
        pos = [w > 8 ? w * 0.26 : 0, 2.3, -d / 2 + 0.09];
        rot = [0, 0, 0];
      } else if (p.id === "panel_west") {
        pos = [-w / 2 + 0.09, 2.3, 0];
        rot = [0, Math.PI / 2, 0];
      } else if (p.id === "panel_east") {
        pos = [w / 2 - 0.09, 2.3, 0];
        rot = [0, -Math.PI / 2, 0];
      }

      return { def: p, ad, texture, pos, rot, adW, adH };
    });
  }, [venue.id, w, d]);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        name="floor"
        onClick={onFloor ? (e) => { if (e.delta > DRAG) return; e.stopPropagation(); onFloor([e.point.x, e.point.z]); } : undefined}
      >
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floor} roughness={floorKind === "marble" ? 0.18 : floorKind === "wood" ? 0.45 : 0.75} metalness={floorKind === "marble" ? 0.12 : 0} />
      </mesh>
      {ceiling && plan.walls && <Ceiling w={w} d={d} h={WALL_H} />}
      {plan.walls && (
        <>
          <mesh position={[0, WALL_H / 2, -d / 2]} receiveShadow><boxGeometry args={[w, WALL_H, 0.12]} /><meshStandardMaterial color={venue.palette.wall} roughness={0.9} /></mesh>
          <mesh position={[-w / 2, WALL_H / 2, 0]} receiveShadow><boxGeometry args={[0.12, WALL_H, d]} /><meshStandardMaterial color={venue.palette.wall} roughness={0.9} /></mesh>
          <mesh position={[w / 2, WALL_H / 2, 0]} receiveShadow><boxGeometry args={[0.12, WALL_H, d]} /><meshStandardMaterial color={venue.palette.wall} roughness={0.9} /></mesh>
          {/* Panelling, pilasters, cove light, sconces, chandeliers and palms (see VenueLuxury). */}
          <VenueLuxury venue={venue} plan={plan} wallH={WALL_H} />
          {/* Skirting and a lit cove line give the room its finish. */}
          <mesh position={[0, 0.06, -d / 2 + 0.07]}><boxGeometry args={[w, 0.12, 0.02]} /><meshStandardMaterial color={venue.palette.accent} /></mesh>
          <mesh position={[0, WALL_H - 0.1, -d / 2 + 0.08]}><boxGeometry args={[w, 0.04, 0.02]} /><meshStandardMaterial color="#fff7e6" emissive="#fff1d6" emissiveIntensity={1.2} /></mesh>
          <mesh position={[0, WALL_H - 0.55, -d / 2 + 0.07]}>
            <planeGeometry args={[Math.min(6, w * 0.5), 1.1]} />
            <meshStandardMaterial map={sign} transparent emissive={dark ? "#ffffff" : "#000000"} emissiveMap={dark ? sign : null} emissiveIntensity={dark ? 0.6 : 0} />
          </mesh>

          {/* Multi-Panel Interactive Advertising Wall Screens */}
          {panelsData.map(({ def, texture, pos, rot, adW, adH }) => (
            <group
              key={def.id}
              position={pos}
              rotation={rot}
              onClick={(e) => {
                e.stopPropagation();
                onWallAdClick?.(def.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "auto";
              }}
            >
              {/* Bezel frame */}
              <mesh position={[0, 0, -0.01]}>
                <boxGeometry args={[adW + 0.12, adH + 0.12, 0.03]} />
                <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
              </mesh>
              {/* Subtle back ambient glow */}
              <mesh position={[0, 0, -0.015]}>
                <boxGeometry args={[adW + 0.18, adH + 0.18, 0.01]} />
                <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
              </mesh>
              {/* Screen display */}
              <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[adW, adH]} />
                <meshStandardMaterial
                  map={texture}
                  roughness={0.2}
                  metalness={0.1}
                  emissive="#ffffff"
                  emissiveMap={texture}
                  emissiveIntensity={0.65}
                />
              </mesh>
            </group>
          ))}
        </>
      )}
    </group>
  );
}

/** Dynamic Club Lighting: moving spotlights, beat pulse strobes, and color beams */
function ClubLighting({ plan }: { plan: Plan }) {
  const [w, d] = plan.size;
  const spot1 = useRef<THREE.SpotLight>(null);
  const spot2 = useRef<THREE.SpotLight>(null);
  const strobe = useRef<THREE.PointLight>(null);
  const floorGlow = useRef<THREE.Mesh>(null);
  const target1 = useMemo(() => new THREE.Object3D(), []);
  const target2 = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (spot1.current) spot1.current.target = target1;
    if (spot2.current) spot2.current.target = target2;
  }, [target1, target2]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Sweeping spotlight 1 (Magenta/Laser Rose)
    target1.position.x = Math.sin(t * 1.5) * (w * 0.35);
    target1.position.z = Math.cos(t * 1.2) * (d * 0.35);
    target1.position.y = 0;
    target1.updateMatrixWorld();

    // Sweeping spotlight 2 (Cyan/Laser Aqua)
    target2.position.x = Math.cos(t * 1.7) * (w * 0.35);
    target2.position.z = Math.sin(t * 1.3) * (d * 0.35);
    target2.position.y = 0;
    target2.updateMatrixWorld();

    // Dynamic strobe and dance floor beat pulse (128 BPM = ~2.13 Hz)
    const beat = Math.pow(Math.max(0, Math.sin(t * 6.7)), 8);
    if (strobe.current) {
      strobe.current.intensity = 1.5 + beat * 8.0;
    }
    if (floorGlow.current) {
      const mat = floorGlow.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = 0.25 + beat * 0.45;
    }
  });

  return (
    <group>
      <primitive object={target1} />
      <primitive object={target2} />
      <spotLight
        ref={spot1}
        position={[-w * 0.25, WALL_H - 0.2, -d * 0.25]}
        intensity={16}
        distance={24}
        angle={0.42}
        penumbra={0.55}
        color="#ec4899"
      />
      <spotLight
        ref={spot2}
        position={[w * 0.25, WALL_H - 0.2, d * 0.25]}
        intensity={16}
        distance={24}
        angle={0.42}
        penumbra={0.55}
        color="#06b6d4"
      />
      <pointLight
        ref={strobe}
        position={[0, WALL_H - 0.35, 0]}
        intensity={2.5}
        distance={16}
        color="#ffffff"
      />
      <pointLight position={[-w * 0.3, WALL_H - 0.5, 0]} intensity={6} distance={12} color="#a855f7" />
      <pointLight position={[w * 0.3, WALL_H - 0.5, 0]} intensity={6} distance={12} color="#f59e0b" />

      {/* Pulsing dance floor center ambient glow */}
      <mesh ref={floorGlow} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[Math.min(w, d) * 0.28, 32]} />
        <meshBasicMaterial color="#d946ef" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Lights({ venue, plan, dim }: { venue: Venue; plan: Plan; dim?: boolean }) {
  const [w, d] = plan.size;
  const club = venue.layout === "club";
  // Lights out at a party: almost dark, so the decorations and club lights glow.
  if (dim) return <><hemisphereLight args={["#7c3aed", "#0f172a", 0.3]} />{club && <ClubLighting plan={plan} />}</>;
  return (
    <>
      {/* Clubs stay moody but bright enough to see yourself and others. */}
      <hemisphereLight args={[club ? "#c084fc" : "#fffaf0", club ? "#1e1b4b" : "#d6d3d1", club ? 1.4 : 0.9]} />
      <directionalLight
        position={[4, 9, 6]}
        intensity={club ? 1.2 : 1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-w / 2 - 1}
        shadow-camera-right={w / 2 + 1}
        shadow-camera-top={d / 2 + 1}
        shadow-camera-bottom={-d / 2 - 1}
        shadow-bias={-0.0004}
      />
      {club ? (
        <ClubLighting plan={plan} />
      ) : (
        [-w / 4, w / 4].flatMap((x) => [-d / 4, d / 6].map((z) => (
          <pointLight key={`${x},${z}`} position={[x, WALL_H - 0.3, z]} intensity={4} distance={9} color="#fff4e0" />
        )))
      )}
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

/**
 * Keeps the citizen in view: from above, the camera glides along as they walk round the room; inside, it
 * sits over their shoulder and settles in behind them as they go.
 */
/** How far behind (and above) the citizen the inside camera sits: far enough to see the room around them. */
const INSIDE_BACK = 6.2, INSIDE_UP = 3.8;
/** Eye view: the camera is at head height, a hair behind the eyes, and turning it looks around. */
const EYE_HEIGHT = 1.62;
/** Eyes view: wide lens, camera a little behind the head (user, 2026-11-04: "too zoomed in"). */
const EYE_FOV = 74, EYE_BACK = 0.45;

function FollowCamera({ follow, inside, eye = false, boat = false, hideMe = false }: { follow: Follow; inside: boolean; eye?: boolean; boat?: boolean; /** On a ride or activity: the ride draws you, so your standing self is hidden (no double). */ hideMe?: boolean }) {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const last = useRef<THREE.Vector3 | null>(null);
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    if (!controls) return;
    const me0 = follow.current.get("me");
    // Eyes see wide (not zoomed in); Above has its own lens (FitCamera), Inside a little wider than Above.
    const cam = camera as THREE.PerspectiveCamera;
    const fov = eye ? EYE_FOV : inside ? 52 : null;
    if (fov && cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    if (eye && me0) {
      const yaw = me0.rotation.y;
      controls.target.set(me0.position.x + Math.sin(yaw) * 0.01, EYE_HEIGHT, me0.position.z + Math.cos(yaw) * 0.01);
      camera.position.set(me0.position.x - Math.sin(yaw) * EYE_BACK, EYE_HEIGHT + 0.06, me0.position.z - Math.cos(yaw) * EYE_BACK);
    } else if (inside) {
      const me = follow.current.get("me");
      if (!me) return;
      controls.target.set(me.position.x, 1.45, me.position.z);
      camera.position.set(me.position.x, INSIDE_UP, me.position.z + INSIDE_BACK);
    } else if (boat) {
      // Out on the water off the yacht's quarter, the whole boat and the skyline in view.
      controls.target.set(0, -0.5, 0);
      camera.position.set(22, 9, 26);
    } else {
      controls.target.copy(TARGET);
      camera.position.set(0, 7.5, 12);
    }
    controls.update();
  }, [inside, eye, boat, controls, camera, follow]);
  useFrame((_, dt) => {
    const me = follow.current.get("me");
    if (!controls || !me) return;
    const p = me.position;
    // Your own body isn't in the way of your eyes, and on a ride the rider is you (so no second you standing by).
    me.visible = !eye && !hideMe;
    if (eye) {
      // Look-around stays yours; the eyes move with you.
      const head = new THREE.Vector3(p.x, EYE_HEIGHT, p.z);
      const shift = head.clone().sub(controls.target);
      controls.target.add(shift);
      camera.position.add(shift);
    } else if (inside) {
      const head = new THREE.Vector3(p.x, 1.45, p.z);
      const shift = head.clone().sub(controls.target);
      controls.target.add(shift);
      camera.position.add(shift);
    } else {
      // Glide part of the way: the room stays framed, with the citizen drifting nearer the middle.
      const k = Math.min(1, dt * 2.5);
      const dx = (p.x * 0.6 + TARGET.x * 0.4 - controls.target.x) * k, dz = (p.z * 0.6 + TARGET.z * 0.4 - controls.target.z) * k;
      controls.target.x += dx; controls.target.z += dz;
      camera.position.x += dx; camera.position.z += dz;
    }
    controls.update();
    last.current = (last.current ?? new THREE.Vector3()).copy(p);
  });
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

function RemotePeer({ peer, follow, followKey, onClick, ring = "#38bdf8", carrying, overrideAnimation }: { peer: Peer; follow: Follow; followKey: string; onClick: () => void; ring?: string; carrying?: CarryingState; overrideAnimation?: AvatarAnimation }) {
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
        <CitizenAvatar
          look={peer.look}
          animation={overrideAnimation ?? (walking ? "walk" : peer.animation)}
          position={[0, !walking && peer.animation === "sit" ? peer.lift ?? 0 : 0, 0]}
          holding={carrying?.prop}
          carryMode={carrying?.mode}
        />
      </Suspense>
      {peer.dirty && <Flies />}
      {/* A soft ring so other players stand out from staff and shoppers. */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[0.36, 0.44, 32]} />
        <meshBasicMaterial color={ring} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

/** Moves the citizen toward the walk target; reports arrival once. */
function Player({
  look,
  worn,
  start,
  walkTo,
  onArrive,
  animation,
  lift,
  carrying,
  follow,
  followKey,
  hidden = false,
  dirty = false,
  placeAt,
  stick,
  stickRun = false,
  bounds,
  obstacles = [],
  onStickMove,
  onAutoWalkStep,
}: {
  /** The on-screen stick (Inside and Eye views): walk or run wherever it points. */
  stick?: React.RefObject<{ x: number; y: number; sprint?: boolean }>;
  stickRun?: boolean;
  /** The room's floor (width, depth), and what's in the way (x, z, radius): the stick slides you round them. */
  bounds?: [number, number];
  obstacles?: Array<[number, number, number]>;
  /** Where the stick has taken me (for others to see). */
  onStickMove?: (x: number, z: number, yaw: number, moving: boolean) => void;
  onAutoWalkStep?: (x: number, z: number, yaw: number, moving: boolean, anim?: AvatarAnimation) => void;
  dirty?: boolean;
  hidden?: boolean;
  placeAt?: { point: [number, number]; key: number } | null;
  look?: AvatarLookProps;
  worn?: Accessory[];
  start: [number, number];
  walkTo: WalkTarget | null;
  onArrive: (key: number) => void;
  animation: AvatarAnimation;
  lift: number;
  carrying?: CarryingState;
  follow: Follow;
  followKey: string;
}) {
  const group = useRef<THREE.Group>(null);
  useFollowable(follow, followKey, group);
  // Walking until the latest target has been reached.
  const [arrivedKey, setArrivedKey] = useState<number | null>(null);
  const walking = !!walkTo && walkTo.key !== arrivedKey;
  const target = useRef<WalkTarget | null>(null);
  const facing = useRef<number | null>(null);
  const vel = useRef({ x: 0, z: 0 });
  // Steering with the stick: walking or running, and when I last told the room where I am.
  const [steer, setSteer] = useState<"walk" | "run" | null>(null);
  const [actionAnim, setActionAnim] = useState<AvatarAnimation | null>(null);
  const lastReport = useRef({ t: 0, moving: false });
  const lastAutoReport = useRef({ t: 0 });

  useEffect(() => {
    const onRoomAction = (ev: Event) => {
      const detail = (ev as CustomEvent<{ event?: { type?: string } }>).detail;
      const t = detail?.event?.type;
      if (!t) return;
      if (t === "slap") {
        setActionAnim("slap");
        setTimeout(() => setActionAnim(null), 2200);
      } else if (t === "brawl" || t === "gang_beat") {
        setActionAnim("fight");
        setTimeout(() => setActionAnim(null), 7500);
      } else if (t === "spray_money") {
        setActionAnim("spray_money");
        setTimeout(() => setActionAnim(null), 4500);
      }
    };
    window.addEventListener("cometodubai:room-action", onRoomAction);
    return () => window.removeEventListener("cometodubai:room-action", onRoomAction);
  }, [look?.gender]);

  useEffect(() => {
    target.current = walkTo;
    facing.current = walkTo?.face ?? null;
  }, [walkTo]);
  // Moved straight to a spot (stepping out of a ride).
  useEffect(() => {
    if (!placeAt || !group.current) return;
    group.current.position.set(placeAt.point[0], 0, placeAt.point[1]);
    target.current = null;
  }, [placeAt]);

  useFrame(({ camera }, dt) => {
    const g = group.current;
    if (!g) return;
    // The stick: steer the way it points (relative to the camera), sliding round anything in the way.
    const sx = stick?.current.x ?? 0, sy = stick?.current.y ?? 0, mag = Math.min(1, Math.hypot(sx, sy));
    let targetVx = 0, targetVz = 0;
    if (mag > 0.04) {
      target.current = null;
      const l = Math.hypot(sx, sy);
      const normX = sx / l;
      const normY = sy / l;
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x).normalize();
      // Inside a venue: strictly walking speed (no running indoors).
      const speed = WALK_SPEED * mag;
      targetVx = (right.x * normX + fwd.x * normY) * speed;
      targetVz = (right.z * normX + fwd.z * normY) * speed;
    }

    // Velocity smoothing: acceleration & smooth deceleration to stop
    const accelRate = (targetVx !== 0 || targetVz !== 0) ? 14 : 12;
    vel.current.x += (targetVx - vel.current.x) * Math.min(1, dt * accelRate);
    vel.current.z += (targetVz - vel.current.z) * Math.min(1, dt * accelRate);
    if (Math.hypot(vel.current.x, vel.current.z) < 0.005) {
      vel.current.x = 0;
      vel.current.z = 0;
    }
    const currentSpeed = Math.hypot(vel.current.x, vel.current.z);

    if (currentSpeed > 0.01) {
      const vx = vel.current.x, vz = vel.current.z;
      const free = (x: number, z: number) => {
        if (bounds && (Math.abs(x) > bounds[0] / 2 - 0.35 || Math.abs(z) > bounds[1] / 2 - 0.35)) return false;
        return !obstacles.some(([ox, oz, r]) => Math.hypot(x - ox, z - oz) < r);
      };
      const nx = g.position.x + vx * dt, nz = g.position.z + vz * dt;
      if (free(nx, nz)) { g.position.x = nx; g.position.z = nz; }
      else if (free(nx, g.position.z)) g.position.x = nx;   // slide along it
      else if (free(g.position.x, nz)) g.position.z = nz;
      turnToward(g, Math.atan2(vx, vz), dt);
      if (steer !== "walk") setSteer("walk");
      const now = performance.now();
      if (!lastReport.current.moving || now - lastReport.current.t > 800) {
        lastReport.current = { t: now, moving: true };
        onStickMove?.(g.position.x, g.position.z, g.rotation.y, true);
      }
      return;
    }
    if (steer) { setSteer(null); lastReport.current = { t: performance.now(), moving: false }; onStickMove?.(g.position.x, g.position.z, g.rotation.y, false); }
    const t = target.current;
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
      if (facing.current !== null) {
        g.rotation.y = facing.current;
      }
      onArrive(t.key);
      onAutoWalkStep?.(g.position.x, g.position.z, facing.current ?? g.rotation.y, false, t.anim);
      return;
    }
    const speed = t.anim === "angry_walk" ? WALK_SPEED * 1.35 : WALK_SPEED;
    const step = Math.min(dist, speed * dt);
    g.position.x += (dx / dist) * step;
    g.position.z += (dz / dist) * step;
    turnToward(g, Math.atan2(dx, dz), dt);
    const now = performance.now();
    if (now - lastAutoReport.current.t > 160) {
      lastAutoReport.current.t = now;
      onAutoWalkStep?.(g.position.x, g.position.z, g.rotation.y, true, t.anim);
    }
  });

  return (
    <group ref={group} position={[start[0], 0, start[1]]} rotation={[0, Math.PI, 0]} visible={!hidden}>
      <CitizenAvatar
        look={look}
        animation={steer ?? (walking ? (walkTo?.anim ?? "walk") : actionAnim ?? animation)}
        accessories={worn}
        position={[0, walking ? 0 : lift, 0]}
        holding={carrying?.prop}
        carryMode={carrying?.mode}
      />
      {dirty && <Flies />}
    </group>
  );
}

function ActivityFXLayer({ activityFX, follow }: { activityFX?: Activity3DFX; follow: Follow }) {
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  useFrame(() => {
    if (!activityFX?.active) return;
    const playerObj = follow.current.get("me");
    if (playerObj) {
      setPos([playerObj.position.x, playerObj.position.z]);
    }
  });
  if (!activityFX?.active) return null;
  return (
    <ActivityStageFX
      active={activityFX.active}
      type={activityFX.type}
      playerPos={pos}
      combo={activityFX.combo}
      burstKey={activityFX.burstKey}
    />
  );
}

export function InteriorScene({
  extras,
  dim,
  ride,
  onRideEnd,
  placeAt,
  venue,
  plan,
  look,
  worn,
  playerAnimation,
  playerLift = 0,
  start,
  walkTo,
  onArrive,
  onStation,
  onStaff,
  staffAnimation,
  highlight,
  served,
  deliveries,
  onPlaced,
  onDeliveryDone,
  peers = [],
  bubbles = {},
  peerBadges = {},
  onPeer,
  locals = [],
  onLocal,
  onFloor,
  onWallAdClick,
  carrying,
  peerConsumptions,
  peerSpraying,
  vipTables = [],
  activityFX,
  inside = false,
  eye = false,
  boat = false,
  playerDirty = false,
  stick,
  stickRun = false,
  onStickMove,
  onAutoWalkStep,
}: Props) {
  const quality = useMemo(() => canvasQuality(), []);
  const [w, d] = plan.size;
  const shoppers = useMemo(() => {
    const spots: Array<[number, number, number]> = [[-w / 4, 0.3, 0.6], [w / 5, d / 5, -2.2]];
    const people = [{ gender: "woman" as const, preset: "Female_Adult_01" }, { gender: "man" as const, preset: "Male_Adult_10" }];
    // Shoppers only browse shops and restaurants (not pools, beaches, theatres…).
    return !["boutique", "tech", "beauty", "jewellery", "market", "dining"].includes(venue.layout) ? [] : spots.map((p, i) => ({ ...people[i], position: p }));
  }, [venue.layout, w, d]);

  const [hovered, setHovered] = useState<string | null>(null);
  const labelNodes = useRef(new Map<string, HTMLDivElement>());
  // Moving things labels follow: other citizens by user id, and "me".
  const followNodes = useRef(new Map<string, THREE.Object3D>());

  const labels: Label[] = [
    // Seats and VIP booths aren't labelled (still tappable): the room reads cleaner without them.
    ...plan.stations.filter((s) => s.kind !== "booth").map((s) => ({
      id: s.id,
      text: s.label,
      // The counter the staff member stands behind gets its label higher, clear of theirs.
      at: [s.position[0], Math.hypot(s.position[0] - plan.staff.position[0], s.position[1] - plan.staff.position[1]) < 1.5 ? 3.6 : 2.95, s.position[1]] as [number, number, number],
      className: hovered === s.id || highlight === s.id ? "bg-emerald-500 text-white scale-110" : "bg-white/90 text-slate-800",
    })),
    // VIP Booth reservations (Item 7 persistent table labels)
    ...vipTables.map((vt) => {
      const table = plan.stations.find((s) => s.id === vt.tableId);
      const pos: [number, number, number] = table ? [table.position[0], 2.2, table.position[1]] : [0, 2, 0];
      return {
        id: `vip:${vt.tableId}`,
        text: `👑 VIP Table · @${vt.username}`,
        at: pos,
        className: "bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300 shadow-xl",
      };
    }),
    { id: "staff", text: `💬 ${venue.staff.role}`, at: [plan.staff.position[0], 1.95, plan.staff.position[1]], className: "bg-slate-900/85 text-white" },
    ...peers.map((p) => ({ id: `peer:${p.userId}`, text: `${p.away ? "💤 " : ""}@${p.username}${peerBadges[p.userId] ? ` · 💬${peerBadges[p.userId]}` : ""}`, at: [0, p.animation === "sit" ? 1.6 : 2.05, 0] as [number, number, number], follow: p.userId, className: p.away ? "bg-slate-500/90 text-white" : "bg-sky-500 text-white" })),
    ...locals.map((p) => ({ id: `peer:${p.userId}`, text: `✨ ${p.username}`, at: [0, p.animation === "sit" ? 1.6 : 2.05, 0] as [number, number, number], follow: p.userId, className: "bg-amber-400 text-slate-900" })),
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
      <color attach="background" args={[venue.layout === "club" ? "#120a24" : OPEN_AIR.has(venue.layout) ? "#bae6fd" : "#e7e5e4"]} />
      <StudioEnvironment intensity={dim ? 0.04 : venue.layout === "club" ? 0.35 : 0.45} />
      <Lights venue={venue} plan={plan} dim={dim} />
      {/* The room appears at once; everything with a model streams in on its own as it arrives. */}
      <Room venue={venue} plan={plan} onFloor={onFloor} onWallAdClick={onWallAdClick} ceiling={eye} />
      <Suspense fallback={null}>{plan.decor}</Suspense>
      {extras}
      {plan.stations.map((s) => (
        <Station key={s.id} s={s} active={highlight === s.id} hover={hovered === s.id} onHover={(on) => setHovered((h) => (on ? s.id : h === s.id ? null : h))} onClick={clickStation(s)} />
      ))}

      {/* Reserved VIP Table golden floor glow */}
      {vipTables.map((vt) => {
        const table = plan.stations.find((s) => s.id === vt.tableId);
        if (!table) return null;
        return (
          <mesh key={vt.tableId} position={[table.position[0], 0.02, table.position[1]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.85, 1.05, 32]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} depthWrite={false} />
          </mesh>
        );
      })}

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
      {peers.map((p) => {
        const pc = peerConsumptions?.[p.userId];
        const peerCarrying: CarryingState | undefined = pc
          ? { prop: <HandHeldProp kind={pc.prop as ServeKind} tint={pc.tint} />, mode: pc.action }
          : undefined;
        return (
          <RemotePeer
            key={p.userId}
            peer={p}
            follow={followNodes}
            followKey={p.userId}
            onClick={() => onPeer?.(p)}
            carrying={peerCarrying}
            overrideAnimation={peerSpraying?.[p.userId] ? "spray_money" : undefined}
          />
        );
      })}
      {locals.map((p) => <RemotePeer key={p.userId} peer={p} follow={followNodes} followKey={p.userId} ring="#f59e0b" onClick={() => onLocal?.(p)} />)}
      <Suspense fallback={null}>
        <Player
          look={look}
          worn={worn}
          start={start ?? plan.entrance}
          walkTo={walkTo}
          onArrive={onArrive}
          animation={playerAnimation}
          lift={playerLift}
          carrying={carrying}
          follow={followNodes}
          followKey="me"
          dirty={playerDirty}
          stick={stick}
          stickRun={stickRun}
          bounds={[w, d]}
          obstacles={plan.stations.filter((s) => s.kind !== "dancefloor").map((s) => [s.position[0], s.position[1], 0.85] as [number, number, number])}
          onStickMove={onStickMove}
          onAutoWalkStep={onAutoWalkStep}
          hidden={!!ride}
          placeAt={placeAt}
        />
      </Suspense>
      {ride && onRideEnd && <Suspense fallback={null}><RideRig key={ride.key} active={ride} look={look} worn={worn} onEnd={onRideEnd} /></Suspense>}
      <ActivityFXLayer activityFX={activityFX} follow={followNodes} />
      <LabelTracker labels={labels} nodes={labelNodes} follow={followNodes} />
      {!inside && !eye && !boat && <FitCamera width={w} depth={d} />}
      <FollowCamera follow={followNodes} inside={inside || eye} eye={eye} boat={boat} hideMe={!!ride} />
      <OrbitControls
        makeDefault
        target={TARGET}
        enablePan={false}
        enableDamping
        minPolarAngle={eye ? 0.35 : inside ? 0.6 : 0.45}
        maxPolarAngle={eye ? 2.4 : inside ? 1.5 : boat ? 1.45 : 1.2}
        minAzimuthAngle={inside || eye || boat ? -Infinity : -0.9}
        maxAzimuthAngle={inside || eye || boat ? Infinity : 0.9}
        minDistance={eye ? 0.05 : inside ? 3 : 6}
        maxDistance={eye ? EYE_BACK + 0.15 : inside ? 11 : boat ? 70 : Math.max(w, d) + 6}
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
