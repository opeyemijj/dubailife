"use client";

// What you ride at Meydan, Al Marmoom and the Autodrome's superbike races (models: public/models/racing, credits in
// public/models/CREDITS.md):
//  - a thoroughbred, galloping (its own animation, faster the faster it goes), in its coat and mane colours, with a
//    jockey in silks crouched over its withers and a numbered saddle cloth;
//  - a racing dromedary: a still model whose legs swing in a pace (both legs on a side together, as camels run) in the
//    shader, with the small robot jockey Gulf camel races use, a whip turning on its back;
//  - a superbike, repainted to its maker's colours, leaning into the bends with its rider tucked in behind the screen.
// Each reads its speed (m/s) and lean every frame from `motion`, so nothing re-renders as it moves.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

export interface Motion { speed: number; /** Radians, + leaning left (bikes). */ lean: number }

/** Silks from a username: the same colours every race. */
export function silksFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const palette = ["#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#db2777", "#0891b2", "#f97316", "#111827", "#facc15"];
  return { body: palette[h % palette.length], trim: palette[(h >> 4) % palette.length] === palette[h % palette.length] ? "#ffffff" : palette[(h >> 4) % palette.length] };
}

const mat = (color: string, rough = 0.6, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

/** A number painted on a cloth (the saddle cloth, the bike's tail). */
function numberTexture(n: number, bg: string) {
  const c = document.createElement("canvas"); c.width = 128; c.height = 96;
  const g = c.getContext("2d")!;
  g.fillStyle = bg; g.fillRect(0, 0, 128, 96);
  g.fillStyle = "#ffffff"; g.font = "900 64px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(n), 64, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------- the horse

const HORSE_SCALE = 0.4;

export function HorseModel({ coat, mane, silks, number, motion }: { coat: string; mane: string; silks: { body: string; trim: string }; number: number; motion: React.RefObject<Motion> }) {
  const gltf = useGLTF("/models/racing/horse.glb");
  const scene = useMemo(() => {
    const s = cloneSkinned(gltf.scene);
    const base = new THREE.Color(coat);
    const paints: Record<string, THREE.Color> = {
      Main: base, Main_Dark: base.clone().multiplyScalar(0.55), Main_Light: base.clone().lerp(new THREE.Color("#f5efe6"), 0.3), Hair: new THREE.Color(mane),
    };
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.frustumCulled = false;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const next = mats.map((x) => {
        const c = paints[x.name];
        if (!c) return x;
        const y = (x as THREE.MeshStandardMaterial).clone();
        y.color = c.clone(); y.roughness = x.name === "Hair" ? 0.8 : 0.45;
        return y;
      });
      m.material = Array.isArray(m.material) ? next : next[0];
    });
    // Measured on its skinned pose: hooves on the ground, centred, so the saddle and jockey sit on its back.
    s.scale.setScalar(HORSE_SCALE);
    s.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(s, true);
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    s.position.set(-c.x, -box.min.y, -c.z);
    return { s, length: size.z, height: size.y };
  }, [gltf.scene, coat, mane]);
  const { actions, names } = useAnimations(gltf.animations, scene.s);
  const gait = useRef<string | null>(null);
  const pick = (want: "Gallop" | "Walk" | "Idle") => names.find((n) => n === want) ?? names.find((n) => n.endsWith(`|${want}`));
  // The animation actions, held in a ref: each frame changes their weights and speed.
  const acts = useRef(actions);
  useEffect(() => { acts.current = actions; return () => { Object.values(actions).forEach((a) => a?.stop()); }; }, [actions]);
  const cloth = useMemo(() => numberTexture(number, silks.body), [number, silks.body]);
  const bob = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  useFrame(() => {
    const v = motion.current?.speed ?? 0;
    const want = v > 5 ? "Gallop" : v > 0.6 ? "Walk" : "Idle";
    const name = pick(want);
    const actions = acts.current;
    if (name && gait.current !== name) {
      const next = actions[name];
      if (gait.current) actions[gait.current]?.fadeOut(0.25);
      next?.reset().fadeIn(0.25).play();
      gait.current = name;
    }
    const a = name ? actions[name] : null;
    // Matched to the ground: a gallop stride covers about 7 m (the clip is one stride), a walk about 1.7 m.
    if (a) a.setEffectiveTimeScale(want === "Gallop" ? Math.max(0.55, (v * a.getClip().duration) / 7) : want === "Walk" ? Math.max(0.5, (v * a.getClip().duration) / 1.7) : 1);
    if (body.current) body.current.rotation.z += ((motion.current?.lean ?? 0) - body.current.rotation.z) * 0.2;
    // The jockey rides the stride: a little up and down with the gallop.
    if (bob.current && a) bob.current.position.y = want === "Gallop" ? Math.sin(a.time * Math.PI * 2 / Math.max(0.01, a.getClip().duration) * 1) * 0.05 : 0;
  });
  // The saddle: over the withers, about three quarters of the way up (the head and neck are the rest).
  const back = { y: scene.height * 0.66, z: -scene.length * 0.06 };
  return (
    <group ref={body}>
      <primitive object={scene.s} />
      {/* The saddle cloth with the number, and the jockey up. */}
      <mesh position={[0, back.y - 0.02, back.z - 0.1]} castShadow><boxGeometry args={[0.62, 0.04, 0.6]} /><meshStandardMaterial map={cloth} /></mesh>
      <group position={[0, back.y, back.z]}><group ref={bob}><Rider pose="jockey" silks={silks} /></group></group>
    </group>
  );
}

// ---------------------------------------------------------------- the camel

// The model's own units (it is about 62 tall, its head towards +x): where the legs swing from.
const CAMEL = { scale: 2.15 / 62.4, cx: 16.9, minY: 2.81, hipY: 33, front: [18, 40, 29] as const, back: [-32, -12, -23] as const };

export function CamelModel({ coat, silks, number, motion }: { coat: string; silks: { body: string; trim: string }; number: number; motion: React.RefObject<Motion> }) {
  const gltf = useGLTF("/models/racing/camel.glb");
  const phase = useRef({ value: 0 });
  const amp = useRef({ value: 0 });
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    const c = new THREE.Color(coat);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.frustumCulled = false;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const next = mats.map((x, i) => {
        const y = (x as THREE.MeshStandardMaterial).clone();
        // The body takes the coat; the second material (eyes, nose, feet) stays dark.
        y.color = i === 0 ? c.clone() : c.clone().multiplyScalar(0.35);
        y.roughness = 0.85;
        y.onBeforeCompile = (sh) => {
          sh.uniforms.uPhase = phase.current;
          sh.uniforms.uAmp = amp.current;
          sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uPhase;\nuniform float uAmp;").replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            {
              float hipY = ${CAMEL.hipY.toFixed(1)};
              bool front = transformed.x > ${CAMEL.front[0].toFixed(1)} && transformed.x < ${CAMEL.front[1].toFixed(1)};
              bool back = transformed.x > ${CAMEL.back[0].toFixed(1)} && transformed.x < ${CAMEL.back[1].toFixed(1)};
              if ((front || back) && transformed.y < hipY) {
                float px = front ? ${CAMEL.front[2].toFixed(1)} : ${CAMEL.back[2].toFixed(1)};
                // A pace: both legs on one side swing together, the other side opposite.
                float ph = uPhase + (transformed.z > 0.0 ? 0.0 : 3.14159);
                float w = clamp((hipY - transformed.y) / 7.0, 0.0, 1.0);
                float a = uAmp * sin(ph) * w;
                vec2 d = vec2(transformed.x - px, transformed.y - hipY);
                float c = cos(a), s = sin(a);
                transformed.x = px + d.x * c - d.y * s;
                transformed.y = hipY + d.x * s + d.y * c;
                // The foot lifts as the leg comes forward.
                transformed.y += max(0.0, cos(ph)) * 3.0 * w * (uAmp / 0.5);
              }
            }`,
          );
        };
        y.customProgramCacheKey = () => "camel-pace";
        return y;
      });
      m.material = Array.isArray(m.material) ? next : next[0];
    });
    return s;
  }, [gltf.scene, coat]);
  const body = useRef<THREE.Group>(null);
  const whip = useRef<THREE.Group>(null);
  const cloth = useMemo(() => numberTexture(number, silks.body), [number, silks.body]);
  useFrame((_, dt) => {
    const v = motion.current?.speed ?? 0;
    // About 4 m a stride flat out; the legs swing wider the faster it goes.
    phase.current.value += (v / 4) * Math.PI * 2 * dt;
    amp.current.value += (Math.min(0.5, v * 0.035) - amp.current.value) * Math.min(1, dt * 4);
    if (body.current) body.current.position.y = Math.abs(Math.sin(phase.current.value)) * Math.min(0.09, v * 0.006);
    // A pacing camel rolls side to side with each stride, and leans into the bends.
    if (body.current) body.current.rotation.z = Math.sin(phase.current.value) * Math.min(0.035, v * 0.002) + (motion.current?.lean ?? 0);
    if (whip.current) whip.current.rotation.x = v > 1 ? Math.sin(phase.current.value * 2) * 0.9 : 0;
  });
  return (
    <group ref={body}>
      <group rotation={[0, -Math.PI / 2, 0]}>
        <primitive object={scene} scale={CAMEL.scale} position={[-CAMEL.cx * CAMEL.scale, -CAMEL.minY * CAMEL.scale, 0]} />
      </group>
      {/* The saddle with the number, behind the hump, and the robot jockey on it. */}
      <mesh position={[0, 1.93, -0.85]} rotation={[0.25, 0, 0]} castShadow><boxGeometry args={[0.6, 0.06, 0.55]} /><meshStandardMaterial map={cloth} /></mesh>
      <group position={[0, 1.95, -0.88]}>
        {/* The robot: a small box in silks, with the remote-controlled whip turning on its arm. */}
        <mesh position={[0, 0.17, 0]} castShadow><boxGeometry args={[0.2, 0.3, 0.14]} /><meshStandardMaterial color={silks.body} roughness={0.6} /></mesh>
        <mesh position={[0, 0.17, 0.075]}><boxGeometry args={[0.12, 0.08, 0.01]} /><meshStandardMaterial color={silks.trim} /></mesh>
        <mesh position={[0, 0.38, 0]} castShadow><boxGeometry args={[0.13, 0.12, 0.12]} /><meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.35} /></mesh>
        <mesh position={[0.05, 0.5, 0]}><cylinderGeometry args={[0.006, 0.006, 0.18, 4]} /><meshStandardMaterial color="#9ca3af" /></mesh>
        <group ref={whip} position={[0.13, 0.26, 0]}>
          <mesh rotation={[0, 0, 0.3]} position={[0.02, -0.02, -0.2]}><cylinderGeometry args={[0.008, 0.004, 0.5, 4]} /><meshStandardMaterial color="#111827" /></mesh>
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- the superbike

// The model is about 127 long (front towards -z, so it's turned round), its wheels on y = 0.
const BIKE = { scale: 2.05 / 127.5 };

export function BikeModel({ color, silks, number, motion }: { color: string; silks: { body: string; trim: string }; number: number; motion: React.RefObject<Motion> }) {
  const gltf = useGLTF("/models/racing/superbike.glb");
  const hue = useMemo(() => {
    // The bodywork is red in the model: turn its hue to the bike's colour, keep black and chrome as they are.
    const hsl = { h: 0, s: 0, l: 0 };
    new THREE.Color(color).getHSL(hsl);
    return { h: hsl.h * Math.PI * 2, l: hsl.l };
  }, [color]);
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const next = mats.map((x) => {
        const y = (x as THREE.MeshStandardMaterial).clone();
        y.roughness = 0.3; y.metalness = 0.35;
        y.onBeforeCompile = (sh) => {
          sh.uniforms.uHue = { value: hue.h };
          sh.uniforms.uLift = { value: hue.l < 0.3 ? 0.75 : 1.0 };
          sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uHue;\nuniform float uLift;").replace(
            "#include <map_fragment>",
            `#include <map_fragment>
            {
              vec3 c = diffuseColor.rgb;
              float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
              float sat = mx > 0.0 ? (mx - mn) / mx : 0.0;
              // Rotate the hue of the painted parts only (saturated red), about the grey axis.
              if (sat > 0.35 && c.r >= c.g && c.r >= c.b) {
                const vec3 k = vec3(0.57735);
                float ca = cos(uHue), sa = sin(uHue);
                vec3 r = c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca);
                diffuseColor.rgb = mix(c, r, smoothstep(0.35, 0.6, sat)) * uLift;
              }
            }`,
          );
        };
        y.customProgramCacheKey = () => `bike-${color}`;
        return y;
      });
      m.material = Array.isArray(m.material) ? next : next[0];
    });
    return s;
  }, [gltf.scene, hue, color]);
  const lean = useRef<THREE.Group>(null);
  const tail = useMemo(() => numberTexture(number, color), [number, color]);
  useFrame((_, dt) => {
    const l = motion.current?.lean ?? 0;
    if (lean.current) lean.current.rotation.z += (l - lean.current.rotation.z) * Math.min(1, dt * 8);
  });
  return (
    <group ref={lean}>
      <primitive object={scene} scale={BIKE.scale} rotation={[0, Math.PI, 0]} />
      <mesh position={[0, 0.9, -0.72]} rotation={[-0.3, 0, 0]}><planeGeometry args={[0.3, 0.2]} /><meshStandardMaterial map={tail} side={THREE.DoubleSide} /></mesh>
      <group position={[0, 0.82, -0.1]}><Rider pose="bike" silks={silks} /></group>
    </group>
  );
}

// ---------------------------------------------------------------- riders

/** A rider in silks or leathers: a jockey crouched up the horse's neck, or a racer tucked in on the tank. Facing +z. */
function Rider({ pose, silks }: { pose: "jockey" | "bike"; silks: { body: string; trim: string } }) {
  const m = useMemo(() => ({
    body: mat(silks.body, 0.55), trim: mat(silks.trim, 0.55), legs: mat(pose === "bike" ? "#111827" : "#f8fafc", 0.7),
    boots: mat("#111111", 0.4), skin: mat("#c68863", 0.7), helmet: mat(pose === "bike" ? silks.body : silks.trim, 0.25, 0.2), visor: mat("#0b1220", 0.05, 0.6),
  }), [silks.body, silks.trim, pose]);
  const jockey = pose === "jockey";
  return (
    <group>
      {/* Torso, nearly flat over the neck (jockey) or the tank (bike). */}
      <mesh material={m.body} position={[0, jockey ? 0.42 : 0.28, jockey ? 0.12 : 0.05]} rotation={[jockey ? 1.15 : 1.25, 0, 0]} castShadow>
        <capsuleGeometry args={[0.16, 0.36, 4, 8]} />
      </mesh>
      <mesh material={m.trim} position={[0, jockey ? 0.47 : 0.33, jockey ? 0.1 : 0.03]} rotation={[jockey ? 1.15 : 1.25, 0, 0]}>
        <cylinderGeometry args={[0.165, 0.165, 0.08, 10]} />
      </mesh>
      {/* Head and helmet, looking ahead. */}
      <mesh material={m.helmet} position={[0, jockey ? 0.58 : 0.42, jockey ? 0.42 : 0.38]} castShadow><sphereGeometry args={[0.15, 14, 10]} /></mesh>
      <mesh material={m.visor} position={[0, jockey ? 0.57 : 0.41, jockey ? 0.53 : 0.5]}><boxGeometry args={[0.2, 0.07, 0.05]} /></mesh>
      {/* Arms forward to the reins or the bars. */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={m.body} position={[s * 0.17, jockey ? 0.38 : 0.22, jockey ? 0.36 : 0.34]} rotation={[1.0, 0, s * -0.15]}><capsuleGeometry args={[0.055, 0.32, 4, 6]} /></mesh>
          <mesh material={m.skin} position={[s * 0.14, jockey ? 0.28 : 0.1, jockey ? 0.55 : 0.56]}><sphereGeometry args={[0.05, 8, 6]} /></mesh>
        </group>
      ))}
      {/* Legs folded: short stirrups for a jockey, knees out on the pegs on a bike. */}
      {[-1, 1].map((s) => (
        <group key={`l${s}`}>
          <mesh material={m.legs} position={[s * (jockey ? 0.2 : 0.22), jockey ? 0.18 : 0.08, jockey ? -0.08 : -0.18]} rotation={[jockey ? -0.4 : 0.9, 0, s * (jockey ? 0.25 : 0.5)]}><capsuleGeometry args={[0.075, 0.34, 4, 6]} /></mesh>
          <mesh material={m.boots} position={[s * (jockey ? 0.3 : 0.27), jockey ? -0.06 : -0.12, jockey ? 0.06 : -0.32]} rotation={[0.2, 0, 0]}><capsuleGeometry args={[0.06, 0.22, 4, 6]} /></mesh>
        </group>
      ))}
    </group>
  );
}
