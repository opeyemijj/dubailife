"use client";

// The Dubai Life Airways jet (fictional livery): a twin-engine wide-body drawn in code, nose towards +z, wheels on
// y = 0, about 64 m long with a 62 m wingspan. White body with a teal belly stripe, a teal tail with the gold
// falcon, lit cabin windows, spinning fans and the gear (tucked away in flight).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import FLIGHTS from "@/data/flights/flights.json";

const C = FLIGHTS.airline.colors;
const L = 64, R = 3.1;
/** The cabin floor's height above the ground with the gear down (the jet bridge meets the front door here). */
export const DOOR_HEIGHT = 5.2;
/** Where the front left door is (plane coordinates). */
export const FRONT_DOOR = { x: -R, z: L / 2 - 9 };

function Engine({ x, spin }: { x: number; spin: React.RefObject<number> }) {
  const fan = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (fan.current) fan.current.rotation.z += dt * (spin.current ?? 0); });
  return (
    <group position={[x, -1.3, 6]}>
      {/* Nacelle, intake lip and the exhaust cone */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[1.55, 1.35, 6.5, 28, 1, true]} /><meshStandardMaterial color="#e5e7eb" metalness={0.55} roughness={0.3} side={THREE.DoubleSide} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 3.25]}><torusGeometry args={[1.5, 0.12, 10, 28]} /><meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.2} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -3.8]}><coneGeometry args={[0.8, 1.8, 20]} /><meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.35} /></mesh>
      <group ref={fan} position={[0, 0, 2.9]}>
        <mesh><circleGeometry args={[1.38, 28]} /><meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} /></mesh>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} rotation={[0, 0, (i / 12) * Math.PI * 2]} position={[0, 0, 0.02]}><boxGeometry args={[0.16, 2.5, 0.04]} /><meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.3} /></mesh>
        ))}
        <mesh position={[0, 0, 0.08]}><coneGeometry args={[0.32, 0.5, 16]} /><meshStandardMaterial color="#e5e7eb" metalness={0.6} /></mesh>
      </group>
      {/* The pylon up to the wing */}
      <mesh position={[0, 1.4, 0.4]}><boxGeometry args={[0.35, 1.4, 4]} /><meshStandardMaterial color={C.body} roughness={0.4} /></mesh>
    </group>
  );
}

/** A swept wing (left when side is -1) as a thin extruded plan form. */
function Wing({ side }: { side: 1 | -1 }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    // Plan in (x = span outwards, y = along the body): root chord 12 m, tip 2.6 m, swept back 14 m.
    s.moveTo(0, 6); s.lineTo(29, -8); s.lineTo(29, -10.6); s.lineTo(0, -6); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 2 });
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  return (
    <group position={[side * (R - 0.4), -0.9, 2]} scale={[side, 1, 1]} rotation={[0, 0, side * 0.07]}>
      <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial color="#f1f5f9" metalness={0.25} roughness={0.35} /></mesh>
      {/* The winglet, in the tail's teal */}
      <mesh position={[29.2, 1.4, -9.6]} rotation={[0, 0, -0.25]}><boxGeometry args={[0.3, 3, 2.4]} /><meshStandardMaterial color={C.tail} roughness={0.35} /></mesh>
      {/* Nav light at the tip: red on the left, green on the right */}
      <mesh position={[29.3, 0.1, -9.2]}><sphereGeometry args={[0.18, 10, 8]} /><meshBasicMaterial color={side < 0 ? "#ef4444" : "#22c55e"} /></mesh>
    </group>
  );
}

export function Airliner({ gear = 1, spin, lights = true, inside = false, children }: {
  /** Landing gear: 1 down, 0 tucked away (a parent can also scale the group named "gear"). */
  gear?: number;
  /** How fast the fans turn (radians a second), read every frame. */
  spin: React.RefObject<number>;
  lights?: boolean;
  /** Seen from a seat inside: the fuselage's skin is left off so the windows look out (the cabin is `children`). */
  inside?: boolean;
  children?: React.ReactNode;
}) {
  // The body: a lathed profile, round nose and a tapering tail cone.
  const body = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, z = -L / 2 + t * L;
      let r = R;
      if (t > 0.9) r = R * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.9) / 0.1, 2))) ;
      if (t < 0.22) r = R * (0.32 + 0.68 * Math.pow(t / 0.22, 0.75));
      pts.push(new THREE.Vector2(Math.max(0.05, r), z));
    }
    const g = new THREE.LatheGeometry(pts, 40);
    g.rotateX(Math.PI / 2);
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);
  // The cabin windows down each side, and the cockpit's.
  const windows = useMemo(() => Array.from({ length: 46 }, (_, i) => -L / 2 + 14 + i * 0.95).filter((z) => Math.abs(z - (L / 2 - 9)) > 1.2 && Math.abs(z - 4) > 1.2), []);
  const glow = lights ? "#fde68a" : "#334155";
  return (
    <group position={[0, DOOR_HEIGHT - 0.4 + R * 0.35, 0]}>
      {children}
      {!inside && <>
      <mesh geometry={body} castShadow receiveShadow><meshStandardMaterial color={C.body} metalness={0.2} roughness={0.32} /></mesh>
      {/* The teal belly stripe and a fine gold cheat line */}
      <mesh position={[0, 0, 1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[R + 0.012, R + 0.012, L * 0.62, 40, 1, true, Math.PI * 1.75, Math.PI * 0.5]} /><meshStandardMaterial color={C.tail} roughness={0.35} side={THREE.DoubleSide} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={`cl${s}`} position={[s * (R + 0.01), -0.55, -1]}><boxGeometry args={[0.02, 0.12, L * 0.68]} /><meshStandardMaterial color={C.accent} metalness={0.7} roughness={0.3} /></mesh>
      ))}
      {/* Windows */}
      {[-1, 1].map((s) => windows.map((z) => (
        <mesh key={`w${s}${z}`} position={[s * (R + 0.02), 0.45, z]} rotation={[0, s * Math.PI / 2, 0]}><planeGeometry args={[0.32, 0.46]} /><meshBasicMaterial color={glow} /></mesh>
      )))}
      {/* Cockpit glass */}
      <mesh position={[0, 0.9, L / 2 - 3.2]} rotation={[-0.6, 0, 0]}><boxGeometry args={[2.6, 0.6, 0.1]} /><meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.1} /></mesh>
      {/* The doors (outlined), front left is where you board */}
      {[L / 2 - 9, 4, -L / 2 + 16].map((z) => [-1, 1].map((s) => (
        <mesh key={`d${z}${s}`} position={[s * (R + 0.015), 0.05, z]} rotation={[0, s * Math.PI / 2, 0]}><planeGeometry args={[1.05, 1.9]} /><meshStandardMaterial color="#e2e8f0" roughness={0.4} /></mesh>
      )))}
      {/* The name along the front, in teal */}
      <AirlineName />
      </>}
      <Wing side={-1} /><Wing side={1} />
      <Engine x={-9.5} spin={spin} /><Engine x={9.5} spin={spin} />
      {/* The fin with the gold falcon, and the tailplanes */}
      <group position={[0, R * 0.6, -L / 2 + 6]}>
        <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
          <extrudeGeometry args={[(() => { const s = new THREE.Shape(); s.moveTo(-4, 0); s.lineTo(4.5, 0); s.lineTo(-2.2, 11); s.lineTo(-5.4, 11); s.closePath(); return s; })(), { depth: 0.5, bevelEnabled: false }]} />
          <meshStandardMaterial color={C.tail} roughness={0.35} />
        </mesh>
        <Falcon />
        {[-1, 1].map((s) => (
          <mesh key={`tp${s}`} position={[s * 5, -R * 0.4, -1]} rotation={[0, s * -0.35, s * 0.08]}><boxGeometry args={[9, 0.35, 3.2]} /><meshStandardMaterial color="#f1f5f9" roughness={0.35} /></mesh>
        ))}
      </group>
      {/* Landing gear: nose and two main bogies (scaled away in flight) */}
      <group name="gear" position={[0, -(DOOR_HEIGHT - 0.4 + R * 0.35), 0]} scale={[1, Math.max(0.01, gear), 1]} visible={gear > 0.05}>
        {[{ x: 0, z: L / 2 - 6, n: 1 }, { x: -3.2, z: 0, n: 2 }, { x: 3.2, z: 0, n: 2 }].map((g, i) => (
          <group key={i} position={[g.x, 0, g.z]}>
            <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.18, 0.18, 3.2, 10]} /><meshStandardMaterial color="#9ca3af" metalness={0.8} /></mesh>
            {Array.from({ length: g.n * 2 }, (_, k) => (
              <mesh key={k} position={[(k % 2 ? 0.45 : -0.45), 0.6, (Math.floor(k / 2) - (g.n - 1) / 2) * 1.5]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.6, 0.6, 0.45, 16]} /><meshStandardMaterial color="#111827" roughness={0.9} /></mesh>
            ))}
          </group>
        ))}
      </group>
      {/* Anti-collision beacon */}
      <Beacon />
    </group>
  );
}

function AirlineName() {
  const tex = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas"); c.width = 1024; c.height = 128;
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, 1024, 128);
    g.font = "bold 86px system-ui, sans-serif"; g.fillStyle = C.tail; g.textBaseline = "middle";
    g.fillText(FLIGHTS.airline.name.toUpperCase(), 10, 66);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  if (!tex) return null;
  return (
    <>
      {[-1, 1].map((s) => (
        // Mirrored on the right so the name reads nose-to-tail the right way round from either side.
        <mesh key={s} position={[s * (R + 0.03), 1.35, L / 2 - 20]} rotation={[0, s * Math.PI / 2, 0]} scale={[-s, 1, 1]}>
          <planeGeometry args={[14, 1.75]} /><meshBasicMaterial map={tex} transparent toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

/** The airline's gold falcon on both sides of the fin. */
function Falcon() {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.quadraticCurveTo(1.6, 1.2, 3.6, 1.0); s.lineTo(2.2, 2.6); s.quadraticCurveTo(0.6, 2.4, -0.6, 3.8);
    s.quadraticCurveTo(-0.2, 2.2, -1.6, 1.6); s.quadraticCurveTo(-0.6, 1.1, 0, 0);
    return s;
  }, []);
  return (
    <>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * 0.3, 3.4, -0.6]} rotation={[0, k * Math.PI / 2, 0]} scale={[1, 1, 1]}>
          <shapeGeometry args={[shape]} /><meshStandardMaterial color={C.accent} metalness={0.3} roughness={0.35} emissive={C.accent} emissiveIntensity={0.35} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function Beacon() {
  const m = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => { if (m.current) m.current.opacity = Math.sin(clock.elapsedTime * 6) > 0.6 ? 1 : 0.1; });
  return <mesh position={[0, R + 0.1, 2]}><sphereGeometry args={[0.2, 10, 8]} /><meshBasicMaterial ref={m} color="#ef4444" transparent /></mesh>;
}
