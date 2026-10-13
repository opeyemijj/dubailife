"use client";

import { canvasQuality } from "@/lib/device";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { AvatarLookProps } from "../onboarding/AvatarCanvas";
import { CitizenAvatar, StudioEnvironment, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import { SceneLoadingOverlay } from "@/components/GameLoadingScreen";
import {
  AVATAR_SPOT, BUILT_INS, CELL, DOOR, GRID, ROOM_SIZE, WALL_HEIGHT, WINDOW,
  findFreePlacement, floorCenter, floorPlacementAt, getCatalogItem, isPlacementValid, rotatedSize, wallOffsetAt, wallTransform, withHomeItems,
  type CatalogItem, type FloorPlacement, type Interaction, type OwnedFurniture, type Placement, type Rotation, type Wall,
} from "@/lib/furniture";

// Only what every home has is fetched up front; shop items load when bought or shown.
[...new Set(BUILT_INS.map((b) => b.model))].forEach((url) => url && useGLTF.preload(url));

const HALF = ROOM_SIZE / 2;

/** Where the citizen stands, and where they sit when using the chair or bed. */
type Pose = { position: [number, number, number]; yaw: number };
const STAND: Pose = { position: [AVATAR_SPOT.x, 0, AVATAR_SPOT.z], yaw: Math.PI / 4 };
function seatFor(id: string, yawOffset: number, inset: [number, number] = [0, 0]): Pose {
  const b = BUILT_INS.find((x) => x.id === id)!;
  const c = floorCenter(b.size, b.placement);
  return { position: [c.x + inset[0], 0, c.z + inset[1]], yaw: -b.placement.rot * (Math.PI / 2) + yawOffset };
}
// The chair faces the way it is turned; on the bed the citizen sits on the side edge facing into the room.
const SEATS: Partial<Record<Interaction, Pose>> = {
  chair: seatFor("chair", Math.PI, [0, -0.05]),
  bed: { position: [-0.75, 0, -2.2], yaw: Math.PI / 2 },
};
const HOME_ID: Partial<Record<Interaction, string>> = { chair: "chair", bed: "bed" };

/** Where to sit on a chair or bed wherever it has been moved to (the starting pose, carried along). */
function seatPose(type: Interaction, placement: Placement | null | undefined): Pose | undefined {
  const base = SEATS[type];
  const b = BUILT_INS.find((x) => x.id === HOME_ID[type]);
  if (!base || !b || !placement || placement.kind !== "floor") return base;
  const c0 = floorCenter(b.size, b.placement);
  const c = floorCenter(b.size, placement);
  const turn = -(placement.rot - b.placement.rot) * (Math.PI / 2);
  const dx = base.position[0] - c0.x, dz = base.position[2] - c0.z;
  const cos = Math.cos(turn), sin = Math.sin(turn);
  return { position: [c.x + dx * cos + dz * sin, 0, c.z - dx * sin + dz * cos], yaw: base.yaw + turn };
}
const WALL_THICKNESS = 0.16;
const DRAG_THRESHOLD = 6; // px; anything more is a camera drag, not a tap

export interface PlacingState {
  uid: string;
  itemId: string;
  rot: Rotation;
}

interface ApartmentRoomProps {
  look?: AvatarLookProps;
  furniture?: OwnedFurniture[];
  /** Item currently being placed or moved, if any. */
  placing?: PlacingState | null;
  /** When true, tapping a placed item picks it up instead of interacting. */
  decorating?: boolean;
  /** Cumulative quarter-turns requested from the UI; each change swings the camera 90°. */
  turns?: number;
  onPlace?: (uid: string, placement: Placement) => void;
  onPickUp?: (uid: string) => void;
  /** Called when a tap lands somewhere the item doesn't fit. */
  onPlaceBlocked?: () => void;
  onInteractObject?: (type: Interaction) => void;
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
}

type LabelNodes = React.RefObject<Map<string, HTMLDivElement>>;

/** Someone in the room, tappable, with their name tag kept over their head. */
function PersonAvatar({ p, id, labels }: { p: Person; id: string; labels: LabelNodes }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ camera, size }) => {
    const g = group.current;
    if (!g) return;
    const v = new THREE.Vector3();
    for (const [suffix, lift] of [["tag", 2.2], ["bubble", 2.6]] as const) {
      const el = labels.current.get(`${id}:${suffix}`);
      if (!el) continue;
      g.getWorldPosition(v);
      v.y += lift;
      v.project(camera);
      el.style.display = v.z < 1 ? "" : "none";
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`;
    }
  });
  return (
    <group
      ref={group}
      position={p.position}
      rotation={[0, p.rotation ?? 0, 0]}
      onClick={p.onClick ? (e) => { if (e.delta > 6) return; e.stopPropagation(); p.onClick!(); } : undefined}
      onPointerOver={p.onClick ? () => (document.body.style.cursor = "pointer") : undefined}
      onPointerOut={p.onClick ? () => (document.body.style.cursor = "") : undefined}
    >
      <CitizenAvatar look={p.look} animation={p.animation ?? "idle"} />
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

/** Loads a furniture GLB and fits it into its footprint: centred, resting on y=0, front facing +z. */
function useFittedModel(url: string, size: [number, number], yaw = 0, ghost?: "valid" | "invalid") {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const model = scene.clone(true);
    model.rotation.y = yaw;
    const fit = new THREE.Group();
    fit.add(model);
    fit.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(fit);
    const s = Math.min((size[0] * CELL * 0.94) / (box.max.x - box.min.x), (size[1] * CELL * 0.94) / (box.max.z - box.min.z));
    fit.scale.setScalar(s);
    fit.position.set(-((box.min.x + box.max.x) / 2) * s, -box.min.y * s, -((box.min.z + box.max.z) / 2) * s);
    const outer = new THREE.Group();
    outer.add(fit);

    const ghostMat = ghost
      ? new THREE.MeshStandardMaterial({ color: ghost === "valid" ? "#34d399" : "#f87171", transparent: true, opacity: 0.55, depthWrite: false })
      : null;
    outer.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (ghostMat) {
        m.material = ghostMat;
        m.raycast = () => {}; // ghosts never block the floor underneath
      } else {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return outer;
  }, [scene, size, yaw, ghost]);
}

function FurnitureModel({ url, size, yaw, ghost }: { url: string; size: [number, number]; yaw?: number; ghost?: "valid" | "invalid" }) {
  const object = useFittedModel(url, size, yaw, ghost);
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

function ItemVisual({ item, ghost }: { item: CatalogItem; ghost?: "valid" | "invalid" }) {
  if (item.kind === "wall") return <SunsetPainting size={item.size} ghost={ghost} />;
  return <FurnitureModel url={item.model!} size={item.size} yaw={item.yaw} ghost={ghost} />;
}

function PlacedTransform({ item, placement, children }: { item: CatalogItem | { size: [number, number] }; placement: Placement; children: React.ReactNode }) {
  if (placement.kind === "wall") {
    const t = wallTransform(item.size, placement);
    return <group position={[t.x, t.y, t.z]} rotation={[0, t.yaw, 0]}>{children}</group>;
  }
  const c = floorCenter(item.size, placement);
  return <group position={[c.x, 0, c.z]} rotation={[0, -placement.rot * (Math.PI / 2), 0]}>{children}</group>;
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
function WallSegments({ wall }: { wall: Wall }) {
  const color = "#f1e4cf";
  const opening = wall === DOOR.wall ? { ...DOOR, bottom: 0, top: 2.2 } : wall === WINDOW.wall ? { ...WINDOW, bottom: 1.0, top: 2.3 } : null;
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
        <mesh key={i} position={[(p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, -WALL_THICKNESS / 2]} receiveShadow castShadow>
          <boxGeometry args={[p.x1 - p.x0, p.y1 - p.y0, WALL_THICKNESS]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
      {/* Skirting board */}
      <mesh position={[0, 0.06, 0.01]}>
        <boxGeometry args={[ROOM_SIZE, 0.12, 0.03]} />
        <meshStandardMaterial color="#e7d5b8" roughness={0.7} />
      </mesh>
    </>
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
}

function RoomShell({ hiddenWalls, wallTargeting, interactive, onWallPointer, onDoor }: ShellProps) {
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
                <meshStandardMaterial color="#e7d5b8" roughness={0.8} />
              </mesh>
            ) : (
              <>
                <WallSegments wall={wall} />
                {wall === DOOR.wall && <Door onOpen={onDoor} interactive={interactive} />}
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

/** Wood-plank floor texture drawn in code. */
function useFloorTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    const tones = ["#c8935f", "#bf8954", "#cf9c68", "#b98250", "#c48f5b"];
    const plank = 64;
    for (let row = 0; row < 512 / plank; row++) {
      let x = -((row * 97) % 220);
      while (x < 512) {
        const len = 160 + ((row * 31 + x) % 120);
        ctx.fillStyle = tones[Math.abs(row * 7 + x) % tones.length];
        ctx.fillRect(x, row * plank, len, plank);
        ctx.fillStyle = "rgba(60,35,15,0.35)";
        ctx.fillRect(x, row * plank, 2, plank);
        x += len;
      }
      ctx.fillStyle = "rgba(60,35,15,0.4)";
      ctx.fillRect(0, row * plank, 512, 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    t.anisotropy = 8;
    return t;
  }, []);
}

// ---------- camera ----------

/** Swings the orbit camera a quarter turn whenever `turns` changes, and reports which walls face the camera. */
function CameraRig({ turns, onHiddenWallsChange }: { turns: number; onHiddenWallsChange: (walls: Set<Wall>) => void }) {
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const lastTurns = useRef(turns);
  const swing = useRef<{ from: number; to: number; t: number } | null>(null);
  const lastKey = useRef("");

  // Pull back on narrow (portrait) screens so the whole room fits.
  useEffect(() => {
    if (!controls) return;
    const dist = size.width / size.height < 0.8 ? 17 : 12.5;
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    controls.update();
  }, [controls, camera, size.width, size.height]);

  useEffect(() => {
    if (!controls || turns === lastTurns.current) return;
    const from = controls.getAzimuthalAngle();
    swing.current = { from, to: from + (turns - lastTurns.current) * (Math.PI / 2), t: 0 };
    lastTurns.current = turns;
  }, [turns, controls]);

  useFrame((_, dt) => {
    if (!controls) return;
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

    // Hide walls standing between the camera and the room centre.
    const cx = camera.position.x;
    const cz = camera.position.z;
    const len = Math.hypot(cx, cz) || 1;
    const hidden = new Set<Wall>();
    for (const { wall, normal } of WALLS) if ((cx * normal[0] + cz * normal[1]) / len > 0.25) hidden.add(wall);
    const key = [...hidden].sort().join(",");
    if (key !== lastKey.current) {
      lastKey.current = key;
      onHiddenWallsChange(hidden);
    }
  });

  return null;
}

// ---------- scene ----------

function RoomScene({ look, furniture: ownFurniture = [], placing, decorating, turns = 0, onPlace, onPickUp, onPlaceBlocked, onInteractObject, people = [], labels }: ApartmentRoomProps & { labels: LabelNodes }) {
  const floorTexture = useFloorTexture();
  // Everything in the room, including what came with it, can be moved.
  const furniture = useMemo(() => withHomeItems(ownFurniture), [ownFurniture]);
  const [hiddenWalls, setHiddenWalls] = useState<Set<Wall>>(new Set(["south", "east"]));
  // Where the user last pointed the item being placed (cleared by switching items).
  const [moved, setMoved] = useState<{ uid: string; placement: Placement } | null>(null);
  const [animation, setAnimation] = useState<AvatarAnimation>("idle");
  const [pose, setPose] = useState<Pose>(STAND);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placingItem = placing ? getCatalogItem(placing.itemId) ?? null : null;
  const busy = !!placing || !!decorating;

  // The ghost starts where the item already is (or the nearest free spot), follows the pointer,
  // and keeps its centre when rotated.
  const ghost = useMemo<Placement | null>(() => {
    if (!placing || !placingItem) return null;
    const base = moved?.uid === placing.uid ? moved.placement : furniture.find((f) => f.uid === placing.uid)?.placement;
    if (base && base.kind === (placingItem.kind === "wall" ? "wall" : "floor")) {
      return base.kind === "floor" ? floorPlacementAt(placingItem.size, placing.rot, floorCenter(placingItem.size, base)) : base;
    }
    const others = furniture.filter((f) => f.uid !== placing.uid);
    return findFreePlacement(placingItem, others, placingItem.kind === "wall" ? undefined : placing.rot)
      ?? (placingItem.kind === "wall" ? { kind: "wall", wall: "north", offset: 1 } : floorPlacementAt(placingItem.size, placing.rot, { x: 0, z: 0.5 }));
  }, [placing, placingItem, moved, furniture]);

  const ghostValid = !!(ghost && placingItem && isPlacementValid(placingItem, ghost, furniture, placing?.uid));

  const onFloorPointer = (e: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>, click: boolean) => {
    if (!placing || !placingItem || placingItem.kind === "wall") return;
    if (click && e.delta > DRAG_THRESHOLD) return;
    const next = floorPlacementAt(placingItem.size, placing.rot, e.point);
    setMoved({ uid: placing.uid, placement: next });
    if (click) {
      e.stopPropagation();
      if (isPlacementValid(placingItem, next, furniture, placing.uid)) onPlace?.(placing.uid, next);
      else onPlaceBlocked?.();
    }
  };

  const onWallPointer = (wall: Wall, e: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>, click: boolean) => {
    if (!placing || !placingItem || placingItem.kind !== "wall") return;
    if (click && e.delta > DRAG_THRESHOLD) return;
    const next = { kind: "wall" as const, wall, offset: wallOffsetAt(wall, e.point, placingItem.size[0]) };
    setMoved({ uid: placing.uid, placement: next });
    if (click) {
      e.stopPropagation();
      if (isPlacementValid(placingItem, next, furniture, placing.uid)) onPlace?.(placing.uid, next);
      else onPlaceBlocked?.();
    }
  };

  const interact = (type: Interaction, placement?: Placement | null) => {
    onInteractObject?.(type);
    const anim: AvatarAnimation | null = type === "bed" || type === "chair" ? "sit" : type === "cooler" ? "wave" : null;
    if (!anim) return;
    setAnimation(anim);
    setPose(seatPose(type, placement) ?? STAND);
    if (animTimer.current) clearTimeout(animTimer.current);
    animTimer.current = setTimeout(() => {
      setAnimation("idle");
      setPose(STAND);
    }, anim === "sit" ? 6000 : 3500);
  };
  useEffect(() => () => { if (animTimer.current) clearTimeout(animTimer.current); }, []);

  const hoverCursor = (on: boolean) => () => { document.body.style.cursor = on ? "pointer" : ""; };

  return (
    <>
      <CameraRig turns={turns} onHiddenWallsChange={setHiddenWalls} />

      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onPointerMove={(e) => onFloorPointer(e, false)}
        onClick={(e) => onFloorPointer(e, true)}
      >
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial map={floorTexture} roughness={0.65} />
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
        onDoor={() => interact("door")}
      />

      {/* Owned furniture (the one being moved is shown as a ghost instead) */}
      {furniture.map((f) => {
        const item = getCatalogItem(f.itemId);
        if (!item || !f.placement || f.uid === placing?.uid) return null;
        // Wall art disappears with its wall when that wall is cut away.
        if (f.placement.kind === "wall" && hiddenWalls.has(f.placement.wall)) return null;
        return (
          <PlacedTransform key={f.uid} item={item} placement={f.placement}>
<Suspense fallback={null}>
            <group
              onClick={(e) => {
                if (placing || e.delta > DRAG_THRESHOLD) return;
                // Decorating: pick it up to move. Otherwise: use it (sit, sleep, open the fridge).
                if (decorating) { e.stopPropagation(); onPickUp?.(f.uid); return; }
                if (item.interaction) { e.stopPropagation(); interact(item.interaction, f.placement); }
              }}
              onPointerOver={(decorating && !placing) || (item.interaction && !busy) ? hoverCursor(true) : undefined}
              onPointerOut={hoverCursor(false)}
            >
              <ItemVisual item={item} />
            </group>
            </Suspense>
          </PlacedTransform>
        );
      })}

      {/* Placement ghost + footprint */}
      {placingItem && ghost && !(ghost.kind === "wall" && hiddenWalls.has(ghost.wall)) && (
        <PlacedTransform item={placingItem} placement={ghost}>
          <Suspense fallback={null}><ItemVisual item={placingItem} ghost={ghostValid ? "valid" : "invalid"} /></Suspense>
          {ghost.kind === "floor" && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} raycast={() => null}>
              <planeGeometry args={[placingItem.size[0] * CELL, placingItem.size[1] * CELL]} />
              <meshBasicMaterial color={ghostValid ? "#10b981" : "#ef4444"} transparent opacity={0.35} depthWrite={false} />
            </mesh>
          )}
        </PlacedTransform>
      )}

      <Suspense fallback={null}>
        <CitizenAvatar look={look} animation={animation} position={pose.position} rotation={[0, pose.yaw, 0]} />
        {people.map((p, i) => <PersonAvatar key={i} p={p} id={`p${i}`} labels={labels} />)}
      </Suspense>
    </>
  );
}

export function ApartmentRoom(props: ApartmentRoomProps & { loadingLabel?: string }) {
  const labels = useRef(new Map<string, HTMLDivElement>());
  const quality = useMemo(() => canvasQuality(), []);
  return (
    <div className="w-full h-full relative select-none">
      <SceneLoadingOverlay label={props.loadingLabel ?? "Opening your apartment"} />
      <Canvas shadows={quality.shadows ? { type: THREE.PCFShadowMap } : false} camera={{ position: [8, 7.5, 8], fov: 35 }} dpr={quality.dpr}>
        <color attach="background" args={["#7f9c78"]} />
        <StudioEnvironment intensity={0.35} />
        <hemisphereLight args={["#fff7ed", "#6b7280", 1.0]} />
        <directionalLight
          position={[5, 9, 4]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-bias={-0.0005}
        />
        <pointLight position={[0, 2.6, 0]} intensity={6} distance={9} color="#fde68a" />

        <Suspense fallback={null}>
          <RoomScene {...props} labels={labels} />
        </Suspense>

        <OrbitControls
          makeDefault
          target={[0, 0.8, 0]}
          enablePan={false}
          enableDamping
          minPolarAngle={0.35}
          maxPolarAngle={1.25}
          minDistance={6}
          maxDistance={20}
        />
      </Canvas>
      <PeopleLabels people={props.people ?? []} nodes={labels} />
    </div>
  );
}

export type { FloorPlacement };
