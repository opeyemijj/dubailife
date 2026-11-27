"use client";

// A football stadium in 3D for Match Night and the Penalty Shootout: the pitch (striped, with its markings and
// goals), the bowl of seats rising round it in tiers, a crowd that cheers, jumps for goals and does the Mexican
// wave, floodlights, and a roof in the stadium's own style (Lusail's gold lattice, Al Bayt's striped tent,
// Stadium 974's containers, Al Thumama's woven cap, Al Janoub's sails, Khalifa's arch). Light for phones: the crowd
// is one instanced mesh (thinned at lower quality), the pitch one painted texture.

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { stageFx, useGameFrame } from "../../stage";
import { useQuality } from "../../GameStage";

export type StadiumTheme = "gold" | "tent" | "containers" | "cap" | "sails" | "arch" | "dunes" | "classic";
export const PITCH = { w: 68, l: 105 };
/** The crowd's state, shared with the game: a wave going round (its angle), a celebration (until when). */
export interface CrowdState { waveAt: number | null; jumpUntil: number; colours: [string, string] }

function pitchTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 800;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#2f8a3e" : "#35963f"; g.fillRect(0, (i * 800) / 16, 512, 800 / 16); }
  g.strokeStyle = "#f8fafc"; g.lineWidth = 4;
  const m = 20;
  g.strokeRect(m, m, 512 - m * 2, 800 - m * 2);
  g.beginPath(); g.moveTo(m, 400); g.lineTo(512 - m, 400); g.stroke();
  g.beginPath(); g.arc(256, 400, 70, 0, Math.PI * 2); g.stroke();
  for (const top of [true, false]) {
    const y = top ? m : 800 - m, d = top ? 1 : -1;
    g.strokeRect(256 - 150, top ? y : y - 125, 300, 125);
    g.strokeRect(256 - 70, top ? y : y - 45, 140, 45);
    g.beginPath(); g.arc(256, y + d * 85, 4, 0, Math.PI * 2); g.fillStyle = "#f8fafc"; g.fill();
    g.beginPath(); g.arc(256, y + d * 85, 70, top ? 0.65 : Math.PI + 0.65, top ? Math.PI - 0.65 : Math.PI * 2 - 0.65); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function Goal({ z, facing }: { z: number; facing: 1 | -1 }) {
  return (
    <group position={[0, 0, z]} rotation={[0, facing === 1 ? 0 : Math.PI, 0]}>
      {[-3.66, 3.66].map((x) => <mesh key={x} position={[x, 1.22, 0]}><cylinderGeometry args={[0.06, 0.06, 2.44, 8]} /><meshStandardMaterial color="#ffffff" /></mesh>)}
      <mesh position={[0, 2.44, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 7.44, 8]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[0, 1.22, -1.2]}><boxGeometry args={[7.32, 2.44, 0.02]} /><meshStandardMaterial color="#e5e7eb" transparent opacity={0.35} wireframe /></mesh>
      <mesh position={[0, 2.44, -0.6]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[7.32, 1.2]} /><meshStandardMaterial color="#e5e7eb" transparent opacity={0.3} wireframe side={THREE.DoubleSide} /></mesh>
    </group>
  );
}

/** The bowl's seats and the crowd in them: each fan a person (body in a shirt or team colours, head, hair or a
 *  headscarf, arms that go up to cheer), drawn as a few instanced meshes so thousands stay light. Each fan's place is
 *  fixed; the wave and the celebrations move them. */
const SKINS = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#5c3a1e", "#ffdbac"];
const HAIRS = ["#1c1917", "#3b2a1e", "#111827", "#78350f"];
function Crowd({ state, theme }: { state: React.MutableRefObject<CrowdState>; theme: StadiumTheme }) {
  const quality = useQuality();
  const { body, head, hair, arms, seats } = useMemo(() => {
    const per = quality === 2 ? 1 : quality === 1 ? 0.65 : 0.4;
    const seats: Array<{ x: number; y: number; z: number; a: number; phase: number; hair: boolean }> = [];
    for (let tier = 0; tier < 14; tier++) {
      const rx = PITCH.w / 2 + 9 + tier * 1.6, rz = PITCH.l / 2 + 9 + tier * 1.6, y = 1.2 + tier * 1.05;
      const n = Math.round((150 + tier * 10) * per);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const x = Math.cos(a) * rx, z = Math.sin(a) * rz;
        // The seats round yours at Match Night are real fans (MatchGame's Neighbours), so none here.
        if (Math.hypot(x - (PITCH.w / 2 + 19), z - 2) < 3.2 && y > 7 && y < 11) continue;
        seats.push({ x, y, z, a, phase: (k * 7.3 + tier) % 6.28, hair: (k + tier) % 4 !== 0 });
      }
    }
    const make = (geo: THREE.BufferGeometry) => new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.85 }), seats.length);
    // A rounded torso (shoulders to hips), the head on top, a cap of hair or a headscarf, and both arms in one mesh
    // (scaled up from the shoulders when cheering).
    const body = make(new THREE.CapsuleGeometry(0.2, 0.42, 3, 8));
    const head = make(new THREE.SphereGeometry(0.15, 10, 8));
    const hair = make(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2));
    const armGeo = new THREE.BoxGeometry(0.08, 0.5, 0.08);
    const left = armGeo.clone().translate(-0.25, 0.25, 0), right = armGeo.clone().translate(0.25, 0.25, 0);
    const armsGeo = new THREE.BufferGeometry();
    armsGeo.setAttribute("position", new THREE.Float32BufferAttribute([...left.attributes.position.array, ...right.attributes.position.array], 3));
    armsGeo.setAttribute("normal", new THREE.Float32BufferAttribute([...left.attributes.normal.array, ...right.attributes.normal.array], 3));
    const li = left.index!.array, n0 = left.attributes.position.count;
    armsGeo.setIndex([...li, ...Array.from(right.index!.array, (v) => v + n0)]);
    const arms = make(armsGeo);
    const palette = theme === "containers" ? ["#dc2626", "#2563eb", "#f8fafc", "#facc15"] : ["#8a1538", "#f8fafc", "#8a1538", "#e5e7eb", "#1f2937"];
    const col = new THREE.Color();
    seats.forEach((p, i) => {
      const shirt = palette[i % palette.length];
      body.setColorAt(i, col.set(shirt)); arms.setColorAt(i, col.set(shirt));
      head.setColorAt(i, col.set(SKINS[(i * 7) % SKINS.length]));
      hair.setColorAt(i, col.set(p.hair ? HAIRS[i % HAIRS.length] : (i % 2 ? "#f8fafc" : "#111827")));
    });
    return { body, head, hair, arms, seats };
  }, [quality, theme]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useGameFrame((_, t) => {
    const s = state.current;
    const jumping = t < s.jumpUntil;
    for (let i = 0; i < seats.length; i++) {
      const p = seats[i];
      let lift = Math.sin(t * 3 + p.phase) * 0.03, up = 0.15;
      if (jumping) { const j = Math.abs(Math.sin(t * 9 + p.phase)); lift += j * 0.4; up = 0.6 + j * 0.4; }
      if (s.waveAt !== null) {
        const d = Math.abs(((p.a - s.waveAt + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (d < 0.25) { lift += (0.25 - d) * 3.2; up = Math.max(up, 1); }
      }
      const yaw = -p.a + Math.PI / 2, base = p.y + lift;
      o.rotation.set(0, yaw, 0); o.scale.set(1, 1, 1);
      o.position.set(p.x, base + 0.42, p.z); o.updateMatrix(); body.setMatrixAt(i, o.matrix);
      o.position.set(p.x, base + 0.92, p.z); o.updateMatrix(); head.setMatrixAt(i, o.matrix);
      o.position.set(p.x, base + 0.95, p.z); o.updateMatrix(); hair.setMatrixAt(i, o.matrix);
      // Arms from the shoulders: down at their sides, up in the air when they cheer or do the wave.
      o.position.set(p.x, base + 0.62, p.z); o.scale.set(1, up < 0.3 ? -0.8 : up, 1); o.updateMatrix(); arms.setMatrixAt(i, o.matrix);
    }
    markDirty(body); markDirty(head); markDirty(hair); markDirty(arms);
  });
  return <group><primitive object={body} /><primitive object={head} /><primitive object={hair} /><primitive object={arms} /></group>;
}

/** The roof, in the stadium's own style. */
function Roof({ theme }: { theme: StadiumTheme }) {
  const rx = PITCH.w / 2 + 34, rz = PITCH.l / 2 + 34, y = 19;
  const segs = 48;
  const pieces = useMemo(() => Array.from({ length: segs }, (_, i) => {
    const a = (i / segs) * Math.PI * 2;
    return { a, x: Math.cos(a) * rx, z: Math.sin(a) * rz };
  }), [rx, rz]);
  const colour = (i: number) =>
    theme === "gold" ? "#d4a53a" : theme === "tent" ? (i % 2 ? "#111827" : "#f5f5f4") : theme === "containers" ? ["#dc2626", "#2563eb", "#ea580c", "#facc15", "#16a34a"][i % 5]
      : theme === "dunes" ? "#d9b98a" : theme === "cap" ? "#f8fafc" : "#e5e7eb";
  return (
    <group>
      {pieces.map((p, i) => (
        <mesh key={i} position={[p.x, y + (theme === "tent" ? Math.sin(i * 0.5) * 1.2 : 0), p.z]} rotation={[0, -p.a + Math.PI / 2, theme === "sails" ? 0.35 : 0.18]}>
          <boxGeometry args={[(2 * Math.PI * (rx + rz) / 2) / segs + 0.3, 0.5, 14]} />
          <meshStandardMaterial color={colour(i)} metalness={theme === "gold" ? 0.6 : 0.1} roughness={0.5} />
        </mesh>
      ))}
      {theme === "arch" && <mesh position={[0, 26, 0]} rotation={[0, 0, 0]}><torusGeometry args={[rx * 0.95, 0.8, 8, 48, Math.PI]} /><meshStandardMaterial color="#f8fafc" /></mesh>}
      {/* The bowl's outer wall below the roof. */}
      <mesh position={[0, 9, 0]}><cylinderGeometry args={[rx + 2, rx + 2, 18, 48, 1, true]} /><meshStandardMaterial color={theme === "gold" ? "#a16207" : theme === "tent" ? "#1f2937" : "#cbd5e1"} side={THREE.BackSide} /></mesh>
    </group>
  );
}

/** The seating tiers (concrete steps under the crowd). */
function Tiers() {
  const geo = useMemo(() => {
    const shape: THREE.Vector2[] = [];
    for (let tier = 0; tier <= 14; tier++) { const r = 1 + tier * 0.03; shape.push(new THREE.Vector2(r, tier * 1.05)); shape.push(new THREE.Vector2(r + 0.03, tier * 1.05)); }
    return shape;
  }, []);
  return (
    <group scale={[PITCH.w / 2 + 9, 1, PITCH.l / 2 + 9]}>
      <mesh><latheGeometry args={[geo, 64]} /><meshStandardMaterial color="#64748b" side={THREE.DoubleSide} roughness={1} /></mesh>
    </group>
  );
}

export function StadiumScene({ theme, crowd, children }: { theme: StadiumTheme; crowd: React.MutableRefObject<CrowdState>; children?: React.ReactNode }) {
  const tex = useMemo(() => pitchTexture(), []);
  return (
    <group>
      <hemisphereLight args={["#e0f2fe", "#14532d", 0.7]} />
      <directionalLight position={[30, 60, 20]} intensity={1.4} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <group key={i} position={[sx * (PITCH.w / 2 + 30), 0, sz * (PITCH.l / 2 + 30)]}>
          <mesh position={[0, 15, 0]}><cylinderGeometry args={[0.4, 0.6, 30, 8]} /><meshStandardMaterial color="#94a3b8" /></mesh>
          <mesh position={[0, 30, 0]}><boxGeometry args={[4, 2.4, 0.6]} /><meshStandardMaterial color="#fffbeb" emissive="#fffbeb" emissiveIntensity={1.4} /></mesh>
        </group>
      ))}
      <pointLight position={[0, 40, 0]} intensity={2} distance={200} />
      {/* Grass round the pitch, then the pitch itself. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}><planeGeometry args={[PITCH.w + 16, PITCH.l + 16]} /><meshStandardMaterial color="#2a7a37" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[PITCH.w, PITCH.l]} /><meshStandardMaterial map={tex} /></mesh>
      <Goal z={-PITCH.l / 2} facing={1} />
      <Goal z={PITCH.l / 2} facing={-1} />
      {/* Advertising boards round the pitch, in the stadium's maroon. */}
      {[-1, 1].map((s) => <mesh key={`b${s}`} position={[s * (PITCH.w / 2 + 3), 0.5, 0]}><boxGeometry args={[0.2, 1, PITCH.l]} /><meshStandardMaterial color="#8a1538" emissive="#8a1538" emissiveIntensity={0.35} /></mesh>)}
      <Tiers />
      <Crowd state={crowd} theme={theme} />
      <Roof theme={theme} />
      {children}
    </group>
  );
}

/** A footballer: a simple figure in the team's kit (light enough for 22 of them on a phone). */
export function Player({ kit, shorts, skin = "#c58c5a", keeper = false }: { kit: string; shorts: string; skin?: string; keeper?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.32, 0.9, 0.2]} /><meshStandardMaterial color={shorts} /></mesh>
      <mesh position={[0, 1.2, 0]}><boxGeometry args={[0.5, 0.62, 0.28]} /><meshStandardMaterial color={keeper ? "#facc15" : kit} /></mesh>
      <mesh position={[0, 1.68, 0]}><sphereGeometry args={[0.16, 10, 8]} /><meshStandardMaterial color={skin} /></mesh>
    </group>
  );
}

export function Ball({ at }: { at: React.RefObject<THREE.Group | null> }) {
  return <group ref={at}><mesh castShadow><sphereGeometry args={[0.22, 16, 12]} /><meshStandardMaterial color="#ffffff" roughness={0.4} /></mesh></group>;
}

const markDirty = (m: THREE.InstancedMesh) => { m.instanceMatrix.needsUpdate = true; };
/** Make the crowd jump for joy for a few seconds (game time). */
export const cheer = (c: CrowdState, seconds: number) => { c.jumpUntil = stageFx.clock + seconds; };

/** A shared ref for the crowd, from the game. */
export const useCrowd = (colours: [string, string] = ["#8a1538", "#f8fafc"]) => useRef<CrowdState>({ waveAt: null, jumpUntil: 0, colours });
