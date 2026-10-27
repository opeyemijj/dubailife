"use client";

import { canvasQuality } from "@/lib/device";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { AvatarLookProps } from "../onboarding/AvatarCanvas";
import { restPose, type RestPose } from "./restPose";
import { LuxuryDecor } from "./LuxuryDecor";
import { buildNav, findPath, type Rect, type Seg } from "./homeNav";
import { HomeFixtures } from "./HomeFixtures";
import { fixtureRect, fixtureSpot, fixturesFor, fixtureWallsFor, type Fixture } from "@/lib/homeFixtures";
import { CitizenAvatar, StudioEnvironment, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import { SceneLoadingOverlay } from "@/components/GameLoadingScreen";
import {
  AVATAR_SPOT, BUILT_INS, CELL, DOOR, GRID, LAYOUT_SCALE, ROOM_SIZE, WALL_HEIGHT, WINDOW,
  findFreePlacement, floorCenter, floorPlacementAt, getCatalogItem, isPlacementValid, levelOf, rotatedSize, wallOffsetAt, wallTransform, withHomeItems,
  HOUSING_CONFIGS, type FloorFinish, type HomeStyle, type HousingTier, type LevelDef, type RoomZone,
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

export interface PlacingState {
  uid: string;
  itemId: string;
  rot: Rotation;
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
  /** "inside": an over-the-shoulder camera in the room with the citizen, instead of looking down on the home. */
  view?: "above" | "inside";
  /** Active room focus in multi-room flats (e.g. 2-bedroom) */
  activeRoomId?: string;
  onSelectRoom?: (roomId: string) => void;
  onPlace?: (uid: string, placement: Placement) => void;
  onPickUp?: (uid: string) => void;
  /** Called when a tap lands somewhere the item doesn't fit. */
  onPlaceBlocked?: () => void;
  onInteractObject?: (type: Interaction) => void;
  /** A kitchen or bathroom fixture was reached and is being used (see HomeFixtures). */
  onUseFixture?: (f: Fixture) => void;
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
function FlatScreenTVOnStand({ size, ghost }: { size: [number, number]; ghost?: "valid" | "invalid" }) {
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


function ItemVisual({ item, ghost }: { item: CatalogItem; ghost?: "valid" | "invalid" }) {
  if (item.visual) return <LuxuryDecor visual={item.visual} size={item.size} ghost={ghost} />;
  if (item.id === "tv" || item.id.includes("tv")) return <FlatScreenTVOnStand size={item.size} ghost={ghost} />;
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
        <mesh key={i} position={[(p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, -WALL_THICKNESS / 2]} receiveShadow castShadow>
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
    if (finish === "oak" || finish === "walnut") {
      const tones = finish === "oak" ? ["#c8935f", "#bf8954", "#cf9c68", "#b98250", "#c48f5b"] : ["#5b3a24", "#4f321f", "#664229", "#563621", "#6b4630"];
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
    } else if (finish === "herringbone") {
      const tones = ["#b98a57", "#a97a49", "#c4955f", "#b07f4d"];
      const L = 96, W = 24;
      ctx.fillStyle = "#a97a49";
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
      const base = finish === "white-marble" ? "#f1efeb" : finish === "black-marble" ? "#17171a" : "#dfcfb3";
      const vein = finish === "white-marble" ? "rgba(120,120,130,0.45)" : finish === "black-marble" ? "rgba(235,235,235,0.55)" : "rgba(160,130,90,0.35)";
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);
      if (finish === "travertine") {
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
          <mesh position={[0, (p.y0 + p.y1) / 2, 0]} receiveShadow castShadow>
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
  targetPos,
  follow,
  followYaw = 0,
  inside,
  onHiddenWallsChange,
}: {
  turns: number;
  upView?: boolean;
  targetPos?: [number, number, number];
  /** Where the citizen is: the camera follows them from room to room. */
  follow?: [number, number, number];
  followYaw?: number;
  inside?: boolean;
  onHiddenWallsChange: (walls: Set<Wall>) => void;
}) {
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const lastTurns = useRef(turns);
  const swing = useRef<{ from: number; to: number; t: number } | null>(null);
  const lastKey = useRef("");

  // Pull back on narrow (portrait) screens so the whole room fits.
  useEffect(() => {
    if (!controls) return;
    const dist = inside ? 2.8 : size.width / size.height < 0.8 ? 19 : 14;
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    controls.update();
  }, [controls, camera, size.width, size.height, inside]);
  // Where the citizen was last frame, so the camera can move along with them.
  const lastFollow = useRef<[number, number, number] | null>(null);

  useEffect(() => {
    if (!controls || turns === lastTurns.current) return;
    const from = controls.getAzimuthalAngle();
    swing.current = { from, to: from + (turns - lastTurns.current) * (Math.PI / 2), t: 0 };
    lastTurns.current = turns;
  }, [turns, controls]);

  useFrame((_, dt) => {
    if (!controls) return;

    if (inside && follow) {
      // Over the shoulder: aim at the citizen's head; while they walk, settle in behind them.
      const head = new THREE.Vector3(follow[0], 1.45, follow[2]);
      const moved = lastFollow.current ? Math.hypot(follow[0] - lastFollow.current[0], follow[2] - lastFollow.current[2]) : 0;
      const shift = head.clone().sub(controls.target);
      controls.target.add(shift);
      camera.position.add(shift);
      if (moved > 0.0005) {
        const behind = new THREE.Vector3(follow[0] - Math.sin(followYaw) * 2.6, 2.3, follow[2] - Math.cos(followYaw) * 2.6);
        camera.position.lerp(behind, Math.min(1, dt * 2.5));
      }
      lastFollow.current = follow;
      controls.update();
    } else if (follow && !upView) {
      // Above: follow the citizen from room to room, gliding rather than jumping.
      const k = Math.min(1, dt * 3);
      const dx = (follow[0] - controls.target.x) * k, dz = (follow[2] - controls.target.z) * k;
      controls.target.x += dx; controls.target.z += dz;
      camera.position.x += dx; camera.position.z += dz;
      lastFollow.current = follow;
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

    const targetElevation = upView ? 15.0 : 7.2;
    if (!inside && Math.abs(camera.position.y - targetElevation) > 0.05) {
      camera.position.y += (targetElevation - camera.position.y) * Math.min(1, dt * 3.5);
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
  furniture: ownFurniture = [],
  placing,
  decorating,
  turns = 0,
  housingTier = "studio",
  upView = false,
  view = "above",
  activeRoomId,
  onSelectRoom,
  onPlace,
  onPickUp,
  onPlaceBlocked,
  onInteractObject,
  onUseFixture,
  level = 0,
  onChangeLevel,
  homeStyle,
  people = [],
  labels,
}: ApartmentRoomProps & { labels: LabelNodes }) {
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
  const [pose, setPose] = useState<Pose>(STAND);
  const [walkTarget, setWalkTarget] = useState<[number, number] | null>(null);
  // The route there: round walls and furniture, through doorways (see homeNav.ts).
  const routeRef = useRef<{ for: [number, number]; points: Array<[number, number]> } | null>(null);
  // The kitchen and bathroom on this floor, and the bathroom's walls.
  const fixtures = useMemo(() => fixturesFor(housingTier, lvl), [housingTier, lvl]);
  const fixtureWalls = useMemo(() => fixtureWallsFor(housingTier, lvl), [housingTier, lvl]);
  const nav = useMemo(() => {
    // The whole floor (room zones leave gaps round the walls; the walls themselves keep rooms apart), and the balcony.
    const roomRects: Rect[] = [{ minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF }, ...(rooms ?? []).filter((r) => r.id === "balcony").map((r) => r.bounds)];
    const walls: Seg[] = [...(levelDef ? levelDef.walls : config.walls ?? [])];
    // The south wall, with its glass door out to the balcony.
    if (rooms?.some((r) => r.id === "balcony")) walls.push({ a: [-HALF, HALF], b: [HALF, HALF], door: [HALF - 0.5, HALF + 0.5] });
    walls.push(...fixtureWalls);
    const blocks: Rect[] = [...(levelDef ? [] : config.blocks ?? []), ...fixtures.map(fixtureRect)];
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
  }, [rooms, levelDef, config, furniture, housingTier, lvl, fixtures, fixtureWalls]);
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

  // Click-to-walk destination locomotion
  const handleFloorLocomotion = (point: THREE.Vector3) => {
    if (busy || climbRef.current) return;
    const clampedX = Math.max(-HALF + 0.3, Math.min(HALF - 0.3, point.x));
    const clampedZ = Math.max(-HALF + 0.3, Math.min(HALF + (rooms?.some((r) => r.id === "balcony") ? 1.6 : -0.3), point.z));

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

  useEffect(() => {
    if (currentRoom) {
      setWalkTarget([currentRoom.center[0], currentRoom.center[2]]);
      setClickBeacon({ x: currentRoom.center[0], z: currentRoom.center[2], time: performance.now() });
    }
  }, [currentRoom]);

  // Smooth frame locomotion update
  useFrame((_, dt) => {
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

  // The ghost starts where the item already is (or the nearest free spot), follows the pointer,
  // and keeps its centre when rotated.
  const ghost = useMemo<Placement | null>(() => {
    if (!placing || !placingItem) return null;
    const base = moved?.uid === placing.uid ? moved.placement : furniture.find((f) => f.uid === placing.uid)?.placement;
    if (base && levelOf(base) === lvl && base.kind === (placingItem.kind === "wall" ? "wall" : "floor")) {
      return base.kind === "floor" ? floorPlacementAt(placingItem.size, placing.rot, floorCenter(placingItem.size, base), lvl) : base;
    }
    const others = furniture.filter((f) => f.uid !== placing.uid);
    return findFreePlacement(placingItem, others, placingItem.kind === "wall" ? undefined : placing.rot, lvl)
      ?? (placingItem.kind === "wall" ? { kind: "wall", wall: "north", offset: 1, ...(lvl ? { level: lvl } : {}) } : floorPlacementAt(placingItem.size, placing.rot, { x: 0, z: 0.5 }, lvl));
  }, [placing, placingItem, moved, furniture, lvl]);

  const ghostValid = !!(ghost && placingItem && isPlacementValid(placingItem, ghost, furniture, placing?.uid));

  const onFloorPointer = (e: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>, click: boolean) => {
    if (placing && placingItem && placingItem.kind !== "wall") {
      if (click && e.delta > DRAG_THRESHOLD) return;
      const next = floorPlacementAt(placingItem.size, placing.rot, e.point, lvl);
      setMoved({ uid: placing.uid, placement: next });
      if (click) {
        e.stopPropagation();
        if (isPlacementValid(placingItem, next, furniture, placing.uid)) onPlace?.(placing.uid, next);
        else onPlaceBlocked?.();
      }
      return;
    }

    if (click && !decorating) {
      if (e.delta > DRAG_THRESHOLD) return;
      e.stopPropagation();
      handleFloorLocomotion(e.point);
    }
  };

  const onWallPointer = (wall: Wall, e: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>, click: boolean) => {
    if (!placing || !placingItem || placingItem.kind !== "wall") return;
    if (click && e.delta > DRAG_THRESHOLD) return;
    const next = { kind: "wall" as const, wall, offset: wallOffsetAt(wall, e.point, placingItem.size[0]), ...(lvl ? { level: lvl } : {}) };
    setMoved({ uid: placing.uid, placement: next });
    if (click) {
      e.stopPropagation();
      if (isPlacementValid(placingItem, next, furniture, placing.uid)) onPlace?.(placing.uid, next);
      else onPlaceBlocked?.();
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

  const hoverCursor = (on: boolean) => () => { document.body.style.cursor = on ? "pointer" : ""; };

  return (
    <>
      <CameraRig
        turns={turns}
        upView={upView}
        targetPos={targetPos}
        follow={upView ? undefined : pose.position}
        followYaw={pose.yaw}
        inside={view === "inside" && !upView}
        onHiddenWallsChange={setHiddenWalls}
      />

      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onPointerMove={(e) => onFloorPointer(e, false)}
        onClick={(e) => onFloorPointer(e, true)}
      >
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial
          map={floorTexture}
          roughness={style.floor.includes("marble") ? 0.18 : style.floor === "travertine" ? 0.55 : 0.65}
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
        onDoor={() => interact("door")}
        wallColor={style.wall}
        skirtingColor={config.skirtingColor}
        upstairs={lvl > 0}
        panels={style.panels}
        balcony={!!rooms?.some((r) => r.id === "balcony")}
      />

      {/* The kitchen and bathroom */}
      <HomeFixtures
        fixtures={fixtures}
        walls={fixtureWalls}
        wallColor={style.wall}
        skirtingColor={config.skirtingColor}
        wallH={upView ? 1.15 : 2.6}
        onUse={busy ? undefined : (f) => {
          if (climbRef.current) return;
          if (animTimer.current) { clearTimeout(animTimer.current); animTimer.current = null; }
          getUp();
          const spot = fixtureSpot(f);
          setWalkTarget([spot.x, spot.z]);
          setClickBeacon({ x: spot.x, z: spot.z, time: performance.now() });
          setPendingAction({ type: "cooler", fixture: f });
        }}
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
                  if (item.interaction) { e.stopPropagation(); interact(item.interaction, item, f.placement); }
                }}
                onPointerOver={(decorating && !placing && !item.fixed) || (item.interaction && !busy) ? hoverCursor(true) : undefined}
                onPointerOut={hoverCursor(false)}
              >
                <ItemVisual item={item} />

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
        <group position={pose.position} rotation={[0, pose.yaw, 0]}>
          {/* Asleep: laid flat on the back, head along the bed. */}
          <CitizenAvatar look={look} animation={animation} rotation={pose.lie ? [-Math.PI / 2, 0, 0] : [0, 0, 0]} />
        </group>
        {people.map((p, i) => <PersonAvatar key={i} p={p} id={`p${i}`} labels={labels} />)}
      </Suspense>
    </>
  );
}

export function ApartmentRoom(props: ApartmentRoomProps & { loadingLabel?: string; /** "transparent" shows the page behind the room. */ background?: string }) {
  const labels = useRef(new Map<string, HTMLDivElement>());
  const quality = useMemo(() => canvasQuality(), []);
  return (
    <div className="w-full h-full relative select-none">
      <SceneLoadingOverlay label={props.loadingLabel ?? "Opening your apartment"} />
      <Canvas shadows={quality.shadows ? { type: THREE.PCFShadowMap } : false} camera={{ position: [11.5, 10.7, 11.5], fov: 35 }} dpr={quality.dpr}>
        {props.background !== "transparent" && <color attach="background" args={[props.background ?? "#7f9c78"]} />}
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
          minPolarAngle={props.upView ? 0.2 : props.view === "inside" ? 0.6 : 0.35}
          maxPolarAngle={props.upView ? 1.15 : props.view === "inside" ? 1.5 : 1.25}
          minDistance={props.view === "inside" && !props.upView ? 1.2 : 6}
          maxDistance={props.view === "inside" && !props.upView ? 5 : 30}
        />
      </Canvas>
      <PeopleLabels people={props.people ?? []} nodes={labels} />
    </div>
  );
}

export type { FloorPlacement };
