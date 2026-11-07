"use client";

import { Ceiling } from "@/components/interior/Ceiling";
import { Flies } from "@/components/avatar/Flies";
import { PartyDecor } from "@/components/invite/PartyDecor";
import { canvasQuality, isWebGLAvailable, resetWebGLCache } from "@/lib/device";
import React, { createContext, Suspense, useContext, useEffect, useMemo, useRef, useState, Component } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { AvatarLookProps } from "../onboarding/AvatarCanvas";
import { restPose, type RestPose } from "./restPose";
import { GROUNDS, HomeGrounds } from "./HomeGrounds";
import type { Car } from "@/lib/cars";
import { LuxuryDecor } from "./LuxuryDecor";
import { buildNav, findPath, walkable, type Rect, type Seg } from "./homeNav";
import { HomeFixtures } from "./HomeFixtures";
import { fixtureRect, fixtureSpot, fixturesFor, fixtureWallsFor, kindOf, type Fixture } from "@/lib/homeFixtures";
import { CitizenAvatar, type CarryMode, StudioEnvironment, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import { SceneLoadingOverlay } from "@/components/GameLoadingScreen";
import { adjustBalance, DEFAULT_NEEDS, updateCitizen } from "@/lib/citizenStore";
import { gainSkill } from "@/lib/life";
import { gameAudio } from "@/utils/gameAudio";
import {
  AVATAR_SPOT, BUILT_INS, CELL, DOOR, GRID, LAYOUT_SCALE, ROOM_SIZE, WALL_HEIGHT, WINDOW,
  findFreePlacement, floorCenter, floorPlacementAt, getCatalogItem, isPlacementValid, levelOf, rotatedSize, wallOffsetAt, wallTransform, withHomeItems,
  HOUSING_CONFIGS, hasPlot, homeObjectOf, type HomeObject, type HomeActivityDef, type FloorFinish, type HomeStyle, type HousingTier, type LevelDef, type RoomZone,
  type CatalogItem, type FloorPlacement, type Interaction, type OwnedFurniture, type Placement, type Rotation, type Wall,
} from "@/lib/furniture";

// Only what every home has is fetched up front; shop items load when bought or shown.
[...new Set(BUILT_INS.map((b) => b.model))].forEach((url) => url && useGLTF.preload(url));

const HALF = ROOM_SIZE / 2;

/** Where the citizen stands, and where they sit when using the chair or bed. */
// While sitting or asleep the pose carries the spot to stand up at (RestPose.stand).
type Pose = { position: [number, number, number]; yaw: number; lie?: boolean; stand?: [number, number] };
const STAND: Pose = { position: [AVATAR_SPOT.x, 0, AVATAR_SPOT.z], yaw: Math.PI / 4 };
const WALL_THICKNESS = 0.16;
const DRAG_THRESHOLD = 6; // px; anything more is a camera drag, not a tap
const DEFAULT_ORBIT_TARGET: [number, number, number] = [0, 0.8, 0];

export interface PlacingState {
  uid: string;
  itemId: string;
  rot: Rotation;
  /** Which shows on top where it overlaps something (Bring forward / Send back). */
  layer?: number;
}

export interface CandidatePlacement {
  placement: Placement;
  isValid: boolean;
}

export interface ApartmentRoomProps {
  look?: AvatarLookProps;
  furniture?: OwnedFurniture[];
  /** Item currently being placed or moved, if any. */
  placing?: PlacingState | null;
  /** When true, tapping a placed item picks it up instead of interacting. */
  decorating?: boolean;
  /** Cumulative quarter-turns requested from the UI; each change swings the camera 90°. */
  turns?: number;
  /** The citizen's housing tier from their Sustainability Blueprint */
  housingTier?: HousingTier;
  /** High-angle isometric dollhouse cutaway up-view */
  upView?: boolean;
  /** A party on here: its decorations, shown in the room. */
  partyDecor?: string[];
  /** More to show in the room (a hostess bringing drinks). */
  extras?: React.ReactNode;
  /** Party lights out: the room goes dark and the decorations glow. */
  lightsOut?: boolean;
  /** What you're doing, when the page decides (dancing at a party). */
  myAnimation?: AvatarAnimation;
  /** Where you start in the room (x, z), when it isn't the usual spot. */
  startAt?: [number, number];
  /** Where you are as you move about (x, z, facing, walking), so others can see you live. */
  onMove?: (x: number, z: number, yaw: number, walking: boolean, lift?: number, rest?: "sit" | "sleep") => void;
  /** Sit down (on the nearest free seat: sofa, armchair, chair, majlis) or stand up again. Each new `n` is a new ask. */
  seatCall?: { n: number; sit: boolean };
  /** Walk to the nearest fixture of this kind (the shower for "Morning Shower") and use it; each call is a new ask. */
  fixtureCall?: { n: number; kind: string };
  /** What an object in use is showing (the meal on the table, flakes in the tank, the TV on…): its action's `serve`. */
  activity?: string;
  /** Your own car, parked outside a house with a driveway or garage (its model, colour and plate). */
  ownCar?: { car: Car; plate: string } | null;
  /** Go straight out to the pool or the car (each ask is new). */
  groundsCall?: { n: number; what: "pool" | "car" };
  /** What you have in your hand (a drink at a party), and how you hold it. */
  holding?: { prop: React.ReactNode; mode: CarryMode };
  /** I haven't washed: flies buzz round me. */
  dirty?: boolean;
  /** A fixture in use (its id): in the shower, you stand under the water while it runs. */
  using?: string | null;
  /** The on-screen stick (Inside and Eye views): walk or run wherever it points, sliding round furniture. */
  stick?: React.RefObject<{ x: number; y: number; sprint?: boolean }>;
  stickRun?: boolean;
  /** How far back the camera sits, when something needs the whole home in a smaller space. */
  viewDistance?: number;
  /** "inside": an over-the-shoulder camera in the room with the citizen, instead of looking down on the home. */
  /** Above, inside (over the shoulder) or eye (first person: drag to look around). */
  view?: "above" | "inside" | "eye";
  /** Active room focus in multi-room flats (e.g. 2-bedroom) */
  activeRoomId?: string;
  onSelectRoom?: (roomId: string) => void;
  /** Fired whenever the item candidate placement moves or updates validity. */
  onGhostChange?: (candidate: CandidatePlacement | null) => void;
  onPlace?: (uid: string, placement: Placement) => void;
  onPickUp?: (uid: string) => void;
  /** Called when a tap lands somewhere the item doesn't fit. */
  onPlaceBlocked?: () => void;
  onInteractObject?: (type: Interaction) => void;
  /** A kitchen or bathroom fixture was reached and is being used (see HomeFixtures). */
  onUseFixture?: (f: Fixture) => void;
  /** Trigger a home activity/ritual directly (e.g. from the proximity bar when approaching a room or fixture). */
  onTriggerActivity?: (act: HomeActivityDef) => void;
  /** Two-storey homes: the floor on show (0 downstairs, 1 upstairs). Taking the stairs asks to change it. */
  level?: number;
  onChangeLevel?: (level: number) => void;
  /** The owner's floor, wall paint and panelling (defaults to what the home came with). */
  homeStyle?: HomeStyle;
  /** Other people in the room: the resident when visiting, and other citizens here right now. */
  people?: Person[];
}

export interface Person {
  look?: AvatarLookProps;
  position: [number, number, number];
  rotation?: number;
  animation?: AvatarAnimation;
  /** Name tag (e.g. "@brain") and a speech bubble above it. */
  label?: string;
  bubble?: string;
  onClick?: () => void;
  /** In their hand (a drink at a party), and how they hold it. */
  holding?: React.ReactNode;
  carryMode?: CarryMode;
  /** Hasn't washed: flies buzz round them. */
  dirty?: boolean;
  /** Smaller than a grown-up (children: a baby is about a third). */
  scale?: number;
}

type LabelNodes = React.RefObject<Map<string, HTMLDivElement>>;

/** Someone in the room, tappable, with their name tag kept over their head. */
/** The time now (ms), for tap markers. */
const nowMs = () => performance.now();

function PersonAvatar({ p, id, labels }: { p: Person; id: string; labels: LabelNodes }) {
  const group = useRef<THREE.Group>(null);
  // Where they first appear; after that they move live (below).
  const [initial] = useState(p.position);
  // Other players move live: glide to where they are now, walking (and facing the way) while they move.
  const [moving, setMoving] = useState(false);
  useFrame(({ camera, size }, dt) => {
    const g = group.current;
    if (!g) return;
    const [tx, , tz] = p.position;
    const dx = tx - g.position.x, dz = tz - g.position.z, dist = Math.hypot(dx, dz);
    if (dist > 0.03) {
      // Far off (just arrived, or a jump): straight there. Otherwise at walking pace.
      const step = dist > 4 ? dist : Math.min(dist, dt * 2.4);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
      g.rotation.y = Math.atan2(dx, dz);
      if (!moving && dist > 0.15) setMoving(true);
    } else {
      if (moving) setMoving(false);
      g.rotation.y += ((p.rotation ?? g.rotation.y) - g.rotation.y) * Math.min(1, dt * 6);
    }
    // On a seat: raised to it once they've stopped (on the floor while walking).
    g.position.y = dist > 0.15 ? 0 : p.position[1];
    const v = new THREE.Vector3();
    for (const [suffix, lift] of [["tag", 2.2], ["bubble", 2.6]] as const) {
      const el = labels.current.get(`${id}:${suffix}`);
      if (!el) continue;
      g.getWorldPosition(v);
      v.y += lift * (p.scale ?? 1) + ((p.scale ?? 1) < 1 ? 0.3 : 0);
      v.project(camera);
      el.style.display = v.z < 1 ? "" : "none";
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`;
    }
  });
  return (
    <group
      ref={group}
      position={initial}
      rotation={[0, p.rotation ?? 0, 0]}
      onClick={p.onClick ? (e) => { if (e.delta > 6) return; e.stopPropagation(); p.onClick!(); } : undefined}
      onPointerOver={p.onClick ? () => (document.body.style.cursor = "pointer") : undefined}
      onPointerOut={p.onClick ? () => (document.body.style.cursor = "") : undefined}
    >
      {/* Asleep: lying on the floor where they were. */}
      <group position={!moving && p.animation === "sleep" ? [0, 0.12, 0] : [0, 0, 0]} scale={p.scale ?? 1}>
        <CitizenAvatar look={p.look} animation={moving ? "walk" : p.animation ?? "idle"} rotation={!moving && p.animation === "sleep" ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}
          holding={p.holding} carryMode={p.holding ? (moving ? "hold" : p.carryMode ?? "hold") : undefined} />
      </group>
      {p.dirty && <Flies />}
      {p.label && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[0.36, 0.44, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

/** Name tags and bubbles, drawn as plain DOM over the canvas and positioned by PersonAvatar. */
function PeopleLabels({ people, nodes }: { people: Person[]; nodes: LabelNodes }) {
  const bind = (key: string) => (el: HTMLDivElement | null) => { if (el) nodes.current.set(key, el); else nodes.current.delete(key); };
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1]">
      {people.map((p, i) => (
        <React.Fragment key={i}>
          {p.label && (
            <div ref={bind(`p${i}:tag`)} className="absolute left-0 top-0" style={{ display: "none" }}>
              <div className="whitespace-nowrap rounded-full bg-sky-500 text-white px-2 py-0.5 text-[10px] sm:text-[11px] font-black shadow-lg">{p.label}</div>
            </div>
          )}
          {p.bubble && (
            <div ref={bind(`p${i}:bubble`)} className="absolute left-0 top-0" style={{ display: "none" }}>
              <div className="max-w-[220px] rounded-2xl bg-white text-slate-900 px-2.5 py-1 text-[11px] font-bold shadow-lg">💬 {p.bubble}</div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------- models ----------

/** Eyes view: a wide lens and the camera a little behind the head, so it isn't too zoomed in (user, 2026-11-04). */
export const EYE_FOV = 74;
export const EYE_BACK = 0.45;
const BED_MODEL = "/models/furniture/bed.glb";
/** Every bed's mattress top stands this high (m), whatever its width: restPose.ts lies people on it. */
export const BED_MATTRESS = 0.6;
/** The mattress top in bed.glb's own units (measured: the model is 2.83 × 1.56 × 4.26). */
const MODEL_MATTRESS = 0.942;

/** Loads a furniture GLB and fits it into its footprint: centred, resting on y=0, front facing +z. */
/** The bed sheets' colour in this home (HomeStyle.bedding), for every bed. */
const BeddingContext = createContext<string | undefined>(undefined);

function useFittedModel(url: string, size: [number, number], yaw = 0, ghost?: "valid" | "invalid", bedding?: string, customColor?: string) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const model = scene.clone(true);
    model.rotation.y = yaw;
    const fit = new THREE.Group();
    fit.add(model);
    fit.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(fit);
    const sx = (size[0] * CELL * 0.94) / (box.max.x - box.min.x), sz = (size[1] * CELL * 0.94) / (box.max.z - box.min.z);
    const s = Math.min(sx, sz);
    // Beds fill their whole footprint (a grown-up lies full length on them, even a narrow bed-space bunk) and their
    // mattress is always at BED_MATTRESS; the rest keep their proportions.
    const bed = url === BED_MODEL;
    const [kx, ky, kz] = bed ? [sx, BED_MATTRESS / MODEL_MATTRESS, sz] : [s, s, s];
    fit.scale.set(kx, ky, kz);
    fit.position.set(-((box.min.x + box.max.x) / 2) * kx, -box.min.y * ky, -((box.min.z + box.max.z) / 2) * kz);
    const outer = new THREE.Group();
    outer.add(fit);

    const ghostMat = ghost
      ? new THREE.MeshStandardMaterial({ color: ghost === "valid" ? "#34d399" : "#f87171", transparent: true, opacity: 0.55, depthWrite: false })
      : null;
    // Bed sheets: the duvet in the chosen colour, the pillows a paler shade of it.
    const sheet = (customColor || bedding) && !ghost ? new THREE.Color(customColor ?? bedding) : null;
    const itemTint = customColor && !ghost ? new THREE.Color(customColor) : null;
    outer.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (sheet && bed) {
        const part = `${m.name} ${m.parent?.name ?? ""}`;
        if (/comforter|duvet|blanket/i.test(part) || /pillow/i.test(part)) {
          const mat = (Array.isArray(m.material) ? m.material[0] : m.material).clone() as THREE.MeshStandardMaterial;
          mat.map = null;
          mat.color = /pillow/i.test(part) ? sheet.clone().lerp(new THREE.Color("#ffffff"), 0.6) : sheet.clone();
          m.material = mat;
        }
      } else if (itemTint) {
        const mat = (Array.isArray(m.material) ? m.material[0] : m.material).clone() as THREE.MeshStandardMaterial;
        if (mat.color) {
          mat.color = mat.color.clone().lerp(itemTint, 0.72);
          m.material = mat;
        }
      }
      if (ghostMat) {
        m.material = ghostMat;
        m.raycast = () => {}; // ghosts never block the floor underneath
      } else {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return outer;
  }, [scene, size, yaw, ghost, bedding, customColor]);
}

function FurnitureModel({ url, size, yaw, ghost, customColor }: { url: string; size: [number, number]; yaw?: number; ghost?: "valid" | "invalid"; customColor?: string }) {
  const bedding = useContext(BeddingContext);
  const object = useFittedModel(url, size, yaw, ghost, url === BED_MODEL ? bedding : undefined, customColor);
  return <primitive object={object} />;
}

/** Wall art drawn in code: a framed Dubai sunset with the Burj Khalifa. */
function SunsetPainting({ size, ghost }: { size: [number, number]; ghost?: "valid" | "invalid" }) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 384;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const sky = ctx.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, "#1e3a8a");
    sky.addColorStop(0.45, "#f97316");
    sky.addColorStop(0.75, "#fbbf24");
    sky.addColorStop(1, "#fde68a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 384, 256);
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.arc(270, 160, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1f2937";
    // Skyline
    [[20, 190, 30], [60, 170, 26], [95, 200, 34], [250, 185, 28], [290, 205, 40], [335, 180, 30]].forEach(([x, y, w]) => ctx.fillRect(x, y, w, 256 - y));
    // Burj Khalifa: stacked, tapering tiers with a spire
    let y = 256;
    [[150, 64], [158, 48], [164, 36], [169, 26], [173, 18], [176, 12]].forEach(([x, w], i) => {
      const h = 40 - i * 3;
      ctx.fillRect(x, y - h, w, h);
      y -= h;
    });
    ctx.fillRect(181, y - 40, 2, 40);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 236, 384, 20);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  const w = size[0] * CELL;
  const h = size[1] * CELL;
  const ghostColor = ghost === "valid" ? "#34d399" : ghost === "invalid" ? "#f87171" : null;
  return (
    <group raycast={ghost ? () => null : undefined}>
      <mesh castShadow raycast={ghost ? () => null : undefined}>
        <boxGeometry args={[w + 0.1, h + 0.1, 0.05]} />
        <meshStandardMaterial color={ghostColor ?? "#a16207"} roughness={0.4} metalness={0.3} transparent={!!ghost} opacity={ghost ? 0.6 : 1} />
      </mesh>
      <mesh position={[0, 0, 0.03]} raycast={ghost ? () => null : undefined}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} roughness={0.8} transparent={!!ghost} opacity={ghost ? 0.6 : 1} />
      </mesh>
    </group>
  );
}

/** One shared screen picture for every TV: drawn once, uploaded to the GPU once, never rebuilt on remount. */
let tvScreen: THREE.CanvasTexture | null = null;
function tvScreenTexture() {
  if (tvScreen) return tvScreen;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 288;
  const ctx = c.getContext("2d")!;

  // 1. Cinematic Dubai Twilight Sky Gradient
  const sky = ctx.createLinearGradient(0, 0, 0, 288);
  sky.addColorStop(0, "#090d16");
  sky.addColorStop(0.35, "#1e1b4b");
  sky.addColorStop(0.65, "#b45309");
  sky.addColorStop(0.85, "#f59e0b");
  sky.addColorStop(1, "#fde68a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 288);

  // 2. Arabian Gulf Water Reflection
  const water = ctx.createLinearGradient(0, 215, 0, 288);
  water.addColorStop(0, "#0f172a");
  water.addColorStop(0.5, "#1e293b");
  water.addColorStop(1, "#0284c7");
  ctx.fillStyle = water;
  ctx.fillRect(0, 215, 512, 73);

  // Golden Water Highlights
  ctx.fillStyle = "rgba(251, 191, 36, 0.4)";
  for (let i = 0; i < 18; i++) {
    ctx.fillRect(160 + (i % 6) * 35, 220 + i * 3.5, 30 - i * 0.8, 1.5);
  }

  // 3. Iconic Dubai Skyline Silhouettes
  ctx.fillStyle = "#0f172a";
  [[30, 110, 36], [75, 85, 30], [115, 130, 28], [270, 95, 38], [320, 120, 42], [375, 75, 32], [420, 105, 35], [465, 135, 30]].forEach(([x, y, w]) => {
    ctx.fillRect(x, y, w, 215 - y);
    ctx.fillStyle = "#fef08a";
    for (let r = y + 8; r < 210; r += 9) {
      for (let col = x + 4; col < x + w - 4; col += 6) {
        if ((r + col) % 3 !== 0) ctx.fillRect(col, r, 2.5, 3.5);
      }
    }
    ctx.fillStyle = "#0f172a";
  });

  // Burj Khalifa Centrepiece
  const bx = 205;
  ctx.fillStyle = "#020617";
  let by = 215;
  [[44, 35], [36, 40], [28, 40], [20, 35], [14, 25], [8, 18]].forEach(([w, h]) => {
    ctx.fillRect(bx - w / 2, by - h, w, h);
    by -= h;
  });
  // Spire and beacon
  ctx.fillRect(bx - 1.5, by - 22, 3, 22);
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(bx, by - 22, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 4. Broadcast UI Overlay (DUBAI ONE • 65" 4K OLED LIVE)
  ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
  ctx.fillRect(20, 20, 150, 24);
  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(32, 32, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.fillText("DUBAI ONE", 42, 36);
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 9px monospace";
  ctx.fillText("65\" 4K OLED", 110, 36);

  // Bottom info ticker
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 266, 512, 22);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.fillText("LIVE  |  Downtown Dubai Fountain Show in 15 mins  •  DXB Airport Terminals 1, 2, 3 Open", 14, 281);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  tvScreen = t;
  return t;
}

/** A 65-inch flat screen TV on a table stand, standing on a media console against the wall. */
/** What's on the TV while someone watches: the news, a movie or the football, drawn live on the screen. */
function TvShow({ kind, w, h }: { kind: string; w: number; h: number }) {
  const canvas = useMemo(() => { const c = document.createElement("canvas"); c.width = 256; c.height = 144; return c; }, []);
  const tex = useMemo(() => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t; }, [canvas]);
  useEffect(() => () => tex.dispose(), [tex]);
  const last = useRef(0);
  // eslint-disable-next-line react-hooks/immutability -- the canvas texture is redrawn in place each frame
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (t - last.current < 0.08) return;
    last.current = t;
    const g = canvas.getContext("2d")!;
    if (kind === "tv-football") {
      g.fillStyle = "#15803d"; g.fillRect(0, 0, 256, 144);
      g.strokeStyle = "#dcfce7"; g.lineWidth = 2; g.strokeRect(8, 8, 240, 128); g.beginPath(); g.moveTo(128, 8); g.lineTo(128, 136); g.stroke();
      g.beginPath(); g.arc(128, 72, 20, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 10; i++) {
        g.fillStyle = i < 5 ? "#dc2626" : "#f8fafc";
        g.beginPath(); g.arc(60 + (i % 5) * 34 + Math.sin(t * 1.3 + i) * 18, 30 + (i % 3) * 38 + Math.cos(t + i * 2) * 10, 4, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = "#fde047"; g.beginPath(); g.arc(128 + Math.sin(t * 1.7) * 70, 72 + Math.sin(t * 2.3) * 40, 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(8, 6, 92, 16); g.fillStyle = "#fff"; g.font = "bold 11px sans-serif"; g.fillText(`DXB 2 - 1 AUH  ${Math.floor(t) % 90}'`, 12, 18);
    } else if (kind === "tv-news") {
      g.fillStyle = "#0b2a5b"; g.fillRect(0, 0, 256, 144);
      g.fillStyle = "#1e40af"; g.fillRect(150, 20, 90, 70);
      g.fillStyle = "#fcd34d"; g.beginPath(); g.arc(70, 70, 26, 0, Math.PI * 2); g.fill(); g.fillStyle = "#1f2937"; g.fillRect(44, 92, 52, 40);
      g.fillStyle = "#b91c1c"; g.fillRect(0, 112, 256, 32);
      g.fillStyle = "#fff"; g.font = "bold 13px sans-serif";
      g.fillText("DUBAI LIFE NEWS · Metro extended · Skyline record · Weekend sunny 34°C · ", 256 - ((t * 40) % 700), 132);
    } else {
      // A movie: slow-moving scenes in warm cinematic colours, letterboxed.
      const hue = (t * 12) % 360;
      const grad = g.createLinearGradient(0, 0, 256, 144);
      grad.addColorStop(0, `hsl(${hue}, 60%, 35%)`); grad.addColorStop(1, `hsl(${(hue + 60) % 360}, 70%, 18%)`);
      g.fillStyle = grad; g.fillRect(0, 0, 256, 144);
      g.fillStyle = "rgba(255,230,180,0.85)"; g.beginPath(); g.arc(128 + Math.sin(t * 0.4) * 60, 70, 18, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#111"; g.fillRect(0, 0, 256, 18); g.fillRect(0, 126, 256, 18);
    }
    tex.needsUpdate = true; // eslint-disable-line react-hooks/immutability
  });
  return (
    <mesh position={[0, 0, 0.002]} raycast={() => null}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

function FlatScreenTVOnStand({ size, ghost, activity }: { size: [number, number]; ghost?: "valid" | "invalid"; activity?: string }) {
  // The placement ghost is a flat tint, so it never needs the screen picture.
  const screenTexture = ghost ? null : tvScreenTexture();

  // Standard 65-inch 16:9 flat screen display dimensions:
  // 65" diagonal = 1.651m -> 1.44m width x 0.81m height x 0.022m thinness
  const tvW = 1.44; 
  const tvH = 0.81;
  const tableW = Math.max(1.80, size[0] * CELL - 0.08); // e.g. 1.92m console for size: [4, 1]
  const tableD = Math.max(0.38, size[1] * CELL - 0.08); // e.g. 0.42m
  const tableH = 0.45; // standard modern console height
  const standLift = 0.06; // table stand clearance above console top
  const tvCenterY = tableH + standLift + tvH / 2; // 0.915m eye level
  const ghostColor = ghost ? (ghost === "valid" ? "#34d399" : "#f87171") : undefined;

  return (
    <group raycast={ghost ? () => null : undefined}>
      {/* ============================================================ */}
      {/* 1. TV CONSOLE TABLE LEGS / BASE SKIDS                        */}
      {/* ============================================================ */}
      {[-tableW / 2 + 0.16, 0, tableW / 2 - 0.16].map((x, i) => (
        <mesh key={`leg-${i}`} position={[x, 0.04, 0]} castShadow receiveShadow raycast={ghost ? () => null : undefined}>
          <boxGeometry args={[0.06, 0.08, tableD - 0.06]} />
          <meshStandardMaterial
            color={ghostColor ?? "#27272a"}
            metalness={0.8}
            roughness={0.3}
            transparent={!!ghost}
            opacity={ghost ? 0.55 : 1}
          />
        </mesh>
      ))}

      {/* ============================================================ */}
      {/* 2. TV CONSOLE TABLE CABINET (Luxury Smoked Oak / Walnut)     */}
      {/* ============================================================ */}
      <mesh position={[0, 0.08 + (tableH - 0.08) / 2, 0]} castShadow receiveShadow raycast={ghost ? () => null : undefined}>
        <boxGeometry args={[tableW, tableH - 0.08, tableD]} />
        <meshStandardMaterial
          color={ghostColor ?? "#241e1b"}
          roughness={0.65}
          metalness={0.08}
          transparent={!!ghost}
          opacity={ghost ? 0.55 : 1}
        />
      </mesh>

      {/* Top Marble / Polished Surface Slab */}
      <mesh position={[0, tableH - 0.005, 0]} castShadow receiveShadow raycast={ghost ? () => null : undefined}>
        <boxGeometry args={[tableW + 0.02, 0.015, tableD + 0.02]} />
        <meshStandardMaterial
          color={ghostColor ?? "#18181b"}
          roughness={0.25}
          metalness={0.3}
          transparent={!!ghost}
          opacity={ghost ? 0.55 : 1}
        />
      </mesh>

      {/* Cabinet Drawer Seams / Brushed Brass Handles along Front */}
      {!ghost && (
        <>
          {[-tableW * 0.32, -tableW * 0.11, tableW * 0.11, tableW * 0.32].map((x, i) => (
            <mesh key={`handle-${i}`} position={[x, tableH - 0.07, tableD / 2 + 0.008]}>
              <boxGeometry args={[0.12, 0.015, 0.01]} />
              <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.25} />
            </mesh>
          ))}
          {/* Subtle vertical cabinet division grooves */}
          {[-tableW * 0.22, 0, tableW * 0.22].map((x, i) => (
            <mesh key={`seam-${i}`} position={[x, 0.08 + (tableH - 0.08) / 2, tableD / 2 + 0.002]}>
              <boxGeometry args={[0.006, tableH - 0.10, 0.004]} />
              <meshBasicMaterial color="#09090b" />
            </mesh>
          ))}
        </>
      )}

      {/* ============================================================ */}
      {/* 3. TABLE TOP ACCESSORIES (Compact Soundbar & Luxury Decor)   */}
      {/* ============================================================ */}
      {!ghost && (
        <>
          {/* Compact Soundbar directly under the TV */}
          <mesh position={[0, tableH + 0.018, 0.10]} castShadow>
            <boxGeometry args={[0.88, 0.036, 0.07]} />
            <meshStandardMaterial color="#18181b" roughness={0.85} />
          </mesh>
          <mesh position={[0, tableH + 0.018, 0.136]}>
            <boxGeometry args={[0.04, 0.008, 0.002]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>

          {/* Left Decor: Stacked Luxury Art Books & Ceramic Vase */}
          <mesh position={[-tableW * 0.40, tableH + 0.015, -0.02]} castShadow>
            <boxGeometry args={[0.24, 0.03, 0.18]} />
            <meshStandardMaterial color="#334155" roughness={0.7} />
          </mesh>
          <mesh position={[-tableW * 0.40, tableH + 0.038, -0.02]} rotation={[0, 0.12, 0]} castShadow>
            <boxGeometry args={[0.22, 0.025, 0.16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.5} />
          </mesh>
          <mesh position={[-tableW * 0.40, tableH + 0.09, -0.02]} castShadow>
            <cylinderGeometry args={[0.032, 0.042, 0.08, 16]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.3} metalness={0.1} />
          </mesh>

          {/* Right Decor: Brass Tray & Modern Scent Diffuser */}
          <mesh position={[tableW * 0.40, tableH + 0.008, 0]} castShadow>
            <boxGeometry args={[0.26, 0.015, 0.18]} />
            <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[tableW * 0.40, tableH + 0.045, 0]} castShadow>
            <sphereGeometry args={[0.032, 16, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} />
          </mesh>
        </>
      )}

      {/* ============================================================ */}
      {/* 4. DEDICATED TV TABLE STAND (Pedestal Base & Vertical Mount) */}
      {/* ============================================================ */}
      {/* Heavy-duty metallic table stand base plate resting on table */}
      <mesh position={[0, tableH + 0.006, -0.01]} castShadow receiveShadow raycast={ghost ? () => null : undefined}>
        <boxGeometry args={[0.52, 0.012, 0.24]} />
        <meshStandardMaterial
          color={ghostColor ?? "#18181b"}
          metalness={0.85}
          roughness={0.25}
          transparent={!!ghost}
          opacity={ghost ? 0.55 : 1}
        />
      </mesh>

      {/* Central Stand Pedestal Neck rising from the base plate to TV */}
      <mesh position={[0, tableH + standLift / 2 + 0.01, -0.03]} castShadow raycast={ghost ? () => null : undefined}>
        <boxGeometry args={[0.16, standLift + 0.04, 0.06]} />
        <meshStandardMaterial
          color={ghostColor ?? "#09090b"}
          metalness={0.9}
          roughness={0.2}
          transparent={!!ghost}
          opacity={ghost ? 0.55 : 1}
        />
      </mesh>

      {/* Rear VESA Column Mount connecting stand to screen back */}
      <mesh position={[0, tvCenterY - 0.12, -0.024]} castShadow raycast={ghost ? () => null : undefined}>
        <boxGeometry args={[0.22, 0.32, 0.026]} />
        <meshStandardMaterial
          color={ghostColor ?? "#0f172a"}
          metalness={0.8}
          roughness={0.3}
          transparent={!!ghost}
          opacity={ghost ? 0.55 : 1}
        />
      </mesh>

      {/* ============================================================ */}
      {/* 5. PROPER 65-INCH ULTRA-THIN OLED FLAT SCREEN TV             */}
      {/* ============================================================ */}
      {/* TV Casing & Slim Bezel */}
      <mesh position={[0, tvCenterY, 0.0]} castShadow receiveShadow raycast={ghost ? () => null : undefined}>
        <boxGeometry args={[tvW, tvH, 0.022]} />
        <meshStandardMaterial
          color={ghostColor ?? "#0a0a0c"}
          metalness={0.7}
          roughness={0.25}
          transparent={!!ghost}
          opacity={ghost ? 0.55 : 1}
        />
      </mesh>

      {/* Front 65-Inch OLED Display Screen */}
      <mesh position={[0, tvCenterY, 0.012]} raycast={ghost ? () => null : undefined}>
        <planeGeometry args={[tvW - 0.02, tvH - 0.02]} />
        {ghost ? (
          <meshStandardMaterial color={ghostColor} transparent opacity={0.55} depthWrite={false} />
        ) : (
          <meshStandardMaterial
            map={screenTexture}
            roughness={0.08}
            metalness={0.05}
            emissive="#1e3a8a"
            emissiveIntensity={0.22}
          />
        )}
      </mesh>

      {/* Someone's watching: the show on the screen. */}
      {!ghost && activity?.startsWith("tv-") && <group position={[0, tvCenterY, 0.013]}><TvShow kind={activity} w={tvW - 0.04} h={tvH - 0.04} /></group>}

      {/* Power Standby LED in Lower-Right Corner */}
      {!ghost && (
        <mesh position={[tvW / 2 - 0.025, tvCenterY - tvH / 2 + 0.018, 0.013]}>
          <sphereGeometry args={[0.003, 8, 8]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      )}

      {/* Ambient Rear Bias Light (Halo Glow on Wall Behind TV) */}
      {!ghost && (
        <mesh position={[0, tvCenterY, -0.018]} rotation={[0, Math.PI, 0]} raycast={() => null}>
          <planeGeometry args={[tvW + 0.12, tvH + 0.12]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.16} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}


function ItemVisual({ item, ghost, activity, customColor }: { item: CatalogItem; ghost?: "valid" | "invalid"; activity?: string; customColor?: string }) {
  if (item.visual) return <LuxuryDecor visual={item.visual} size={item.size} ghost={ghost} tint={customColor ?? item.tint} activity={activity} />;
  if (item.id === "tv" || item.id.includes("tv")) return <FlatScreenTVOnStand size={item.size} ghost={ghost} activity={activity} />;
  if (item.kind === "wall") return <SunsetPainting size={item.size} ghost={ghost} />;
  return <FurnitureModel url={item.model!} size={item.size} yaw={item.yaw} ghost={ghost} customColor={customColor} />;
}


/** How far each layer lifts a piece (metres). */
const LAYER_STEP = 0.012;

function PlacedTransform({ item, placement, children }: { item: CatalogItem | { size: [number, number] }; placement: Placement; children: React.ReactNode }) {
  if (placement.kind === "wall") {
    const t = wallTransform(item.size, placement);
    return <group position={[t.x, t.y, t.z]} rotation={[0, t.yaw, 0]}>{children}</group>;
  }
  const c = floorCenter(item.size, placement);
  // Overlapping pieces: the higher layer sits a hair above, so it shows on top (a rug over a rug, a chair on a rug).
  return <group position={[c.x, (placement.layer ?? 0) * LAYER_STEP, c.z]} rotation={[0, -placement.rot * (Math.PI / 2), 0]}>{children}</group>;
}

// ---------- room shell ----------

const WALLS: Array<{ wall: Wall; normal: [number, number] }> = [
  { wall: "north", normal: [0, -1] },
  { wall: "south", normal: [0, 1] },
  { wall: "west", normal: [-1, 0] },
  { wall: "east", normal: [1, 0] },
];

function wallFrame(wall: Wall) {
  // Centre of the wall's inner face and the yaw that makes local +z point into the room.
  switch (wall) {
    case "north": return { position: [0, 0, -HALF] as const, yaw: 0 };
    case "south": return { position: [0, 0, HALF] as const, yaw: Math.PI };
    case "west": return { position: [-HALF, 0, 0] as const, yaw: Math.PI / 2 };
    case "east": return { position: [HALF, 0, 0] as const, yaw: -Math.PI / 2 };
  }
}

/** One wall with optional door / window cut-outs, drawn as solid segments. Local x runs along the wall. */
function WallSegments({ wall, color = "#f1e4cf", skirtingColor = "#e7d5b8", noDoor, panels, balcony }: { wall: Wall; color?: string; skirtingColor?: string; noDoor?: boolean; panels?: boolean; balcony?: boolean }) {
  const opening = wall === DOOR.wall && !noDoor ? { ...DOOR, bottom: 0, top: 2.2 }
    : wall === WINDOW.wall ? { ...WINDOW, bottom: 1.0, top: 2.3 }
    // Homes with a balcony: a glass door in the middle of the south wall.
    : wall === "south" && balcony ? { offset: GRID / 2 - 1, width: 2, bottom: 0, top: 2.3 } : null;
  // Wall-item offsets run along local +x from the left end as seen from inside the room.
  const toX = (offset: number) => -HALF + offset * CELL;
  const pieces: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
  if (!opening) {
    pieces.push({ x0: -HALF, x1: HALF, y0: 0, y1: WALL_HEIGHT });
  } else {
    const a = toX(opening.offset);
    const b = toX(opening.offset + opening.width);
    pieces.push({ x0: -HALF, x1: a, y0: 0, y1: WALL_HEIGHT });
    pieces.push({ x0: b, x1: HALF, y0: 0, y1: WALL_HEIGHT });
    pieces.push({ x0: a, x1: b, y0: opening.top, y1: WALL_HEIGHT });
    if (opening.bottom > 0) pieces.push({ x0: a, x1: b, y0: 0, y1: opening.bottom });
  }
  return (
    <>
      {pieces.map((p, i) => (
        <mesh key={i} position={[(p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, -WALL_THICKNESS / 2]} receiveShadow castShadow userData={{ wall: true }}>
          <boxGeometry args={[p.x1 - p.x0, p.y1 - p.y0, WALL_THICKNESS]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
      {/* Skirting board */}
      <mesh position={[0, 0.06, 0.01]}>
        <boxGeometry args={[ROOM_SIZE, 0.12, 0.03]} />
        <meshStandardMaterial color={skirtingColor} roughness={0.7} />
      </mesh>
      {panels && <Panelling pieces={pieces} color={color} trim={skirtingColor} />}
    </>
  );
}

/** Luxury walls: raised panels below a chair rail and above it, a crown moulding and a warm cove light. */
function Panelling({ pieces, color, trim }: { pieces: Array<{ x0: number; x1: number; y0: number; y1: number }>; color: string; trim: string }) {
  const raised = useMemo(() => {
    const c = new THREE.Color(color);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    return c.offsetHSL(0, 0, hsl.l > 0.5 ? -0.05 : 0.06).getStyle();
  }, [color]);
  const boxes: Array<{ x: number; w: number; y: number; h: number }> = [];
  for (const p of pieces) {
    if (p.y0 > 0) continue;
    const len = p.x1 - p.x0;
    const n = Math.max(1, Math.round(len / 1.15));
    if (len < 0.5) continue;
    const pw = len / n;
    for (let i = 0; i < n; i++) {
      const x = p.x0 + pw * (i + 0.5);
      boxes.push({ x, w: pw - 0.16, y: 0.55, h: 0.62 });
      if (p.y1 >= WALL_HEIGHT) boxes.push({ x, w: pw - 0.16, y: 1.95, h: 1.35 });
    }
  }
  return (
    <group>
      {boxes.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, 0.012]} raycast={() => null}>
          <boxGeometry args={[b.w, b.h, 0.025]} />
          <meshStandardMaterial color={raised} roughness={0.75} />
        </mesh>
      ))}
      {pieces.filter((p) => p.y0 === 0).map((p, i) => (
        <mesh key={`r${i}`} position={[(p.x0 + p.x1) / 2, 1.0, 0.02]} raycast={() => null}>
          <boxGeometry args={[p.x1 - p.x0, 0.05, 0.04]} />
          <meshStandardMaterial color={trim} roughness={0.5} metalness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, WALL_HEIGHT - 0.07, 0.05]} raycast={() => null}>
        <boxGeometry args={[ROOM_SIZE, 0.14, 0.1]} />
        <meshStandardMaterial color={trim} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT - 0.17, 0.08]} raycast={() => null}>
        <boxGeometry args={[ROOM_SIZE - 0.1, 0.025, 0.02]} />
        <meshStandardMaterial color="#ffd9a0" emissive="#ffc777" emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

function Door({ onOpen, interactive }: { onOpen?: () => void; interactive: boolean }) {
  const x = -HALF + (DOOR.offset + DOOR.width / 2) * CELL;
  return (
    <group
      position={[x, 1.1, -0.03]}
      onClick={(e) => { if (!interactive || e.delta > DRAG_THRESHOLD) return; e.stopPropagation(); onOpen?.(); }}
      onPointerOver={() => interactive && (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <mesh castShadow>
        <boxGeometry args={[DOOR.width * CELL - 0.06, 2.2, 0.06]} />
        <meshStandardMaterial color="#6b4423" roughness={0.6} />
      </mesh>
      <mesh position={[DOOR.width * CELL * 0.35, 0, 0.06]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#ca8a04" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
}

function Window() {
  const x = -HALF + (WINDOW.offset + WINDOW.width / 2) * CELL;
  const w = WINDOW.width * CELL;
  return (
    <group position={[x, 1.65, -WALL_THICKNESS / 2]}>
      <mesh>
        <planeGeometry args={[w, 1.3]} />
        <meshStandardMaterial color="#bae6fd" emissive="#7dd3fc" emissiveIntensity={0.35} transparent opacity={0.55} />
      </mesh>
      {[-w / 2, 0, w / 2].map((dx, i) => (
        <mesh key={i} position={[dx, 0, 0.02]}>
          <boxGeometry args={[0.06, 1.3, 0.06]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      ))}
      {[-0.65, 0.65].map((dy, i) => (
        <mesh key={i} position={[0, dy, 0.02]}>
          <boxGeometry args={[w + 0.06, 0.06, 0.06]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      ))}
    </group>
  );
}

interface ShellProps {
  hiddenWalls: Set<Wall>;
  wallTargeting: boolean;
  interactive: boolean;
  onWallPointer?: (wall: Wall, e: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>, click: boolean) => void;
  onDoor?: () => void;
  wallColor?: string;
  skirtingColor?: string;
  /** Upstairs: no front door. */
  upstairs?: boolean;
  panels?: boolean;
  /** A balcony beyond the south wall, reached through a glass door. */
  balcony?: boolean;
}

function RoomShell({ hiddenWalls, wallTargeting, interactive, onWallPointer, onDoor, wallColor, skirtingColor, upstairs, panels, balcony }: ShellProps) {
  return (
    <>
      {WALLS.map(({ wall }) => {
        const f = wallFrame(wall);
        const hidden = hiddenWalls.has(wall);
        return (
          <group key={wall} position={f.position as unknown as [number, number, number]} rotation={[0, f.yaw, 0]}>
            {hidden ? (
              // Cut-away wall: keep a low stub so the room outline stays readable.
              <mesh position={[0, 0.09, -WALL_THICKNESS / 2]} receiveShadow>
                <boxGeometry args={[ROOM_SIZE + WALL_THICKNESS * 2, 0.18, WALL_THICKNESS]} />
                <meshStandardMaterial color={skirtingColor ?? "#e7d5b8"} roughness={0.8} />
              </mesh>
            ) : (
              <>
                <WallSegments wall={wall} color={wallColor} skirtingColor={skirtingColor} noDoor={upstairs} panels={panels} balcony={balcony} />
                {wall === DOOR.wall && !upstairs && <Door onOpen={onDoor} interactive={interactive} />}
                {wall === WINDOW.wall && <Window />}
                {wallTargeting && (
                  <mesh
                    position={[0, WALL_HEIGHT / 2, 0.005]}
                    onPointerMove={(e) => onWallPointer?.(wall, e, false)}
                    onClick={(e) => onWallPointer?.(wall, e, true)}
                  >
                    <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
                    <meshBasicMaterial transparent opacity={0.08} color="#34d399" depthWrite={false} />
                  </mesh>
                )}
              </>
            )}
          </group>
        );
      })}
    </>
  );
}

/** The balcony beyond the glass door: a teak deck, a glass balustrade on a steel rail, and planters. */
function Balcony({ room, onFloorClick }: { room: RoomZone; onFloorClick?: (point: THREE.Vector3) => void }) {
  const { minX, maxX, minZ, maxZ } = room.bounds;
  const w = maxX - minX, d = maxZ - minZ, cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  return (
    <group>
      <mesh position={[cx, -0.02, cz]} receiveShadow onClick={(e) => { e.stopPropagation(); onFloorClick?.(e.point); }}>
        <boxGeometry args={[w, 0.08, d]} />
        <meshStandardMaterial color="#a47148" roughness={0.75} />
      </mesh>
      {Array.from({ length: Math.floor(w / 0.25) }, (_, i) => (
        <mesh key={i} position={[minX + 0.125 + i * 0.25, 0.021, cz]} raycast={() => null}>
          <boxGeometry args={[0.01, 0.002, d]} />
          <meshStandardMaterial color="#7c5230" />
        </mesh>
      ))}
      {([[cx, maxZ, w, 0], [minX, cz, d, Math.PI / 2], [maxX, cz, d, Math.PI / 2]] as const).map(([x, z, len, yaw], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, yaw, 0]}>
          <mesh position={[0, 0.55, 0]}><boxGeometry args={[len, 1.1, 0.03]} /><meshStandardMaterial color="#7dd3fc" transparent opacity={0.3} roughness={0.05} /></mesh>
          <mesh position={[0, 1.12, 0]}><boxGeometry args={[len + 0.04, 0.05, 0.07]} /><meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} /></mesh>
        </group>
      ))}
      {[minX + 0.35, maxX - 0.35].map((x) => (
        <group key={x} position={[x, 0, maxZ - 0.35]}>
          <mesh position={[0, 0.22, 0]} castShadow><boxGeometry args={[0.45, 0.44, 0.45]} /><meshStandardMaterial color="#e7e5e4" roughness={0.6} /></mesh>
          <mesh position={[0, 0.75, 0]} castShadow><sphereGeometry args={[0.32, 12, 10]} /><meshStandardMaterial color="#15803d" roughness={0.8} /></mesh>
        </group>
      ))}
    </group>
  );
}

function seeded(seed: number) {
  let x = seed;
  return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
}

/** Floor texture for a finish, drawn in code: planks, herringbone parquet, marble or travertine tiles. */
function useFloorTexture(finish: FloorFinish = "oak") {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    const rnd = seeded(7);
    let repeat = 2;
    const PLANKS: Partial<Record<FloorFinish, string[]>> = {
      oak: ["#c8935f", "#bf8954", "#cf9c68", "#b98250", "#c48f5b"],
      walnut: ["#5b3a24", "#4f321f", "#664229", "#563621", "#6b4630"],
      "white-oak": ["#e6d6bb", "#ddcbae", "#ebdcc3", "#d8c4a5", "#e2d1b4"],
      "grey-oak": ["#a8a198", "#9d968c", "#b1aaa1", "#958e84", "#a39c92"],
      teak: ["#a86b35", "#9a5f2e", "#b5763d", "#8f5729", "#a26632"],
    };
    if (PLANKS[finish]) {
      const tones = PLANKS[finish]!;
      const plank = 64;
      for (let row = 0; row < 512 / plank; row++) {
        let x = -((row * 97) % 220);
        while (x < 512) {
          const len = 160 + ((row * 31 + x) % 120);
          ctx.fillStyle = tones[Math.abs(row * 7 + x) % tones.length];
          ctx.fillRect(x, row * plank, len, plank);
          ctx.fillStyle = "rgba(30,18,8,0.35)";
          ctx.fillRect(x, row * plank, 2, plank);
          x += len;
        }
        ctx.fillStyle = "rgba(30,18,8,0.4)";
        ctx.fillRect(0, row * plank, 512, 2);
      }
    } else if (finish === "herringbone" || finish === "herringbone-white") {
      const white = finish === "herringbone-white";
      const tones = white ? ["#e8dcc6", "#dfd1b8", "#efe4cf", "#d9caae"] : ["#b98a57", "#a97a49", "#c4955f", "#b07f4d"];
      const L = 96, W = 24;
      ctx.fillStyle = tones[1];
      ctx.fillRect(0, 0, 512, 512);
      for (let y = -L; y < 512 + L; y += W * 2) {
        for (let x = -L; x < 512 + L; x += L) {
          for (const dir of [1, -1]) {
            ctx.save();
            ctx.translate(x + (dir === 1 ? 0 : L / 2), y + (dir === 1 ? 0 : W));
            ctx.rotate((dir * Math.PI) / 4);
            ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
            ctx.fillRect(0, 0, L * 0.71, W);
            ctx.strokeStyle = "rgba(50,30,12,0.45)";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(0, 0, L * 0.71, W);
            ctx.restore();
          }
        }
      }
      repeat = 3;
    } else {
      // Stone: large tiles with veining (marble) or pitted bands (travertine).
      // Stone: large tiles with veining (marbles), pitted bands (travertine), chips (terrazzo) or plain (slate).
      const STONE: Partial<Record<FloorFinish, [string, string]>> = {
        "green-marble": ["#1f4d3a", "rgba(225,240,230,0.55)"],
        "rose-marble": ["#e8c8c0", "rgba(150,95,85,0.45)"],
        terrazzo: ["#ece6dc", "rgba(0,0,0,0)"],
        slate: ["#3b3f45", "rgba(255,255,255,0.06)"],
      };
      const base = STONE[finish]?.[0] ?? (finish === "white-marble" ? "#f1efeb" : finish === "black-marble" ? "#17171a" : "#dfcfb3");
      const vein = STONE[finish]?.[1] ?? (finish === "white-marble" ? "rgba(120,120,130,0.45)" : finish === "black-marble" ? "rgba(235,235,235,0.55)" : "rgba(160,130,90,0.35)");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);
      if (finish === "terrazzo") {
        const chips = ["#c97b63", "#7a8b99", "#d9b44a", "#5e6b5a", "#ffffff", "#2f3133"];
        for (let i = 0; i < 900; i++) { ctx.fillStyle = chips[i % chips.length]; ctx.beginPath(); ctx.ellipse(rnd() * 512, rnd() * 512, 1.5 + rnd() * 5, 1 + rnd() * 3.5, rnd() * 3, 0, Math.PI * 2); ctx.fill(); }
      } else if (finish === "slate") {
        for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,255,255,${0.02 + rnd() * 0.04})`; ctx.fillRect(rnd() * 512, rnd() * 512, 40 + rnd() * 120, 2 + rnd() * 4); }
      } else if (finish === "travertine") {
        for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(170,140,100,${0.08 + rnd() * 0.12})`; ctx.fillRect(0, rnd() * 512, 512, 2 + rnd() * 8); }
        for (let i = 0; i < 260; i++) { ctx.fillStyle = "rgba(140,110,75,0.35)"; ctx.beginPath(); ctx.ellipse(rnd() * 512, rnd() * 512, 1 + rnd() * 4, 1 + rnd(), 0, 0, Math.PI * 2); ctx.fill(); }
      } else {
        for (let v = 0; v < 9; v++) {
          ctx.strokeStyle = vein;
          ctx.lineWidth = 0.6 + rnd() * 2.2;
          ctx.beginPath();
          let x = rnd() * 512, y = rnd() * 512;
          ctx.moveTo(x, y);
          for (let k = 0; k < 14; k++) { x += (rnd() - 0.3) * 70; y += (rnd() - 0.5) * 60; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
      ctx.strokeStyle = finish === "black-marble" ? "rgba(212,175,55,0.5)" : "rgba(0,0,0,0.18)";
      ctx.lineWidth = 2;
      for (let k = 0; k <= 512; k += 256) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, 512); ctx.moveTo(0, k); ctx.lineTo(512, k); ctx.stroke(); }
      repeat = 3.5;
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 8;
    return t;
  }, [finish]);
}

/** One floor of a two-storey home: its dividing walls (with doorways) and a tappable badge per room. */
function LevelPartitions({ def, upView, activeRoomId, onSelectRoom, onFloorClick, placingItem, wallColor, skirtingColor }: {
  def: LevelDef;
  upView?: boolean;
  activeRoomId?: string;
  onSelectRoom?: (id: string) => void;
  onFloorClick?: (point: THREE.Vector3) => void;
  placingItem?: boolean;
  wallColor: string;
  skirtingColor: string;
}) {
  const wallH = upView ? 1.15 : 2.6;
  const pieces = def.walls.flatMap((w) => {
    const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
    const ux = (w.b[0] - w.a[0]) / len, uz = (w.b[1] - w.a[1]) / len;
    const along = (t0: number, t1: number, y0: number, y1: number) => ({
      x: w.a[0] + ux * (t0 + t1) / 2, z: w.a[1] + uz * (t0 + t1) / 2, len: t1 - t0, y0, y1, yaw: Math.atan2(-uz, ux),
    });
    if (!w.door) return [along(0, len, 0, wallH)];
    const [d0, d1] = w.door;
    return [along(0, d0, 0, wallH), along(d1, len, 0, wallH), ...(wallH > 2.3 ? [along(d0, d1, 2.2, wallH)] : [])].filter((p) => p.len > 0.01);
  });
  return (
    <group>
      {pieces.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.yaw, 0]}>
          <mesh position={[0, (p.y0 + p.y1) / 2, 0]} receiveShadow castShadow userData={{ wall: true }}>
            <boxGeometry args={[p.len, p.y1 - p.y0, 0.12]} />
            <meshStandardMaterial color={wallColor} roughness={0.85} />
          </mesh>
          {p.y0 === 0 && (
            <mesh position={[0, 0.06, 0]}>
              <boxGeometry args={[p.len, 0.12, 0.15]} />
              <meshStandardMaterial color={skirtingColor} roughness={0.7} />
            </mesh>
          )}
        </group>
      ))}
      {def.rooms.map((r) => {
        const isSelected = activeRoomId === r.id;
        return (
          <group
            key={r.id}
            position={[r.center[0], 0.03, r.center[2]]}
            onClick={(e) => {
              if (placingItem) return;
              e.stopPropagation();
              onFloorClick?.(new THREE.Vector3(r.center[0], 0, r.center[2]));
              onSelectRoom?.(r.id);
            }}
            onPointerOver={() => { document.body.style.cursor = "pointer"; }}
            onPointerOut={() => { document.body.style.cursor = ""; }}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.35, 0.48, 32]} />
              <meshBasicMaterial color={isSelected ? "#10b981" : "#38bdf8"} transparent opacity={isSelected ? 0.7 : 0.25} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ---------- camera ----------

/** Swings the orbit camera a quarter turn whenever `turns` changes, and reports which walls face the camera. */
function CameraRig({
  turns,
  upView,
  viewDistance,
  targetPos,
  follow,
  followYaw = 0,
  inside,
  eye = false,
  panTarget,
  panNudgeRef,
  onHiddenWallsChange,
}: {
  turns: number;
  upView?: boolean;
  viewDistance?: number;
  targetPos?: [number, number, number];
  /** Where the citizen is: the camera follows them from room to room. */
  follow?: [number, number, number];
  followYaw?: number;
  inside?: boolean;
  /** First person: the camera at the citizen's eyes. */
  eye?: boolean;
  /** Outdoor zone camera target selected from the Plot Scroll Bar. */
  panTarget?: [number, number] | null;
  /** Side-to-side camera scroll nudge (◀ / ▶). */
  panNudgeRef?: React.MutableRefObject<{ dx: number; dz: number } | null>;
  onHiddenWallsChange: (walls: Set<Wall>) => void;
}) {
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const lastTurns = useRef(turns);
  const swing = useRef<{ from: number; to: number; t: number } | null>(null);
  const lastKey = useRef("");

  // Re-aim and adjust camera whenever the view mode (above, inside, eye) or screen changes.
  useEffect(() => {
    if (!controls) return;
    const cam = camera as THREE.PerspectiveCamera;
    const fov = eye && follow ? EYE_FOV : 35;
    // eslint-disable-next-line react-hooks/immutability -- the three.js camera is changed in place
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    if (eye && follow) {
      // Eyes: first-person, camera at eye height looking forward
      controls.target.set(follow[0] + Math.sin(followYaw) * 0.01, 1.62, follow[2] + Math.cos(followYaw) * 0.01);
      camera.position.set(follow[0] - Math.sin(followYaw) * EYE_BACK, 1.68, follow[2] - Math.cos(followYaw) * EYE_BACK);
      controls.update();
      return;
    }

    if (inside && follow) {
      // Inside: over-the-shoulder view of the citizen in the room
      controls.target.set(follow[0], 1.45, follow[2]);
      camera.position.set(follow[0] - Math.sin(followYaw) * 6.0, 3.6, follow[2] - Math.cos(followYaw) * 6.0);
      controls.update();
      return;
    }

    // Above: ALWAYS restore the proper isometric overview looking down into the room from above!
    const t = targetPos ?? DEFAULT_ORBIT_TARGET;
    controls.target.set(t[0], t[1], t[2]);
    const dist = viewDistance ?? (size.width / size.height < 0.8 ? 19 : 14);
    const angle = turns * (Math.PI / 2) + Math.PI / 4;
    const elev = upView ? 0.92 : 0.68;
    const horiz = Math.sqrt(Math.max(0.01, 1 - elev * elev));
    camera.position.set(
      t[0] + Math.cos(angle) * horiz * dist,
      t[1] + elev * dist,
      t[2] + Math.sin(angle) * horiz * dist
    );
    controls.update();
    // Re-aim only when the mode, turns, or screen changes, not every step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, camera, size.width, size.height, inside, eye, viewDistance, upView, turns]);
  // Where the citizen was last frame, so the camera can move along with them.
  const lastFollow = useRef<[number, number, number] | null>(null);
  // Walls faded because they stand between the camera and the citizen (inside view).
  const faded = useRef(new Set<THREE.Mesh>());
  const rayRef = useRef(new THREE.Raycaster());
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    if (!controls || turns === lastTurns.current) return;
    const from = controls.getAzimuthalAngle();
    swing.current = { from, to: from + (turns - lastTurns.current) * (Math.PI / 2), t: 0 };
    lastTurns.current = turns;
  }, [turns, controls]);

  useFrame((_, dt) => {
    if (!controls) return;

    if (eye && follow) {
      // Eyes move with you; where you look stays yours.
      const head = new THREE.Vector3(follow[0], 1.62, follow[2]);
      const shift = head.clone().sub(controls.target);
      controls.target.add(shift);
      camera.position.add(shift);
      controls.update();
      return;
    }
    if (inside && follow) {
      // Over the shoulder: aim at the citizen's head; while they walk, settle in behind them.
      const head = new THREE.Vector3(follow[0], 1.45, follow[2]);
      const moved = lastFollow.current ? Math.hypot(follow[0] - lastFollow.current[0], follow[2] - lastFollow.current[2]) : 0;
      const shift = head.clone().sub(controls.target);
      controls.target.add(shift);
      camera.position.add(shift);
      if (moved > 0.0005) {
        const behind = new THREE.Vector3(follow[0] - Math.sin(followYaw) * 6, 3.6, follow[2] - Math.cos(followYaw) * 6);
        camera.position.lerp(behind, Math.min(1, dt * 2.5));
      }
      lastFollow.current = follow;
      controls.update();
      // Any wall between the camera and the citizen turns see-through while it's in the way.
      const walls: THREE.Mesh[] = [];
      scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.userData.wall) walls.push(o as THREE.Mesh); });
      // Lines from the camera to the head, both shoulders, the waist and the feet: a wall crossing any of them
      // hides part of the citizen or the room just beyond them.
      const ray = rayRef.current;
      const side = new THREE.Vector3().subVectors(head, camera.position).setY(0).normalize().cross(new THREE.Vector3(0, 1, 0)).multiplyScalar(0.7);
      const aims = [head, head.clone().add(side), head.clone().sub(side), new THREE.Vector3(follow[0], 0.9, follow[2]), new THREE.Vector3(follow[0], 0.1, follow[2])];
      const blocking = new Set<THREE.Mesh>();
      for (const aim of aims) {
        const toAim = aim.clone().sub(camera.position);
        ray.set(camera.position, toAim.clone().normalize());
        ray.far = toAim.length() - 0.3;
        for (const h of ray.intersectObjects(walls, false)) blocking.add(h.object as THREE.Mesh);
      }
      for (const m of blocking) {
        const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial | undefined;
        if (!mat) continue;
        if (!faded.current.has(m)) { mat.transparent = true; mat.depthWrite = false; mat.needsUpdate = true; faded.current.add(m); }
        mat.opacity += (0.12 - mat.opacity) * Math.min(1, dt * 8);
      }
      for (const m of [...faded.current]) {
        if (blocking.has(m)) continue;
        const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial | undefined;
        if (!mat) continue;
        mat.opacity += (1 - mat.opacity) * Math.min(1, dt * 6);
        if (mat.opacity > 0.98) { mat.opacity = 1; mat.transparent = false; mat.depthWrite = true; mat.needsUpdate = true; faded.current.delete(m); }
      }
    } else if (panNudgeRef?.current && (Math.abs(panNudgeRef.current.dx) > 0.01 || Math.abs(panNudgeRef.current.dz) > 0.01)) {
      // Side-to-side manual scroll nudge (◀ / ▶) across the villa plot
      const stepX = panNudgeRef.current.dx;
      const stepZ = panNudgeRef.current.dz;
      panNudgeRef.current.dx = 0;
      panNudgeRef.current.dz = 0;
      const right = new THREE.Vector3().subVectors(controls.target, camera.position).setY(0).normalize().cross(new THREE.Vector3(0, 1, 0));
      const shiftX = THREE.MathUtils.clamp(controls.target.x + right.x * stepX + stepZ * 0.5, -16, 16) - controls.target.x;
      const shiftZ = THREE.MathUtils.clamp(controls.target.z + right.z * stepX + stepZ * 0.5, -13, 16) - controls.target.z;
      controls.target.x += shiftX;
      controls.target.z += shiftZ;
      camera.position.x += shiftX;
      camera.position.z += shiftZ;
    } else if (panTarget) {
      // Smoothly glide camera over to the selected outdoor zone (Pool, Garden, BBQ, Majlis, Car Park, or House)
      const k = Math.min(1, dt * 4.5);
      const dx = (panTarget[0] - controls.target.x) * k;
      const dy = (0.8 - controls.target.y) * k;
      const dz = (panTarget[1] - controls.target.z) * k;
      controls.target.x += dx;
      controls.target.y += dy;
      controls.target.z += dz;
      camera.position.x += dx;
      camera.position.z += dz;
    } else if (follow && !upView) {
      // Above: follow the citizen while they are actively walking, leaving the camera free to pan when standing still.
      const moved = lastFollow.current ? Math.hypot(follow[0] - lastFollow.current[0], follow[2] - lastFollow.current[2]) : 1;
      lastFollow.current = follow;
      if (moved > 0.001) {
        const k = Math.min(1, dt * 4);
        const dx = (follow[0] - controls.target.x) * k, dz = (follow[2] - controls.target.z) * k;
        controls.target.x += dx; controls.target.z += dz;
        camera.position.x += dx; camera.position.z += dz;
      }
    } else if (targetPos) {
      // Smooth gliding towards the active room (or the middle, from above)
      const lerpFactor = Math.min(1, dt * 5.0);
      const dx = (targetPos[0] - controls.target.x) * lerpFactor;
      const dy = (targetPos[1] - controls.target.y) * lerpFactor;
      const dz = (targetPos[2] - controls.target.z) * lerpFactor;
      controls.target.x += dx;
      controls.target.y += dy;
      controls.target.z += dz;
      camera.position.x += dx;
      camera.position.z += dz;
    }

    if (upView && Math.abs(camera.position.y - 15.0) > 0.05) {
      camera.position.y += (15.0 - camera.position.y) * Math.min(1, dt * 3.5);
    }
    controls.update();

    const s = swing.current;
    if (s) {
      s.t = Math.min(1, s.t + dt / 0.45);
      const k = 1 - Math.pow(1 - s.t, 3);
      const az = s.from + (s.to - s.from) * k;
      const offset = camera.position.clone().sub(controls.target);
      const sph = new THREE.Spherical().setFromVector3(offset);
      sph.theta = az;
      offset.setFromSpherical(sph);
      camera.position.copy(controls.target).add(offset);
      controls.update();
      if (s.t >= 1) swing.current = null;
    }

    // Hide walls standing between the camera and what it's looking at.
    const cx = camera.position.x - (inside ? 0 : controls.target.x * 0.3);
    const cz = camera.position.z - (inside ? 0 : controls.target.z * 0.3);
    const len = Math.hypot(cx, cz) || 1;
    const hidden = new Set<Wall>();
    // Inside, only a wall the camera has backed up against (or through) is cut away; from above, the near ones.
    for (const { wall, normal } of WALLS) {
      if (inside ? cx * normal[0] + cz * normal[1] > HALF - 0.7 : (cx * normal[0] + cz * normal[1]) / len > 0.25) hidden.add(wall);
    }
    const key = [...hidden].sort().join(",");
    if (key !== lastKey.current) {
      lastKey.current = key;
      onHiddenWallsChange(hidden);
    }
  });

  return null;
}

// ---------- scene ----------

function RoomScene({
  look,
  myAnimation,
  startAt,
  onMove,
  seatCall,
  fixtureCall,
  activity,
  ownCar,
  groundsCall,
  holding,
  dirty,
  using,
  stick,
  stickRun = false,
  furniture: ownFurniture = [],
  placing,
  decorating,
  turns = 0,
  housingTier = "studio",
  upView = false,
  viewDistance,
  view = "above",
  activeRoomId,
  onSelectRoom,
  onGhostChange,
  onPlace,
  onPickUp,
  onPlaceBlocked,
  onInteractObject,
  onUseFixture,
  level = 0,
  onChangeLevel,
  homeStyle,
  partyDecor,
  people = [],
  labels,
  panTarget,
  panNudgeRef,
  walkRequestRef,
  isDraggingItem,
  setIsDraggingItem,
}: ApartmentRoomProps & {
  labels: LabelNodes;
  panTarget?: [number, number] | null;
  panNudgeRef?: React.MutableRefObject<{ dx: number; dz: number } | null>;
  walkRequestRef?: React.MutableRefObject<((x: number, z: number) => void) | null>;
  isDraggingItem?: boolean;
  setIsDraggingItem?: (dragging: boolean) => void;
}) {
  const config = HOUSING_CONFIGS[housingTier] ?? HOUSING_CONFIGS.studio;
  // Two-storey homes show one floor at a time; everything else is a single floor 0.
  const levelDef = config.levels ? config.levels[Math.min(level, config.levels.length - 1)] : undefined;
  const lvl = levelDef ? Math.min(level, config.levels!.length - 1) : 0;
  const rooms = levelDef?.rooms ?? config.rooms;
  const style = homeStyle ?? config.finish;
  const floorTexture = useFloorTexture(style.floor);
  // Everything in the room, including what came with it, can be moved.
  const furniture = useMemo(() => withHomeItems(ownFurniture, housingTier), [ownFurniture, housingTier]);
  // The staircase (two-storey homes): where its foot and top are on each floor.
  const stairs = useMemo(() => {
    const f = furniture.find((x) => getCatalogItem(x.itemId)?.visual === "staircase" && x.placement?.kind === "floor");
    if (!f || f.placement?.kind !== "floor") return null;
    const item = getCatalogItem(f.itemId)!;
    const c = floorCenter(item.size, f.placement);
    const d = rotatedSize(item.size, f.placement.rot)[1] * CELL;
    return { x: c.x, foot: c.z + d / 2 + 0.35, bottom: c.z + d / 2, top: c.z - d / 2, landing: c.z - d / 2 - 0.4 };
  }, [furniture]);
  const [hiddenWalls, setHiddenWalls] = useState<Set<Wall>>(new Set(["south", "east"]));
  // Where the user last pointed the item being placed (cleared by switching items).
  const [moved, setMoved] = useState<{ uid: string; placement: Placement } | null>(null);
  const [animation, setAnimation] = useState<AvatarAnimation>("idle");
  const handleLocomotionRef = useRef<((point: THREE.Vector3) => void) | null>(null);
  // Listen for interactive room actions (rocking dance, slap, brawl, gang beat, money spraying)
  useEffect(() => {
    const onRoomAction = (ev: Event) => {
      const detail = (ev as CustomEvent<{ event?: { type?: string } }>).detail;
      const t = detail?.event?.type;
      if (!t) return;
      if (t === "rock") {
        const other = people[0];
        if (other) {
          const dx = poseRef.current.position[0] - other.position[0];
          const dz = poseRef.current.position[2] - other.position[2];
          const d = Math.hypot(dx, dz) || 1;
          const spotX = other.position[0] + (dx / d) * 0.46;
          const spotZ = other.position[2] + (dz / d) * 0.46;
          handleLocomotionRef.current?.(new THREE.Vector3(spotX, 0, spotZ));
          // Face away from partner so backside is against their waistline
          const faceYaw = Math.atan2(spotX - other.position[0], spotZ - other.position[2]);
          setTimeout(() => {
            setPose((prev) => ({ ...prev, yaw: faceYaw }));
            setAnimation("rock_female");
            setTimeout(() => setAnimation("idle"), 60000);
          }, 1200);
          return;
        }
        setAnimation("rock_female");
        setTimeout(() => setAnimation("idle"), 60000);
      } else if (t === "slap") {
        const other = people[0];
        if (other) {
          const dx = poseRef.current.position[0] - other.position[0];
          const dz = poseRef.current.position[2] - other.position[2];
          const d = Math.hypot(dx, dz) || 1;
          const spotX = other.position[0] + (dx / d) * 0.55;
          const spotZ = other.position[2] + (dz / d) * 0.55;
          handleLocomotionRef.current?.(new THREE.Vector3(spotX, 0, spotZ));
          const faceYaw = Math.atan2(other.position[0] - spotX, other.position[2] - spotZ);
          setTimeout(() => {
            setPose((prev) => ({ ...prev, yaw: faceYaw }));
            setAnimation("slap");
            setTimeout(() => setAnimation("idle"), 2200);
          }, 1200);
          return;
        }
        setAnimation("slap");
        setTimeout(() => setAnimation("idle"), 2200);
      } else if (t === "brawl" || t === "gang_beat") {
        const other = people[0];
        if (other) {
          const dx = poseRef.current.position[0] - other.position[0];
          const dz = poseRef.current.position[2] - other.position[2];
          const d = Math.hypot(dx, dz) || 1;
          const spotX = other.position[0] + (dx / d) * 0.65;
          const spotZ = other.position[2] + (dz / d) * 0.65;
          handleLocomotionRef.current?.(new THREE.Vector3(spotX, 0, spotZ));
          const faceYaw = Math.atan2(other.position[0] - spotX, other.position[2] - spotZ);
          setTimeout(() => {
            setPose((prev) => ({ ...prev, yaw: faceYaw }));
            setAnimation("fight");
            setTimeout(() => setAnimation("idle"), 7500);
          }, 1200);
          return;
        }
        setAnimation("fight");
        setTimeout(() => setAnimation("idle"), 7500);
      } else if (t === "spray_money") {
        const other = people[0];
        if (other) {
          const dx = poseRef.current.position[0] - other.position[0];
          const dz = poseRef.current.position[2] - other.position[2];
          const d = Math.hypot(dx, dz) || 1;
          const spotX = other.position[0] + (dx / d) * 0.70;
          const spotZ = other.position[2] + (dz / d) * 0.70;
          handleLocomotionRef.current?.(new THREE.Vector3(spotX, 0, spotZ));
          const faceYaw = Math.atan2(other.position[0] - spotX, other.position[2] - spotZ);
          setTimeout(() => {
            setPose((prev) => ({ ...prev, yaw: faceYaw }));
            setAnimation("spray_money");
            setTimeout(() => setAnimation("idle"), 4500);
          }, 1200);
          return;
        }
        setAnimation("spray_money");
        setTimeout(() => setAnimation("idle"), 4500);
      }
    };
    window.addEventListener("cometodubai:room-action", onRoomAction);
    return () => window.removeEventListener("cometodubai:room-action", onRoomAction);
  }, [look?.gender]);
  // Walking, talking, interactive party/combat animations, or sitting / lying on a piece of furniture shows that; otherwise what the page asks for (dancing).
  const shown: AvatarAnimation =
    animation === "walk" ||
    animation === "talk" ||
    animation === "sit" ||
    animation === "sleep" ||
    animation === "rock_female" ||
    animation === "rock_male" ||
    animation === "slap" ||
    animation === "fight" ||
    animation === "box" ||
    animation === "spray_money" ||
    !myAnimation
      ? animation
      : myAnimation;
  const shownSleep = shown === "sleep";
  const [pose, setPose] = useState<Pose>(() => (startAt ? { position: [startAt[0], 0, startAt[1]], yaw: Math.PI / 4 } : STAND));
  const [walkTarget, setWalkTarget] = useState<[number, number] | null>(null);
  // Others in the room see where you are.
  const moveRef = useRef(onMove);
  useEffect(() => { moveRef.current = onMove; }, [onMove]);
  // Only two updates a walk, to keep live traffic low: where you're heading when you set off, and where you stopped.
  // Everyone else's screen walks you there in between.
  // Steering with the stick right now, and when the room was last told where I am.
  const steering = useRef(false);
  const lastSteerReport = useRef(0);
  const poseRef = useRef(pose);
  useEffect(() => { poseRef.current = pose; }, [pose]);
  const walkingNow = animation === "walk";
  useEffect(() => {
    if (walkTarget) moveRef.current?.(walkTarget[0], walkTarget[1], poseRef.current.yaw, true);
  }, [walkTarget]);
  // Stopped, sat down on something or got up: where I am now (raised onto the seat, and sitting or lying there).
  const restNow = animation === "sit" || animation === "sleep" ? animation : undefined;
  useEffect(() => {
    if (!walkingNow) moveRef.current?.(poseRef.current.position[0], poseRef.current.position[2], poseRef.current.yaw, false, restNow ? poseRef.current.position[1] : 0, restNow);
  }, [walkingNow, restNow]);
  // The route there: round walls and furniture, through doorways (see homeNav.ts).
  const routeRef = useRef<{ for: [number, number]; points: Array<[number, number]> } | null>(null);
  // The kitchen and bathroom on this floor, and the bathroom's walls.
  const fixtures = useMemo(() => fixturesFor(housingTier, lvl), [housingTier, lvl]);
  const fixtureWalls = useMemo(() => fixtureWallsFor(housingTier, lvl), [housingTier, lvl]);
  const nav = useMemo(() => {
    const plotGround = hasPlot(housingTier) && lvl === 0;
    // The whole floor (and the outdoor villa plot on the ground floor so players & party guests can walk out through the doors).
    const roomRects: Rect[] = [
      { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
      ...(rooms ?? []).filter((r) => r.id === "balcony").map((r) => r.bounds),
      ...(plotGround ? [{ minX: -16.2, maxX: 16.2, minZ: -12.2, maxZ: 16.2 }] : []),
    ];
    const walls: Seg[] = [...(levelDef ? levelDef.walls : config.walls ?? [])];
    // The south wall, with its glass door out to the balcony or garden/pool.
    if (rooms?.some((r) => r.id === "balcony") || plotGround) {
      walls.push({ a: [-HALF, HALF], b: [HALF, HALF], door: [HALF - 0.75, HALF + 0.75] });
    }
    if (plotGround) {
      // Outer house walls on the ground floor: north & east are solid; west has the front door at z=0 ([4.25, 5.75]).
      walls.push(
        { a: [-HALF, -HALF], b: [HALF, -HALF] },
        { a: [HALF, -HALF], b: [HALF, HALF] },
        { a: [-HALF, -HALF], b: [-HALF, HALF], door: [HALF - 0.75, HALF + 0.75] },
      );
    }
    walls.push(...fixtureWalls);
    const blocks: Rect[] = [
      ...(levelDef ? [] : config.blocks ?? []),
      ...fixtures.map(fixtureRect),
      // Keep walkers from walking straight over the deep pool water (tapping the pool swims in it)
      ...(plotGround && (style.exterior ?? []).includes("pool")
        ? [{ minX: GROUNDS.pool.x - GROUNDS.pool.w / 2, maxX: GROUNDS.pool.x + GROUNDS.pool.w / 2, minZ: GROUNDS.pool.z - GROUNDS.pool.l / 2, maxZ: GROUNDS.pool.z + GROUNDS.pool.l / 2 }]
        : []),
    ];
    for (const f of withHomeItems(furniture, housingTier)) {
      if (f.placement?.kind !== "floor" || levelOf(f.placement) !== lvl) continue;
      const item = getCatalogItem(f.itemId);
      // Rugs and mats are walked over.
      if (!item || item.kind === "rug" || item.kind === "ceiling") continue;
      const [w, d] = rotatedSize(item.size, f.placement.rot);
      const c = floorCenter(item.size, f.placement);
      blocks.push({ minX: c.x - (w * CELL) / 2, maxX: c.x + (w * CELL) / 2, minZ: c.z - (d * CELL) / 2, maxZ: c.z + (d * CELL) / 2 });
    }
    return buildNav(roomRects, walls, blocks);
  }, [rooms, levelDef, config, furniture, housingTier, lvl, fixtures, fixtureWalls, style.exterior]);
  const [clickBeacon, setClickBeacon] = useState<{ x: number; z: number; time: number } | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: Interaction; rest?: RestPose; fixture?: Fixture } | null>(null);
  const avatarHeight = look?.gender === "man" ? 1.8 : 1.68;
  /** Gets up from a seat or bed (to its stand spot) before walking anywhere. */
  const getUp = () => setPose((p) => (p.stand ? { position: [p.stand[0], 0, p.stand[1]], yaw: p.yaw } : p));
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Going up or down the stairs: from one point to another, then onto the other floor.
  const climbRef = useRef<{ from: [number, number, number]; to: [number, number, number]; yaw: number; t: number; next: number } | null>(null);

  const currentRoom = useMemo(() => {
    if (rooms && rooms.length > 0) {
      return rooms.find((r) => r.id === activeRoomId) ?? rooms[0];
    }
    return undefined;
  }, [rooms, activeRoomId]);

  // Arriving on another floor (by the stairs or the floor switcher): stand at the stairs on that floor.
  const [shownLevel, setShownLevel] = useState(lvl);
  if (shownLevel !== lvl) {
    setShownLevel(lvl);
    if (stairs) {
      setWalkTarget(null);
      setPendingAction(null);
      setPose(lvl > 0 ? { position: [stairs.x, 0, stairs.landing], yaw: Math.PI } : { position: [stairs.x, 0, stairs.foot], yaw: 0 });
      setAnimation("idle");
    }
  }

  const targetPos = useMemo<[number, number, number] | undefined>(() => {
    if (upView) return [0, 0.4, 0];
    if (currentRoom) return currentRoom.center;
    return undefined;
  }, [upView, currentRoom]);

  // Click-to-walk destination locomotion (supports walking out through the doors onto the villa plot!)
  const handleFloorLocomotion = (point: THREE.Vector3) => {
    if (busy || climbRef.current) return;
    const plotGround = hasPlot(housingTier) && lvl === 0;
    const clampedX = plotGround
      ? Math.max(-15.8, Math.min(15.8, point.x))
      : Math.max(-HALF + 0.3, Math.min(HALF - 0.3, point.x));
    const clampedZ = plotGround
      ? Math.max(-11.8, Math.min(15.8, point.z))
      : Math.max(-HALF + 0.3, Math.min(HALF + (rooms?.some((r) => r.id === "balcony") ? 1.6 : -0.3), point.z));

    if (animTimer.current) {
      clearTimeout(animTimer.current);
      animTimer.current = null;
    }
    setPendingAction(null);
    getUp();
    setWalkTarget([clampedX, clampedZ]);
    setClickBeacon({ x: clampedX, z: clampedZ, time: performance.now() });

    if (rooms && rooms.length > 0) {
      const matched = rooms.find(
        (r) =>
          clampedX >= r.bounds.minX &&
          clampedX <= r.bounds.maxX &&
          clampedZ >= r.bounds.minZ &&
          clampedZ <= r.bounds.maxZ
      );
      if (matched && matched.id !== activeRoomId) {
        onSelectRoom?.(matched.id);
      }
    }
  };
  handleLocomotionRef.current = handleFloorLocomotion;

  useEffect(() => {
    if (currentRoom) {
      setWalkTarget([currentRoom.center[0], currentRoom.center[2]]);
      setClickBeacon({ x: currentRoom.center[0], z: currentRoom.center[2], time: performance.now() });
    }
  }, [currentRoom]);

  // Smooth frame locomotion update
  useFrame(({ camera }, dt) => {
    // The stick: steer the way it points (relative to the camera); blocked by furniture or a wall, slide along it.
    const sx = stick?.current.x ?? 0, sy = stick?.current.y ?? 0, mag = Math.min(1, Math.hypot(sx, sy));
    if (mag > 0.04 && !placing && !decorating && !climbRef.current) {
      if (walkTarget) { setWalkTarget(null); setClickBeacon(null); }
      routeRef.current = null;
      if (pendingAction) setPendingAction(null);
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      // Inside a home or venue: strictly walking speed (no running indoors).
      const sprint = false;
      const l = Math.hypot(sx, sy), speed = 1.7 * mag;
      const vx = ((fwd.x * sy + right.x * sx) / l) * speed, vz = ((fwd.z * sy + right.z * sx) / l) * speed;
      // Sitting or lying: up first.
      const [cx, , cz] = pose.stand ? [pose.stand[0], 0, pose.stand[1]] : pose.position;
      const nx = cx + vx * Math.min(dt, 0.05), nz = cz + vz * Math.min(dt, 0.05);
      let px = cx, pz = cz;
      if (walkable(nav, nx, nz)) { px = nx; pz = nz; }
      else if (walkable(nav, nx, cz)) px = nx;
      else if (walkable(nav, cx, nz)) pz = nz;
      const want = Math.atan2(vx, vz);
      let diff = want - pose.yaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const yaw = pose.yaw + diff * Math.min(1, dt * 12);
      setPose({ position: [px, 0, pz], yaw });
      const mode = sprint ? "run" : "walk";
      if (animation !== mode) setAnimation(mode);
      steering.current = true;
      const now = performance.now();
      if (now - lastSteerReport.current > 800) { lastSteerReport.current = now; moveRef.current?.(px, pz, yaw, true); }
      return;
    }
    if (steering.current) { steering.current = false; setAnimation("idle"); }
    const climb = climbRef.current;
    if (climb) {
      climb.t = Math.min(1, climb.t + dt / 1.8);
      const k = climb.t;
      setPose({ position: [climb.from[0] + (climb.to[0] - climb.from[0]) * k, climb.from[1] + (climb.to[1] - climb.from[1]) * k, climb.from[2] + (climb.to[2] - climb.from[2]) * k], yaw: climb.yaw });
      if (climb.t >= 1) {
        climbRef.current = null;
        onChangeLevel?.(climb.next);
      }
      return;
    }
    if (walkTarget) {
      const curX = pose.position[0];
      const curZ = pose.position[2];
      // A new destination: plan the route from here.
      if (routeRef.current?.for !== walkTarget) {
        const points = findPath(nav, [curX, curZ], walkTarget);
        routeRef.current = { for: walkTarget, points: points.length ? points : [[curX, curZ]] };
      }
      const route = routeRef.current.points;
      // Reached a corner of the route: on to the next one.
      if (route.length > 1 && Math.hypot(route[0][0] - curX, route[0][1] - curZ) < 0.12) route.shift();
      const next = route[0];
      const dx = next[0] - curX;
      const dz = next[1] - curZ;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.08 || route.length > 1) {
        const targetYaw = Math.atan2(dx, dz);
        let diff = targetYaw - pose.yaw;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const newYaw = pose.yaw + diff * Math.min(1, dt * 14);

        const walkSpeed = 2.4;
        const step = Math.min(dist, dt * walkSpeed);
        const nextX = curX + (dx / dist) * step;
        const nextZ = curZ + (dz / dist) * step;

        setPose({ position: [nextX, 0, nextZ], yaw: newYaw });
        if (animation !== "walk") setAnimation("walk");
      } else {
        // Where the route ends: the spot itself, or as near as it can be reached.
        const finalX = next[0];
        const finalZ = next[1];
        routeRef.current = null;
        setWalkTarget(null);
        setClickBeacon(null);

        if (pendingAction) {
          const act = pendingAction;
          setPendingAction(null);
          if (animTimer.current) clearTimeout(animTimer.current);
          if (act.fixture) {
            // At the fixture: face it and get on with it.
            const spot = fixtureSpot(act.fixture);
            setPose({ position: [finalX, 0, finalZ], yaw: spot.yaw });
            setAnimation("talk");
            onUseFixture?.(act.fixture);
          } else if (act.type === "stairs" && stairs) {
            // Up the treads to the top, or down through the stairwell to the hall.
            const up = lvl === 0;
            climbRef.current = up
              ? { from: [stairs.x, 0, stairs.bottom], to: [stairs.x, 3, stairs.top], yaw: Math.PI, t: 0, next: lvl + 1 }
              : { from: [stairs.x, 0, stairs.top], to: [stairs.x, -1.4, stairs.top + 1.2], yaw: 0, t: 0, next: lvl - 1 };
            setAnimation("walk");
          } else if (act.rest) {
            // Sit down or lie down, and stay there until the player taps somewhere else.
            const r = act.rest;
            setPose({ position: r.position, yaw: r.yaw, lie: r.lie, stand: r.stand });
            setAnimation(r.lie ? "sleep" : "sit");
          } else {
            setPose({ position: [finalX, 0, finalZ], yaw: pose.yaw });
            setAnimation("wave");
            animTimer.current = setTimeout(() => setAnimation("idle"), 3500);
          }
        } else {
          setPose({ position: [finalX, 0, finalZ], yaw: pose.yaw });
          setAnimation("idle");
        }
      }
    }
  });

  const placingItem = placing ? getCatalogItem(placing.itemId) ?? null : null;
  const busy = !!placing || !!decorating;

  // The layer chosen while placing (Bring forward / Send back) goes with the piece.
  const placingLayer = placing?.layer ?? 0;
  const withLayer = (p: Placement): Placement => (p.kind === "floor" ? { ...p, layer: placingLayer || undefined } : p);
  // The ghost starts where the item already is (or the nearest free spot), follows the pointer,
  // and keeps its centre when rotated.
  const ghost = useMemo<Placement | null>(() => {
    if (!placing || !placingItem) return null;
    const layered = (p: Placement): Placement => (p.kind === "floor" ? { ...p, layer: placingLayer || undefined } : p);
    const base = moved?.uid === placing.uid ? moved.placement : furniture.find((f) => f.uid === placing.uid)?.placement;
    if (base && levelOf(base) === lvl && base.kind === (placingItem.kind === "wall" ? "wall" : "floor")) {
      return layered(base.kind === "floor" ? floorPlacementAt(placingItem.size, placing.rot, floorCenter(placingItem.size, base), lvl) : base);
    }
    const others = furniture.filter((f) => f.uid !== placing.uid);
    return layered(findFreePlacement(placingItem, others, placingItem.kind === "wall" ? undefined : placing.rot, lvl)
      ?? (placingItem.kind === "wall" ? { kind: "wall", wall: "north", offset: 1, ...(lvl ? { level: lvl } : {}) } : floorPlacementAt(placingItem.size, placing.rot, { x: 0, z: 0.5 }, lvl)));
  }, [placing, placingItem, moved, furniture, lvl, placingLayer]);

  const ghostValid = !!(ghost && placingItem && isPlacementValid(placingItem, ghost, furniture, placing?.uid, true));

  // Reset moved placement and dragging status whenever placing finishes or changes item
  useEffect(() => {
    if (!placing) {
      setMoved(null);
      setIsDraggingItem?.(false);
    } else if (moved && moved.uid !== placing.uid) {
      setMoved(null);
    }
  }, [placing?.uid]);

  // Report candidate placement (ghost) and its validity to parent so Done button can finalize
  useEffect(() => {
    if (placing && ghost) {
      onGhostChange?.({ placement: ghost, isValid: ghostValid });
    } else {
      onGhostChange?.(null);
    }
  }, [placing, ghost, ghostValid, onGhostChange]);

  const isPointerDownRef = useRef(false);

  const onFloorPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (placing && placingItem && placingItem.kind !== "wall") {
      isPointerDownRef.current = true;
    }
  };

  const onFloorPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (placing && placingItem && placingItem.kind !== "wall") {
      // Item should ONLY be moved to point dragged to or tapped, NOT on mouse hover!
      if (!isPointerDownRef.current && (e.buttons ?? 0) === 0) return;
      setIsDraggingItem?.(true);
      const next = floorPlacementAt(placingItem.size, placing.rot, e.point, lvl);
      setMoved({ uid: placing.uid, placement: next });
    }
  };

  const onFloorPointerUp = () => {
    isPointerDownRef.current = false;
    setIsDraggingItem?.(false);
  };

  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (placing && placingItem && placingItem.kind !== "wall") {
      e.stopPropagation();
      // Tap lands on the floor: only move the item to this tapped point!
      // No immediate placement on tap; user clicks Done button to complete move.
      const next = floorPlacementAt(placingItem.size, placing.rot, e.point, lvl);
      setMoved({ uid: placing.uid, placement: next });
      return;
    }

    if (!decorating) {
      if (e.delta > DRAG_THRESHOLD) return;
      e.stopPropagation();
      handleFloorLocomotion(e.point);
    }
  };

  const onWallPointer = (wall: Wall, e: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>, click: boolean) => {
    if (!placing || !placingItem || placingItem.kind !== "wall") return;
    const isDrag = !click && (isPointerDownRef.current || (e.buttons ?? 0) > 0);
    // Only move if tapped or actively dragged, not on mouse hover!
    if (!click && !isDrag) return;

    if (click && e.delta > DRAG_THRESHOLD) return;
    const next = { kind: "wall" as const, wall, offset: wallOffsetAt(wall, e.point, placingItem.size[0]), ...(lvl ? { level: lvl } : {}) };
    setMoved({ uid: placing.uid, placement: next });
    if (click) {
      e.stopPropagation();
      // Tap only moves it to this wall spot; Done button commits.
    }
  };

  const interact = (type: Interaction, item?: CatalogItem, placement?: Placement | null) => {
    if (climbRef.current) return;
    onInteractObject?.(type);
    if (animTimer.current) {
      clearTimeout(animTimer.current);
      animTimer.current = null;
    }
    getUp();
    const rest = item ? restPose(item, placement, type, avatarHeight) : undefined;
    if (type === "stairs" && stairs) {
      // Walk to the foot of the stairs (or the top, upstairs), then climb.
      setWalkTarget(lvl === 0 ? [stairs.x, stairs.foot] : [stairs.x, stairs.landing]);
      setPendingAction({ type });
    } else if (rest) {
      // Walk to the side of the bed or the front of the seat, then lie down or sit.
      setWalkTarget(rest.stand);
      setPendingAction({ type, rest });
    } else {
      setPendingAction(null);
      setAnimation(type === "cooler" ? "wave" : "talk");
      animTimer.current = setTimeout(() => setAnimation("idle"), 3500);
    }
  };
  useEffect(() => () => { if (animTimer.current) clearTimeout(animTimer.current); }, []);

  // Walking over to a fixture (tapped, or asked for from the activities) to use it.
  const goUseFixture = (f: Fixture) => {
    if (climbRef.current) return;
    if (animTimer.current) { clearTimeout(animTimer.current); animTimer.current = null; }
    getUp();
    const spot = fixtureSpot(f);
    setWalkTarget([spot.x, spot.z]);
    setClickBeacon({ x: spot.x, z: spot.z, time: nowMs() });
    setPendingAction({ type: "cooler", fixture: f });
  };
  // Using an object (TV, aquarium, dining table, counter) works like a fixture: walk there, then its actions.
  const [objectFx, setObjectFx] = useState<Fixture | null>(null);
  const startObjectUse = (uid: string, kind: HomeObject, item: CatalogItem, placement: FloorPlacement) => {
    const f: Fixture = { id: uid, kind: kind as Fixture["kind"], size: item.size as [number, number], placement };
    setObjectFx(f);
    goUseFixture(f);
  };
  // Out in the garden: the pool and the car (out of the front door, then there).
  const startGroundsUse = (what: "pool" | "car") => {
    if (climbRef.current) return;
    getUp();
    const f: Fixture = { id: `grounds-${what}`, kind: what as Fixture["kind"], size: [1, 1], placement: { kind: "floor", col: 0, row: 0, rot: 0 } };
    setObjectFx(f);
    onUseFixture?.(f);
  };
  const groundsN = groundsCall?.n ?? 0;
  useEffect(() => {
    if (groundsN && groundsCall) startGroundsUse(groundsCall.what);
    // Only when a new ask comes in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groundsN]);
  // While an object is in use: seated at the table, facing the TV, at the counter or the tank. Back where you were after.
  const objectInUse = using && objectFx?.id === using ? objectFx : null;
  // In the pool or by the car: where, by what's being done (swimming laps, in the water, on a lounger, at the car).
  useEffect(() => {
    if (!objectInUse || (objectInUse.kind !== "pool" && objectInUse.kind !== "car")) return;
    const P = GROUNDS.pool;
    let lap: ReturnType<typeof setInterval> | null = null;
    const t = setTimeout(() => {
      if (objectInUse.kind === "car") {
        const d = GROUNDS.driveway;
        setPose({ position: [d.x + 1.6, 0, d.z], yaw: -Math.PI / 2 });
        setAnimation(activity === "photo" ? "wave" : "talk");
      } else if (activity === "swim") {
        // Laps: up and down the pool, swimming.
        let k = 0;
        const step = () => { k++; const z = P.z + Math.sin(k * 0.25) * (P.l / 2 - 1); setPose({ position: [P.x, P.water - 0.32, z], yaw: Math.cos(k * 0.25) > 0 ? Math.PI : 0, lie: true }); };
        step();
        lap = setInterval(step, 250);
        setAnimation("swim");
      } else if (activity === "sunbathe") {
        const [lx, lz] = GROUNDS.loungers[0];
        setPose({ position: [lx, 0.38, lz + 0.9], yaw: Math.PI, lie: true });
        setAnimation("sleep");
      } else {
        // Standing in the water, chest deep.
        setPose({ position: [P.x, P.floor + 0.35, P.z + 1], yaw: Math.PI / 2 });
        setAnimation("idle");
      }
    }, 0);
    return () => {
      clearTimeout(t);
      if (lap) clearInterval(lap);
      // Back indoors, by the front of the room.
      setTimeout(() => { setPose({ position: [0, 0, 3.2], yaw: 0 }); setAnimation("idle"); }, 0);
    };
    // When a use starts or ends, or the action changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectInUse?.id, activity]);
  useEffect(() => {
    if (!objectInUse || objectInUse.kind === "pool" || objectInUse.kind === "car") return;
    const f = objectInUse;
    const front = fixtureSpot(f);
    const c = floorCenter(f.size, f.placement);
    const t = setTimeout(() => {
      if (f.kind === "dining") {
        // In the chair on the near side, at the table.
        const dx = front.x - c.x, dz = front.z - c.z, l = Math.hypot(dx, dz) || 1;
        const reach = f.size[1] * CELL * 0.36;
        setPose({ position: [c.x + (dx / l) * reach, 0.06, c.z + (dz / l) * reach], yaw: front.yaw });
        setAnimation("sit");
        return;
      }
      setPose({ position: [front.x, 0, front.z], yaw: front.yaw });
      setAnimation(f.kind === "tv" ? "idle" : "talk");
    }, 0);
    return () => {
      clearTimeout(t);
      setTimeout(() => { setPose({ position: [front.x, 0, front.z], yaw: front.yaw }); setAnimation("idle"); }, 0);
    };
    // Only when a use starts or ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectInUse?.id]);
  const fixtureN = fixtureCall?.n ?? 0;
  useEffect(() => {
    if (!fixtureN || !fixtureCall) return;
    const f = fixtures.find((x) => x.kind === fixtureCall.kind);
    if (f) goUseFixture(f);
    // Only when a new ask comes in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixtureN]);

  // In the shower while it runs: under the rain head, facing the tiles. On the toilet: sat on it, facing out. Then
  // back out where you came in.
  const showerId = using && fixtures.find((f) => f.id === using && (f.kind === "shower" || f.kind === "toilet")) ? using : null;
  useEffect(() => {
    if (!showerId) return;
    const f = fixtures.find((x) => x.id === showerId)!;
    const c = floorCenter(f.size, f.placement);
    const turn = -f.placement.rot * (Math.PI / 2);
    const front = fixtureSpot(f);
    const t = setTimeout(() => {
      if (f.kind === "toilet") {
        // Feet a little in front of the bowl; the sit clip puts the hips back over the seat.
        const dx = front.x - c.x, dz = front.z - c.z, d = Math.hypot(dx, dz) || 1;
        setPose({ position: [c.x + (dx / d) * 0.3, 0, c.z + (dz / d) * 0.3], yaw: front.yaw + Math.PI });
        setAnimation("sit");
        return;
      }
      setPose({ position: [c.x, 0.06, c.z], yaw: turn + Math.PI });
      setAnimation("idle");
    }, 0);
    return () => {
      clearTimeout(t);
      const out = fixtureSpot(f);
      setTimeout(() => { setPose({ position: [out.x, 0, out.z], yaw: out.yaw }); setAnimation("idle"); }, 0);
    };
    // Only when a shower starts or ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showerId]);

  // Sit (at a party): to the nearest seat nobody's on, on this floor. With none free, the page sits you where you are.
  // Stand: up off the seat.
  const interactRef = useRef(interact);
  useEffect(() => { interactRef.current = interact; });
  const peopleRef = useRef(people);
  useEffect(() => { peopleRef.current = people; }, [people]);
  const seatN = seatCall?.n ?? 0;
  const seatSit = !!seatCall?.sit;
  useEffect(() => {
    if (!seatN) return;
    const t = setTimeout(() => {
      if (!seatSit) {
        setPendingAction(null);
        setPose((p) => (p.stand ? { position: [p.stand[0], 0, p.stand[1]], yaw: p.yaw } : p));
        setAnimation("idle");
        return;
      }
      const [mx, , mz] = poseRef.current.position;
      const taken = (x: number, z: number) => peopleRef.current.some((o) => Math.hypot(o.position[0] - x, o.position[2] - z) < 0.45);
      let best: { item: CatalogItem; placement: Placement; d: number } | null = null;
      for (const f of furniture) {
        const item = getCatalogItem(f.itemId);
        if (!item || item.interaction !== "chair" || f.placement?.kind !== "floor" || levelOf(f.placement) !== lvl) continue;
        const r = restPose(item, f.placement, "chair", avatarHeight);
        if (!r || taken(r.position[0], r.position[2])) continue;
        const d = Math.hypot(r.position[0] - mx, r.position[2] - mz);
        if (!best || d < best.d) best = { item, placement: f.placement, d };
      }
      if (best) interactRef.current("chair", best.item, best.placement);
    }, 0);
    return () => clearTimeout(t);
    // Only a new ask: not every time the furniture or people change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatN]);

  const hoverCursor = (on: boolean) => () => { document.body.style.cursor = on ? "pointer" : ""; };

  useEffect(() => {
    if (!walkRequestRef) return;
    walkRequestRef.current = (x: number, z: number) => {
      handleFloorLocomotion(new THREE.Vector3(x, 0, z));
    };
    return () => {
      walkRequestRef.current = null;
    };
  });

  return (
    <BeddingContext.Provider value={style.bedding}>
      <CameraRig
        turns={turns}
        upView={upView}
        viewDistance={viewDistance}
        targetPos={targetPos}
        panTarget={panTarget}
        panNudgeRef={panNudgeRef}
        follow={upView ? undefined : pose.position}
        followYaw={pose.yaw}
        inside={(view === "inside" || view === "eye") && !upView}
        eye={view === "eye" && !upView}
        onHiddenWallsChange={setHiddenWalls}
      />

      {/* Eye view: the ceiling overhead (looking up shows a roof, not sky). */}
      {view === "eye" && <Ceiling w={ROOM_SIZE} d={ROOM_SIZE} h={WALL_HEIGHT} />}

      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onPointerDown={onFloorPointerDown}
        onPointerMove={onFloorPointerMove}
        onPointerUp={onFloorPointerUp}
        onClick={onFloorClick}
      >
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial
          map={floorTexture}
          roughness={style.floor.includes("marble") ? 0.18 : style.floor === "terrazzo" ? 0.3 : style.floor === "travertine" || style.floor === "slate" ? 0.55 : 0.65}
          metalness={style.floor.includes("marble") ? 0.05 : 0}
          color={style.floor === "oak" ? config.floorTint : undefined}
        />
      </mesh>
      {/* Grid overlay while placing floor items */}
      {placingItem && placingItem.kind !== "wall" && (
        <gridHelper args={[ROOM_SIZE, GRID, "#ffffff", "#ffffff"]} position={[0, 0.006, 0]} raycast={() => null}>
          <meshBasicMaterial attach="material" transparent opacity={0.25} />
        </gridHelper>
      )}

      <RoomShell
        hiddenWalls={hiddenWalls}
        wallTargeting={placingItem?.kind === "wall"}
        interactive={!busy}
        onWallPointer={onWallPointer}
        onDoor={() => {
          if (hasPlot(housingTier) && lvl === 0) {
            handleFloorLocomotion(new THREE.Vector3(0, 0, pose.position[2] > 4.8 ? 2.5 : 6.8));
          } else {
            interact("door");
          }
        }}
        wallColor={style.wall}
        skirtingColor={config.skirtingColor}
        upstairs={lvl > 0}
        panels={style.panels}
        balcony={!!rooms?.some((r) => r.id === "balcony") || (hasPlot(housingTier) && lvl === 0)}
      />

      {/* The kitchen and bathroom */}
      <HomeFixtures
        fixtures={fixtures}
        running={using}
        walls={fixtureWalls}
        wallColor={style.wall}
        skirtingColor={config.skirtingColor}
        wallH={upView ? 1.15 : 2.6}
        onUse={busy ? undefined : goUseFixture}
      />

      {/* Two-storey homes: the rooms of the floor on show */}
      {levelDef && (
        <LevelPartitions
          def={levelDef}
          upView={upView}
          activeRoomId={activeRoomId}
          onSelectRoom={onSelectRoom}
          onFloorClick={handleFloorLocomotion}
          placingItem={!!placing}
          wallColor={style.wall}
          skirtingColor={config.skirtingColor}
        />
      )}

      {/* Single-storey homes: the floor plan's walls and rooms (src/data/home/floorplans.json) */}
      {!levelDef && config.walls && (
        <LevelPartitions
          def={{ label: "", icon: "", rooms: rooms ?? [], walls: config.walls }}
          upView={upView}
          activeRoomId={activeRoomId}
          onSelectRoom={onSelectRoom}
          onFloorClick={handleFloorLocomotion}
          placingItem={!!placing}
          wallColor={style.wall}
          skirtingColor={config.skirtingColor}
        />
      )}
      {rooms?.some((r) => r.id === "balcony") && <Balcony room={rooms.find((r) => r.id === "balcony")!} onFloorClick={handleFloorLocomotion} />}
      {/* Townhouses and villas: the pool, garage, garden… added outside (ground floor only). */}
      {hasPlot(housingTier) && lvl === 0 && (
        <HomeGrounds
          items={style.exterior ?? []}
          car={ownCar}
          activity={objectInUse?.kind === "car" ? activity : undefined}
          onUse={busy ? undefined : (what) => startGroundsUse(what)}
          onGroundClick={busy ? undefined : handleFloorLocomotion}
        />
      )}

      {/* Outdoor Pool & Garden Party Vibes when hosting a house party on a villa/townhouse plot */}
      {hasPlot(housingTier) && lvl === 0 && partyDecor && (
        <group>
          <pointLight position={[1.5, 2.2, 10.6]} intensity={5} distance={10} color="#ec4899" />
          <pointLight position={[10.0, 2.2, 6.0]} intensity={4} distance={9} color="#38bdf8" />
          <pointLight position={[-8.5, 2.2, 11.2]} intensity={4} distance={9} color="#f59e0b" />
          <Suspense fallback={null}>
            <group position={[5.8, 0, 8.8]} rotation={[0, -0.7, 0]}>
              <CitizenAvatar look={{ gender: "woman", outfit: "party" }} animation="dance" holding="champagne" carryMode="drink" />
            </group>
            <group position={[-2.8, 0, 8.6]} rotation={[0, 0.6, 0]}>
              <CitizenAvatar look={{ gender: "man", outfit: "casual" }} animation="dance" holding="cocktail" carryMode="drink" />
            </group>
            <group position={[9.4, 0, 6.2]} rotation={[0, -1.2, 0]}>
              <CitizenAvatar look={{ gender: "woman", outfit: "casual" }} animation="dance" holding="cocktail" carryMode="drink" />
            </group>
          </Suspense>
        </group>
      )}

      {/* Visual Click-to-Walk Destination Beacon */}
      {clickBeacon && (
        <group position={[clickBeacon.x, 0.03, clickBeacon.z]} raycast={() => null}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 0.35, 32]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.07, 16]} />
            <meshBasicMaterial color="#0284c7" />
          </mesh>
        </group>
      )}

      {/* Owned and built-in furniture (the one being moved is shown as a ghost instead) */}
      {furniture.map((f) => {
        const item = getCatalogItem(f.itemId);
        if (!item || !f.placement || f.uid === placing?.uid || levelOf(f.placement) !== lvl) return null;
        // Wall art disappears with its wall when that wall is cut away.
        if (f.placement.kind === "wall" && hiddenWalls.has(f.placement.wall)) return null;
        return (
          <PlacedTransform key={f.uid} item={item} placement={f.placement}>
            <Suspense fallback={null}>
              <group
                onClick={(e) => {
                  if (placing || e.delta > DRAG_THRESHOLD) return;
                  // Decorating: pick it up to move. Otherwise: use it (sit, sleep, open the fridge).
                  if (decorating) { e.stopPropagation(); if (!item.fixed) onPickUp?.(f.uid); return; }
                  if (item.interaction) { e.stopPropagation(); interact(item.interaction, item, f.placement); return; }
                  // The TV, aquarium, dining table, kitchen counter: walk over and choose what to do.
                  const obj = homeObjectOf(item);
                  if (obj && f.placement?.kind === "floor" && !busy) { e.stopPropagation(); startObjectUse(f.uid, obj, item, f.placement); }
                }}
                onPointerOver={(decorating && !placing && !item.fixed) || ((item.interaction || homeObjectOf(item)) && !busy) ? hoverCursor(true) : undefined}
                onPointerOut={hoverCursor(false)}
              >
                <ItemVisual item={item} activity={using === f.uid ? activity : undefined} customColor={f.customColor} />

                {/* Tactile Decorate-mode hit plate and visual highlight for every movable item */}
                {decorating && !placing && !item.fixed && f.placement.kind === "floor" && (
                  <group>
                    <mesh
                      rotation={[-Math.PI / 2, 0, 0]}
                      position={[0, 0.015, 0]}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPickUp?.(f.uid);
                      }}
                    >
                      <planeGeometry args={[item.size[0] * CELL - 0.02, item.size[1] * CELL - 0.02]} />
                      <meshBasicMaterial color="#10b981" transparent opacity={0.35} depthWrite={false} />
                    </mesh>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} raycast={() => null}>
                      <ringGeometry args={[0.18, 0.24, 16]} />
                      <meshBasicMaterial color="#34d399" transparent opacity={0.8} />
                    </mesh>
                  </group>
                )}
              </group>
            </Suspense>
          </PlacedTransform>
        );
      })}

      {/* Placement ghost + footprint */}
      {placingItem && ghost && !(ghost.kind === "wall" && hiddenWalls.has(ghost.wall)) && (
        <PlacedTransform item={placingItem} placement={ghost}>
          <Suspense fallback={null}>
            <group
              onPointerDown={(e) => {
                e.stopPropagation();
                isPointerDownRef.current = true;
                setIsDraggingItem?.(true);
              }}
              onPointerMove={(e) => {
                if (!isPointerDownRef.current && (e.buttons ?? 0) === 0) return;
                e.stopPropagation();
                if (placing && placingItem.kind !== "wall") {
                  const next = floorPlacementAt(placingItem.size, placing.rot, e.point, lvl);
                  setMoved({ uid: placing.uid, placement: next });
                }
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                isPointerDownRef.current = false;
                setIsDraggingItem?.(false);
              }}
            >
              <ItemVisual item={placingItem} ghost={ghostValid ? "valid" : "invalid"} />
            </group>
          </Suspense>
          {ghost.kind === "floor" && (
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.012, 0]}
              onPointerDown={(e) => {
                e.stopPropagation();
                isPointerDownRef.current = true;
                setIsDraggingItem?.(true);
              }}
              onPointerMove={(e) => {
                if (!isPointerDownRef.current && (e.buttons ?? 0) === 0) return;
                e.stopPropagation();
                if (placing) {
                  const next = floorPlacementAt(placingItem.size, placing.rot, e.point, lvl);
                  setMoved({ uid: placing.uid, placement: next });
                }
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                isPointerDownRef.current = false;
                setIsDraggingItem?.(false);
              }}
            >
              <planeGeometry args={[placingItem.size[0] * CELL, placingItem.size[1] * CELL]} />
              <meshBasicMaterial color={ghostValid ? "#10b981" : "#ef4444"} transparent opacity={0.35} depthWrite={false} />
            </mesh>
          )}
        </PlacedTransform>
      )}

      <Suspense fallback={null}>
        <group position={pose.position} rotation={[0, pose.yaw, 0]} visible={view !== "eye"}>
          {/* Asleep: laid flat on the back, head along the bed. */}
          {/* Walking always shows walking (no sliding); what the page asks for (dancing, sitting) is when you stop. */}
          <group position={shownSleep && !pose.lie ? [0, 0.12, 0] : [0, 0, 0]}>
            <CitizenAvatar look={look} animation={shown} rotation={pose.lie || shownSleep ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}
              holding={holding?.prop} carryMode={holding ? (animation === "walk" ? "hold" : holding.mode) : undefined} />
          </group>
          {dirty && !pose.lie && <Flies />}
        </group>
        {people.map((p, i) => <PersonAvatar key={i} p={p} id={`p${i}`} labels={labels} />)}
      </Suspense>
    </BeddingContext.Provider>
  );
}

const PLOT_ZONES: { id: string; label: string; icon: string; cam: [number, number]; walk: [number, number] }[] = [
  { id: "inside", label: "Inside", icon: "🏠", cam: [0, 0], walk: [0, 1.5] },
  { id: "pool", label: "Pool", icon: "🏊", cam: [1.5, 10.6], walk: [1.5, 7.6] },
  { id: "garden", label: "Garden & BBQ", icon: "🌳", cam: [10.0, 4.5], walk: [10.0, 6.2] },
  { id: "majlis", label: "Majlis", icon: "⛺", cam: [-8.5, 11.2], walk: [-8.5, 11.2] },
  { id: "carpark", label: "Car Park", icon: "🚗", cam: [-10.2, 2.0], walk: [-7.2, 2.0] },
];

interface WebGLErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class WebGLErrorBoundary extends Component<
  { children: React.ReactNode; onRetry?: () => void },
  WebGLErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onRetry?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): WebGLErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("WebGL Canvas failed to initialize:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-white p-6 text-center z-50">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl mb-4 border border-amber-400/30">
            🏙️
          </div>
          <h2 className="text-base sm:text-lg font-black mb-1.5">3D Dubai Scene Loading Paused</h2>
          <p className="text-xs text-slate-300 max-w-sm mb-5 leading-relaxed">
            Your browser temporarily paused WebGL hardware acceleration. Tap below to re-activate the 3D apartment engine.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onRetry?.();
            }}
            className="px-6 py-2.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 active:scale-95 transition shadow-xl cursor-pointer"
          >
            🔄 Re-open 3D Apartment
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ApartmentRoom(props: ApartmentRoomProps & { loadingLabel?: string; /** "transparent" shows the page behind the room. */ background?: string }) {
  const labels = useRef(new Map<string, HTMLDivElement>());
  const [localToast, setLocalToast] = useState<string | null>(null);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [webglRetryKey, setWebglRetryKey] = useState(0);
  const [webglSupported, setWebglSupported] = useState(() => (typeof window === "undefined" ? true : isWebGLAvailable()));
  const quality = useMemo(() => canvasQuality(), []);
  const [panTarget, setPanTarget] = useState<[number, number] | null>(null);
  const [activePlotZone, setActivePlotZone] = useState<string>("inside");
  const panNudgeRef = useRef<{ dx: number; dz: number } | null>(null);
  const walkRequestRef = useRef<((x: number, z: number) => void) | null>(null);
  const showPlotScroll = hasPlot(props.housingTier ?? "studio") && (props.level ?? 0) === 0;

  useEffect(() => {
    setWebglSupported(isWebGLAvailable());
  }, []);

  const triggerActivity = (act: HomeActivityDef) => {
    if (props.onTriggerActivity) {
      props.onTriggerActivity(act);
      return;
    }
    if (act.cost && !adjustBalance(-act.cost)) {
      setLocalToast("⚠️ Not enough AED in your wallet!");
      setTimeout(() => setLocalToast(null), 2600);
      return;
    }
    gameAudio.playClickSound();
    updateCitizen((c) => {
      const cur = { ...DEFAULT_NEEDS, ...c.needs };
      return {
        ...c,
        needs: {
          ...cur,
          [act.need.kind]: Math.min(100, (cur[act.need.kind] ?? 70) + act.need.amount),
        },
      };
    });
    if (act.statBoost) {
      gainSkill(act.statBoost.name as Parameters<typeof gainSkill>[0], act.statBoost.amount);
    }
    setLocalToast(`${act.icon} ${act.label} · +${act.need.amount} ${act.need.kind.toUpperCase()}`);
    setTimeout(() => setLocalToast(null), 2600);
  };

  const tierConfig = HOUSING_CONFIGS[props.housingTier ?? "studio"] ?? HOUSING_CONFIGS.studio;
  const availableActivities = tierConfig.activities ?? [];

  return (
    <div className="w-full h-full relative select-none">
      <SceneLoadingOverlay label={props.loadingLabel ?? "Opening your apartment"} />
      {!webglSupported ? (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 text-white z-20 overflow-y-auto">
          <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center mt-6">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl mb-3 border border-amber-400/30 shadow-lg">
              🏙️
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
              {tierConfig.label}
            </h2>
            <p className="text-xs text-slate-300 max-w-md leading-relaxed mb-4">
              WebGL 3D hardware acceleration is currently disabled or sandboxed in this browser. Your residence, furniture, rituals, and stats remain active in 2.5D Mode.
            </p>
            <button
              type="button"
              onClick={() => {
                resetWebGLCache();
                const avail = isWebGLAvailable();
                setWebglSupported(avail);
                if (avail) setWebglRetryKey((k) => k + 1);
              }}
              className="px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs active:scale-95 transition shadow-xl cursor-pointer flex items-center gap-2"
            >
              <span>🔄</span> Retry 3D Acceleration
            </button>
          </div>

          {/* Quick Room Stations & Daily Rituals */}
          <div className="w-full max-w-xl mx-auto space-y-3 pb-20 mt-4">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-400/90 text-center">
              Room Stations & Daily Rituals
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(availableActivities.length > 0 ? availableActivities : [
                { id: "shower", label: "Master Shower", icon: "🚿", desc: "Freshen up", animation: "drink" as const, need: { kind: "hygiene" as const, amount: 35 } },
                { id: "cook", label: "Gourmet Kitchen", icon: "🍳", desc: "Replenish hunger", animation: "eat" as const, need: { kind: "hunger" as const, amount: 35 } },
                { id: "sleep", label: "King Bed", icon: "🛏️", desc: "Deep sleep", animation: "sit" as const, need: { kind: "energy" as const, amount: 40 } },
                { id: "lounge", label: "Smart TV & Lounge", icon: "📺", desc: "Relax and chill", animation: "sit" as const, need: { kind: "fun" as const, amount: 30 } },
              ]).map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => triggerActivity(act)}
                  className="flex flex-col items-start p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md text-left transition active:scale-95 cursor-pointer shadow-md"
                >
                  <span className="text-2xl mb-1">{act.icon}</span>
                  <span className="text-xs font-black text-white">{act.label}</span>
                  <span className="text-[10px] text-white/70 line-clamp-1">{act.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <WebGLErrorBoundary
          key={webglRetryKey}
          onRetry={() => {
            resetWebGLCache();
            setWebglRetryKey((k) => k + 1);
          }}
        >
          <Canvas
            shadows={quality.shadows ? { type: THREE.PCFShadowMap } : false}
            camera={{ position: [11.5, 10.7, 11.5], fov: 35 }}
            dpr={quality.dpr}
            gl={{
              powerPreference: "default",
              failIfMajorPerformanceCaveat: false,
              preserveDrawingBuffer: false,
              antialias: true,
            }}
          >
            {props.background !== "transparent" && <color attach="background" args={[props.background ?? "#7f9c78"]} />}
            <StudioEnvironment intensity={props.lightsOut ? 0.04 : 0.35} />
            <hemisphereLight args={props.lightsOut ? ["#7c3aed", "#0f172a", 0.25] : ["#fff7ed", "#6b7280", 1.0]} />
            <directionalLight
              position={[5, 9, 4]}
              intensity={props.lightsOut ? 0.15 : 2.2}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-left={-6}
              shadow-camera-right={6}
              shadow-camera-top={6}
              shadow-camera-bottom={-6}
              shadow-bias={-0.0005}
            />
            <pointLight position={[0, 2.6, 0]} intensity={props.lightsOut ? 1.2 : 6} distance={9} color={props.lightsOut ? "#c084fc" : "#fde68a"} />

            <Suspense fallback={null}>
              <RoomScene
                {...props}
                labels={labels}
                panTarget={panTarget}
                panNudgeRef={panNudgeRef}
                walkRequestRef={walkRequestRef}
                isDraggingItem={isDraggingItem}
                setIsDraggingItem={setIsDraggingItem}
              />
            </Suspense>
            {props.extras}
            {props.partyDecor && <PartyDecor decor={props.partyDecor} w={ROOM_SIZE} d={ROOM_SIZE} h={WALL_HEIGHT} />}

            <OrbitControls
              makeDefault
              target={DEFAULT_ORBIT_TARGET}
              enablePan={true}
              screenSpacePanning={true}
              enableDamping
              enabled={!isDraggingItem}
              minPolarAngle={props.upView ? 0.2 : props.view === "eye" ? 0.35 : props.view === "inside" ? 0.6 : 0.35}
              maxPolarAngle={props.upView ? 1.15 : props.view === "eye" ? 2.4 : props.view === "inside" ? 1.5 : 1.25}
              minDistance={props.upView ? 6 : props.view === "eye" ? 0.05 : props.view === "inside" ? 3 : 6}
              maxDistance={props.upView ? 38 : props.view === "eye" ? EYE_BACK + 0.15 : props.view === "inside" ? 14 : showPlotScroll ? 38 : 30}
            />
          </Canvas>
        </WebGLErrorBoundary>
      )}
      <PeopleLabels people={props.people ?? []} nodes={labels} />

      {localToast && (
        <div className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 z-40 rounded-full bg-slate-900/95 text-white px-4 py-2 text-xs font-black shadow-2xl border border-white/20">
          {localToast}
        </div>
      )}

      {/* Outdoor Villa Plot Scroll & Walk-Through-Doorway Bar */}
      {showPlotScroll && !props.decorating && (
        <div
          className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-20 z-20 flex items-center gap-1 rounded-full border border-white/15 bg-black/75 px-2 py-1 text-[11px] font-semibold text-white shadow-xl backdrop-blur-md max-w-[95vw] overflow-x-auto"
          title="Scroll the camera across your villa grounds or tap a zone to walk outside through the patio doorway"
        >
          <button
            type="button"
            onClick={() => {
              setPanTarget(null);
              panNudgeRef.current = { dx: -3.2, dz: 0 };
            }}
            className="rounded-full bg-white/10 hover:bg-white/20 px-2 py-1 text-amber-300 transition active:scale-95"
            aria-label="Scroll plot left"
          >
            ◀
          </button>
          {PLOT_ZONES.map((z) => {
            const active = activePlotZone === z.id;
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => {
                  setActivePlotZone(z.id);
                  setPanTarget(z.cam);
                  setTimeout(() => setPanTarget(null), 1200);
                  walkRequestRef.current?.(z.walk[0], z.walk[1]);
                }}
                className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 transition active:scale-95 ${
                  active
                    ? "bg-amber-400 text-black font-bold shadow"
                    : "bg-white/5 text-white/85 hover:bg-white/15"
                }`}
              >
                <span>{z.icon}</span>
                <span>{z.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setPanTarget(null);
              panNudgeRef.current = { dx: 3.2, dz: 0 };
            }}
            className="rounded-full bg-white/10 hover:bg-white/20 px-2 py-1 text-amber-300 transition active:scale-95"
            aria-label="Scroll plot right"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}

export type { FloorPlacement };
