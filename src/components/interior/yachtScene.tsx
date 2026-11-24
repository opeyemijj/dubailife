"use client";

// A yacht party out on the water off Dubai (the "yacht" venue layout, drawn round its open deck: `width` × `depth`,
// bow towards -z). The deck stays put for the people walking on it; everything else moves the way it would from a
// yacht under way:
//  - the sea is a wave shader (a few swells rolling together, sun glints, white caps on the crests), flowing past at
//    cruising speed, so the yacht is always making way;
//  - the yacht pitches and rolls gently on the swell (drawn as the sea and the coast tilting around the deck, which
//    is the same thing to anyone on board, and leaves the deck level to walk on);
//  - a foaming wake opens out behind the stern and spray curls off the bow;
//  - the coast slowly turns round you as the yacht cruises: Dubai Marina and JBR, Ain Dubai, the Palm with Atlantis,
//    the Burj Al Arab, so every view changes over a few minutes;
//  - golden hour in a warm sky, or night when the party lights go down: the towers light up, LED strips glow round
//    the deck, the underwater lights turn the sea blue round the hull.
// The superyacht itself: a sleek white hull with a navy boot stripe, glass balustrades with a chrome rail, a swim
// platform at the stern, the flybridge and its radar arch at the bow, and festoon lights strung down to the stern.

import { createContext, useContext, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Night on the water: the party's lights are down (InteriorScene provides it). */
export const YachtNight = createContext(false);

/** How fast the yacht cruises (m/s, about 10 knots), and the waterline below the deck. */
const SPEED = 5;
const WATER = -1.4;

// ---------------------------------------------------------------- the sea

const SEA_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormal2;
  varying float vH;
  // A few swells of different lengths and directions; the water flows past (+z) as the yacht makes way (-z).
  vec3 wave(vec2 p, vec2 dir, float len, float amp, float speed) {
    float k = 6.2831853 / len;
    float ph = dot(dir, p) * k - uTime * speed;
    return vec3(amp * sin(ph), amp * k * cos(ph) * dir.x, amp * k * cos(ph) * dir.y);
  }
  void main() {
    vec3 p = position;
    vec2 q = vec2(p.x, p.z - uTime * ${SPEED.toFixed(1)});
    vec3 w = wave(q, normalize(vec2(0.2, 1.0)), 18.0, 0.32, 1.6)
           + wave(q, normalize(vec2(-0.7, 0.6)), 9.0, 0.16, 2.2)
           + wave(q, normalize(vec2(0.9, 0.3)), 5.0, 0.08, 2.9)
           + wave(q, normalize(vec2(-0.3, -1.0)), 2.6, 0.035, 3.8);
    // Calmer far away (and no swell to break the horizon line).
    float fade = 1.0 - smoothstep(60.0, 220.0, length(p.xz));
    p.y += w.x * fade;
    vH = w.x * fade;
    vNormal2 = normalize(vec3(-w.y * fade, 1.0, -w.z * fade));
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const SEA_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uNight;
  varying vec3 vWorld;
  varying vec3 vNormal2;
  varying float vH;
  void main() {
    // Fine ripples on top of the swell (shading only), fading out with distance.
    vec2 pp = vWorld.xz;
    float t = uTime;
    float near = 1.0 - smoothstep(20.0, 160.0, length(pp - cameraPosition.xz));
    vec2 rip = vec2(
      sin(pp.x * 1.7 + pp.y * 0.6 + t * 2.1) * 0.5 + sin(pp.x * 3.1 - pp.y * 2.3 + t * 2.9) * 0.3 + sin(pp.y * 6.7 + t * 3.7) * 0.2,
      cos(pp.y * 1.9 - pp.x * 0.4 - t * 1.8) * 0.5 + cos(pp.x * 2.7 + pp.y * 3.3 + t * 2.5) * 0.3 + cos(pp.x * 7.3 - t * 4.1) * 0.2);
    vec3 n = normalize(normalize(vNormal2) + vec3(rip.x, 0.0, rip.y) * 0.16 * near);
    vec3 v = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 5.0);
    vec3 col = mix(uDeep, uShallow, clamp(vH * 1.2 + 0.45 + rip.x * 0.06 * near, 0.0, 1.0));
    col = mix(col, uSky, fres * 0.5);
    // The sun (or the moon) glinting off the swell.
    vec3 r = reflect(-v, n);
    float glint = pow(max(dot(r, normalize(uSunDir)), 0.0), mix(220.0, 600.0, uNight));
    col += uSunColor * glint * mix(2.2, 0.8, uNight);
    // White caps on the highest crests.
    col = mix(col, vec3(0.92, 0.96, 1.0), smoothstep(0.42, 0.58, vH + rip.y * 0.04) * 0.14);
    // At night, the yacht's underwater lights turn the water round the hull blue.
    vec2 rel = vWorld.xz / vec2(9.0, 16.0);
    col += vec3(0.05, 0.75, 0.95) * uNight * exp(-dot(rel, rel) * 1.6) * 0.8;
    // Into the haze at the horizon.
    float d = length(vWorld.xz - cameraPosition.xz);
    col = mix(col, uSky, smoothstep(160.0, 900.0, d));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function Sea({ night }: { night: boolean }) {
  // Fine near the yacht (where the swell shows), and a coarse sheet out to the horizon (where it has faded flat).
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(420, 420, 260, 260);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const far = useMemo(() => {
    const g = new THREE.PlaneGeometry(3200, 3200, 8, 8);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const params = useMemo(() => ({
    vertexShader: SEA_VERT, fragmentShader: SEA_FRAG,
    uniforms: {
      uTime: { value: 0 }, uNight: { value: 0 },
      uDeep: { value: new THREE.Color() }, uShallow: { value: new THREE.Color() }, uSky: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() }, uSunColor: { value: new THREE.Color() },
    },
  }), []);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const farMat = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock, camera }) => {
    // The horizon is far out: make sure the camera draws that far.
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.far < 2400) { cam.far = 2400; cam.updateProjectionMatrix(); }
    const m = mat.current;
    if (!m) return;
    const u = m.uniforms;
    u.uTime.value = clock.elapsedTime;
    u.uNight.value = night ? 1 : 0;
    (u.uDeep.value as THREE.Color).set(night ? "#020a1c" : "#0b4f7a");
    (u.uShallow.value as THREE.Color).set(night ? "#0b2a4a" : "#1f8fb8");
    (u.uSky.value as THREE.Color).set(night ? "#1b1f45" : "#f4b88a");
    (u.uSunDir.value as THREE.Vector3).set(night ? -0.4 : 0.5, night ? 0.35 : 0.16, -1).normalize();
    (u.uSunColor.value as THREE.Color).set(night ? "#c7d2fe" : "#ffd6a0");
  });
  return (
    <group>
      <mesh geometry={geo} position={[0, WATER, 0]} raycast={() => null} frustumCulled={false}><shaderMaterial ref={mat} args={[params]} /></mesh>
      <mesh geometry={far} position={[0, WATER - 0.4, 0]} raycast={() => null} frustumCulled={false}><shaderMaterial ref={farMat} args={[params]} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- the wake and the bow spray

const FOAM_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uSpread;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    // u across (0..1), v away from the boat (0 at the stern, 1 far behind).
    float x = abs(vUv.x - 0.5) * 2.0;
    float away = vUv.y;
    // The churned water right behind the props, and the two arms of the V opening out.
    float centre = (1.0 - smoothstep(0.0, mix(0.25, 0.5, away), x)) * (1.0 - away * 0.9);
    float edge = mix(0.15, uSpread, away);
    float arms = smoothstep(edge - 0.18, edge, x) * (1.0 - smoothstep(edge, edge + 0.08, x)) * (1.0 - away);
    vec2 p = vec2(vUv.x * 10.0, vUv.y * 22.0 - uTime * 2.2);
    float n = noise(p) * 0.6 + noise(p * 2.7) * 0.4;
    float a = clamp((centre * 0.9 + arms * 0.8) * smoothstep(0.25, 0.75, n + centre * 0.3), 0.0, 1.0);
    gl_FragColor = vec4(vec3(0.95, 0.98, 1.0), a * 0.85);
  }
`;
const FOAM_VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

function Foam({ width, length, spread, position, rotation }: { width: number; length: number; spread: number; position: [number, number, number]; rotation?: [number, number, number] }) {
  const params = useMemo(() => ({
    vertexShader: FOAM_VERT, fragmentShader: FOAM_FRAG, transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSpread: { value: spread } },
  }), [spread]);
  const mat = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => { if (mat.current) mat.current.uniforms.uTime.value = clock.elapsedTime; });
  return (
    <mesh position={position} rotation={rotation ?? [-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={2}>
      <planeGeometry args={[width, length]} />
      <shaderMaterial ref={mat} args={[params]} />
    </mesh>
  );
}

// ---------------------------------------------------------------- the coast around you

/** A ring of coastline round the yacht, far out: towers (lit at night), the Palm and Atlantis, the Burj Al Arab, Ain Dubai. */
function Coast({ night }: { night: boolean }) {
  const towers = useMemo(() => {
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const out: { a: number; r: number; h: number; w: number; c: string }[] = [];
    // Dubai Marina and JBR: a dense cluster of tall towers over about 70° of the horizon.
    for (let i = 0; i < 46; i++) out.push({ a: -0.6 + rnd() * 1.2, r: 760 + rnd() * 120, h: 30 + rnd() * 95, w: 9 + rnd() * 9, c: ["#cbd5e1", "#e2e8f0", "#94a3b8", "#bfdbfe"][Math.floor(rnd() * 4)] });
    // Dubai Harbour and Bluewaters, lower.
    for (let i = 0; i < 14; i++) out.push({ a: 0.75 + rnd() * 0.45, r: 700 + rnd() * 60, h: 14 + rnd() * 30, w: 12 + rnd() * 10, c: "#e5e7eb" });
    return out;
  }, []);
  return (
    <group>
      {towers.map((t, i) => (
        <mesh key={i} position={[Math.sin(t.a) * t.r, WATER + t.h / 2, -Math.cos(t.a) * t.r]} rotation={[0, -t.a, 0]} raycast={() => null}>
          <boxGeometry args={[t.w, t.h, t.w]} />
          {/* Lit windows at night. */}
          <meshStandardMaterial color={t.c} roughness={0.5} emissive={night ? "#fbbf24" : "#000000"} emissiveIntensity={night ? 0.32 : 0} />
        </mesh>
      ))}
      {/* Ain Dubai, by the Marina towers. */}
      <group position={[Math.sin(0.95) * 700, WATER, -Math.cos(0.95) * 700]} rotation={[0, -0.95, 0]}>
        <mesh position={[0, 62, 0]} raycast={() => null}><torusGeometry args={[55, 1.6, 8, 64]} /><meshStandardMaterial color="#e5e7eb" emissive={night ? "#22d3ee" : "#000000"} emissiveIntensity={night ? 0.8 : 0} metalness={0.5} roughness={0.3} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 14, 30, 0]} rotation={[0, 0, s * 0.45]} raycast={() => null}><boxGeometry args={[2.2, 64, 2.2]} /><meshStandardMaterial color="#d1d5db" /></mesh>)}
      </group>
      {/* The Palm, low on the water, with Atlantis's arch at its crescent. */}
      <group position={[Math.sin(2.3) * 650, WATER, -Math.cos(2.3) * 650]} rotation={[0, -2.3, 0]}>
        <mesh position={[0, 1, 0]} raycast={() => null}><boxGeometry args={[220, 2, 14]} /><meshStandardMaterial color="#e7d3a8" /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 11, 22, 4]} raycast={() => null}><boxGeometry args={[16, 44, 12]} /><meshStandardMaterial color="#fda4af" emissive={night ? "#fb7185" : "#000000"} emissiveIntensity={night ? 0.4 : 0} /></mesh>)}
        <mesh position={[0, 38, 4]} raycast={() => null}><boxGeometry args={[8, 10, 10]} /><meshStandardMaterial color="#fecdd3" /></mesh>
      </group>
      {/* The Burj Al Arab's sail. */}
      <group position={[Math.sin(3.6) * 720, WATER, -Math.cos(3.6) * 720]} rotation={[0, -3.6, 0]}>
        <mesh position={[0, 4, 0]} raycast={() => null}><cylinderGeometry args={[10, 12, 8, 16]} /><meshStandardMaterial color="#f1f5f9" /></mesh>
        <mesh position={[-4, 70, 0]} rotation={[0, 0, 0.12]} raycast={() => null}><coneGeometry args={[14, 140, 3]} /><meshStandardMaterial color="#f8fafc" emissive={night ? "#818cf8" : "#000000"} emissiveIntensity={night ? 0.6 : 0} /></mesh>
        <mesh position={[8, 66, 0]} raycast={() => null}><boxGeometry args={[2, 132, 2]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
      </group>
    </group>
  );
}

/** A few other boats about: they cruise by, each with its own little wake. */
function OtherBoats({ night }: { night: boolean }) {
  const boats = useRef<THREE.Group>(null);
  const spec = useMemo(() => [
    { r: 70, a0: 0.6, w: 0.05, c: "#f8fafc" },
    { r: 110, a0: 2.8, w: -0.035, c: "#e2e8f0" },
    { r: 150, a0: 4.4, w: 0.025, c: "#fef3c7" },
  ], []);
  useFrame(({ clock }) => {
    boats.current?.children.forEach((b, i) => {
      const s = spec[i], a = s.a0 + clock.elapsedTime * s.w;
      b.position.set(Math.sin(a) * s.r, WATER, -Math.cos(a) * s.r);
      b.rotation.y = -a + (s.w > 0 ? -Math.PI / 2 : Math.PI / 2);
    });
  });
  return (
    <group ref={boats}>
      {spec.map((s, i) => (
        <group key={i}>
          <mesh position={[0, 0.6, 0]} raycast={() => null}><boxGeometry args={[2.6, 1.2, 9]} /><meshStandardMaterial color={s.c} /></mesh>
          <mesh position={[0, 1.6, -0.6]} raycast={() => null}><boxGeometry args={[2, 0.9, 3.4]} /><meshStandardMaterial color="#1e293b" emissive={night ? "#fde68a" : "#000000"} emissiveIntensity={night ? 0.5 : 0} /></mesh>
          <Foam width={5} length={18} spread={0.9} position={[0, 0.05, 13]} />
        </group>
      ))}
    </group>
  );
}

/** The sky: a dome from the warm horizon up to blue (golden hour), or deep night with a moon. */
function Sky({ night }: { night: boolean }) {
  const params = useMemo(() => ({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3() }, uSunColor: { value: new THREE.Color() }, uSize: { value: 0.995 } },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunColor; uniform float uSize;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(uHorizon, uTop, pow(h, 0.55));
        float s = dot(normalize(vDir), normalize(uSun));
        col += uSunColor * smoothstep(uSize, 1.0, s) + uSunColor * pow(max(s, 0.0), 24.0) * 0.35;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }), []);
  const mat = useRef<THREE.ShaderMaterial>(null);
  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    const u = m.uniforms;
    (u.uTop.value as THREE.Color).set(night ? "#020617" : "#4f8fd8");
    (u.uHorizon.value as THREE.Color).set(night ? "#1b1f45" : "#f4b88a");
    (u.uSun.value as THREE.Vector3).set(night ? -0.4 : 0.5, night ? 0.35 : 0.08, -1).normalize();
    (u.uSunColor.value as THREE.Color).set(night ? "#e0e7ff" : "#ffcf8a");
    u.uSize.value = night ? 0.9993 : 0.9985;
  });
  return <mesh raycast={() => null} frustumCulled={false} renderOrder={-1}><sphereGeometry args={[1500, 32, 16]} /><shaderMaterial ref={mat} args={[params]} /></mesh>;
}

// ---------------------------------------------------------------- the yacht

function useHullShape(hw: number, hd: number) {
  return useMemo(() => {
    // The deck outline seen from above (x across, y = z along): a rounded stern, straight sides, then the bow sweeping to a point.
    const s = new THREE.Shape();
    s.moveTo(-hw, hd - 0.6);
    s.quadraticCurveTo(-hw, hd, -hw + 0.6, hd);
    s.lineTo(hw - 0.6, hd);
    s.quadraticCurveTo(hw, hd, hw, hd - 0.6);
    s.lineTo(hw, -hd + 2);
    s.quadraticCurveTo(hw - 0.2, -hd - 2.2, 0, -hd - 4.6);
    s.quadraticCurveTo(-hw + 0.2, -hd - 2.2, -hw, -hd + 2);
    s.lineTo(-hw, hd - 0.6);
    return s;
  }, [hw, hd]);
}

function Hull({ width, depth, night }: { width: number; depth: number; night: boolean }) {
  const hw = width / 2 + 0.15, hd = depth / 2 + 0.15;
  const shape = useHullShape(hw, hd);
  const { hull, boot } = useMemo(() => {
    const h = new THREE.ExtrudeGeometry(shape, { depth: 1.75, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2, curveSegments: 18 });
    h.rotateX(Math.PI / 2);
    const b = new THREE.ExtrudeGeometry(shape, { depth: 0.28, bevelEnabled: false, curveSegments: 18 });
    b.rotateX(Math.PI / 2);
    return { hull: h, boot: b };
  }, [shape]);
  // Glass panels and posts along the sides and the stern.
  const panels = useMemo(() => {
    const out: { x: number; z: number; ry: number; w: number }[] = [];
    for (let z = -hd + 2.4; z < hd - 0.6; z += 1.6) { out.push({ x: -hw + 0.05, z: z + 0.8, ry: Math.PI / 2, w: 1.55 }); out.push({ x: hw - 0.05, z: z + 0.8, ry: Math.PI / 2, w: 1.55 }); }
    for (let x = -hw + 1.4; x < hw - 1.2; x += 1.6) out.push({ x: x + 0.8, z: hd - 0.05, ry: 0, w: 1.55 });
    return out;
  }, [hw, hd]);
  return (
    <group>
      {/* The hull: glossy white, a navy boot stripe at the waterline, the dark underbody below it. */}
      <mesh geometry={hull} position={[0, -0.04, 0]} receiveShadow><meshStandardMaterial color="#f8fafc" roughness={0.18} metalness={0.1} /></mesh>
      <mesh geometry={boot} position={[0, -1.18, 0]} scale={[1.012, 1, 1.006]}><meshStandardMaterial color="#1e3a8a" roughness={0.25} /></mesh>
      <mesh geometry={boot} position={[0, -0.55, 0]} scale={[1.008, 0.2, 1.004]}><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} /></mesh>
      {/* The swim platform at the stern, just above the water. */}
      <mesh position={[0, -1.12, hd + 0.75]}><boxGeometry args={[width - 0.6, 0.14, 1.5]} /><meshStandardMaterial color="#d6b98c" roughness={0.6} /></mesh>
      {/* Glass balustrade with a chrome rail. */}
      {panels.map((p, i) => (
        <mesh key={i} position={[p.x, 0.55, p.z]} rotation={[0, p.ry, 0]}><planeGeometry args={[p.w, 0.95]} /><meshStandardMaterial color="#a5f3fc" transparent opacity={0.18} roughness={0.05} metalness={0.2} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      ))}
      {[-1, 1].map((s) => <mesh key={s} position={[s * (hw - 0.05), 1.05, 0.8]}><boxGeometry args={[0.06, 0.06, depth - 2]} /><meshStandardMaterial color="#e5e7eb" metalness={0.95} roughness={0.12} /></mesh>)}
      <mesh position={[0, 1.05, hd - 0.05]}><boxGeometry args={[width - 0.6, 0.06, 0.06]} /><meshStandardMaterial color="#e5e7eb" metalness={0.95} roughness={0.12} /></mesh>
      {/* LED strips along the deck edge: soft by day, glowing at night. */}
      {[-1, 1].map((s) => <mesh key={`led${s}`} position={[s * (hw - 0.12), 0.06, 0.8]}><boxGeometry args={[0.04, 0.04, depth - 2]} /><meshBasicMaterial color={night ? "#38bdf8" : "#e0f2fe"} toneMapped={false} /></mesh>)}
      {/* The flybridge: the saloon with wraparound tinted glass, the upper deck, the radar arch. */}
      <group position={[0, 0, -hd + 1.9]}>
        <mesh position={[0, 1.2, 0]} castShadow><boxGeometry args={[width - 1.2, 2.4, 3]} /><meshStandardMaterial color="#f8fafc" roughness={0.2} /></mesh>
        <mesh position={[0, 1.45, 1.51]}><planeGeometry args={[width - 1.6, 1.2]} /><meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.08} emissive={night ? "#f59e0b" : "#000000"} emissiveIntensity={night ? 0.25 : 0} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * ((width - 1.2) / 2 + 0.01), 1.45, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[2.6, 1.2]} /><meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.08} side={THREE.DoubleSide} /></mesh>)}
        <mesh position={[0, 2.46, -0.2]}><boxGeometry args={[width - 0.6, 0.12, 4]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
        {/* sunbeds up top */}
        {[-1, 1].map((s) => <mesh key={`bed${s}`} position={[s * 1.1, 2.7, -0.6]}><boxGeometry args={[1.6, 0.3, 2]} /><meshStandardMaterial color="#f5f5f4" /></mesh>)}
        {/* the radar arch */}
        {[-1, 1].map((s) => <mesh key={`arch${s}`} position={[s * 1.9, 3.3, 0.9]} rotation={[0, 0, s * -0.2]}><boxGeometry args={[0.25, 1.7, 0.4]} /><meshStandardMaterial color="#f8fafc" /></mesh>)}
        <mesh position={[0, 4.1, 0.9]}><boxGeometry args={[3.2, 0.25, 0.5]} /><meshStandardMaterial color="#f8fafc" /></mesh>
        <mesh position={[0, 4.35, 0.9]} rotation={[0, 0, 0]}><cylinderGeometry args={[0.35, 0.35, 0.15, 16]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
      </group>
    </group>
  );
}

/** Festoon lights strung from the radar arch down to the stern on both sides. */
function Festoons({ width, depth, night }: { width: number; depth: number; night: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const bulbs = useMemo(() => {
    const out: THREE.Vector3[] = [];
    const hd = depth / 2;
    for (const s of [-1, 1]) {
      const a = new THREE.Vector3(s * 1.7, 4, -hd + 2.8), b = new THREE.Vector3(s * (width / 2 - 0.1), 1.6, hd - 0.2);
      for (let i = 0; i <= 26; i++) {
        const t = i / 26;
        const p = a.clone().lerp(b, t);
        p.y -= Math.sin(t * Math.PI) * 0.9;
        out.push(p);
      }
    }
    return out;
  }, [width, depth]);
  useFrame(() => {
    const m = ref.current;
    if (!m || m.userData.done) return;
    const o = new THREE.Object3D();
    bulbs.forEach((p, i) => { o.position.copy(p); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true;
    m.userData.done = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, bulbs.length]} raycast={() => null} frustumCulled={false}>
      <sphereGeometry args={[0.07, 8, 6]} />
      <meshBasicMaterial color={night ? "#ffd27a" : "#fff7e6"} toneMapped={false} />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------- together

export function Superyacht({ width, depth }: { width: number; depth: number }) {
  const night = useContext(YachtNight);
  const world = useRef<THREE.Group>(null);
  const coast = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Pitch and roll on the swell, and a little heave: the world tilts round the level deck.
    if (world.current) {
      world.current.rotation.z = Math.sin(t * 0.85) * 0.02 + Math.sin(t * 0.37) * 0.008;
      world.current.rotation.x = Math.sin(t * 0.6 + 1) * 0.012;
      world.current.position.y = Math.sin(t * 0.7) * 0.07;
    }
    // Cruising along the coast: the skyline slowly turns round you (once every eight minutes or so).
    if (coast.current) coast.current.rotation.y = t * 0.013;
  });
  const hd = depth / 2;
  return (
    <group>
      <Sky night={night} />
      <group ref={world}>
        <Sea night={night} />
        <group ref={coast}><Coast night={night} /></group>
        <OtherBoats night={night} />
        {/* The wake opening out behind the stern, and spray curling off both sides of the bow. */}
        <Foam width={26} length={90} spread={0.95} position={[0, WATER + 0.05, hd + 46]} />
        <Foam width={6} length={4} spread={0.6} position={[0, WATER + 0.06, hd + 3]} />
        {[-1, 1].map((s) => <Foam key={s} width={2.2} length={9} spread={0.5} position={[s * (width / 2 + 0.9), WATER + 0.06, -hd + 1.5]} rotation={[-Math.PI / 2, 0, s * 0.25]} />)}
      </group>
      <Hull width={width} depth={depth} night={night} />
      <Festoons width={width} depth={depth} night={night} />
    </group>
  );
}
