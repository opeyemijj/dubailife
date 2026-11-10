"use client";

// The gym floor in 3D: rubber floor, a mirror wall, strip lights and the gym's colour, with six stations in a
// row (treadmill, squat rack, heavy bag, rower, spin bike, yoga mat). The citizen's own avatar works out at the
// station being played, posed from that station's state; the heavy bag hangs on a real physics joint
// (Rapier) and swings when it's hit. The camera frames the station from the front.

import { useMemo, useRef, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import { Physics, RigidBody, CylinderCollider, useSphericalJoint, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { CitizenAvatar, type ArmRig, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { useQuality } from "../../GameStage";
import { applyShake, useGameFrame } from "../../stage";
import { blend, newRig, POSE, punchCurve, setRig, type ArmPose } from "../boxing/poses";
import type { StationId, StationSim } from "./logic";

export const SPOTS: Record<StationId, number> = { treadmill: -5.5, squat: -3.3, bag: -1.1, rower: 1.1, spin: 3.3, yoga: 5.5 };
const damp = THREE.MathUtils.damp;

// Extra arm poses for lifting, rowing, riding and yoga ([up, forward, right], right arm).
const LIFT: Record<string, ArmPose> = {
  bar: { upper: [0.15, -0.05, 0.98], fore: [0.95, 0.1, -0.2] },
  catch: { upper: [-0.25, 0.95, 0.1], fore: [-0.15, 1, 0.02] },
  finish: { upper: [-0.85, -0.45, 0.3], fore: [0.1, 0.95, -0.2] },
  bars: { upper: [-0.45, 0.85, 0.2], fore: [-0.2, 0.95, 0] },
  tree: { upper: [0.95, 0.1, 0.25], fore: [0.85, 0.15, -0.5] },
  warrior: { upper: [0.05, 0.05, 1], fore: [0.05, 0.02, 1] },
  eagle: { upper: [-0.1, 0.9, -0.35], fore: [0.9, 0.3, -0.2] },
  reachFwd: { upper: [0.6, 0.8, 0.05], fore: [0.6, 0.8, 0.05] },
  reachBack: { upper: [-0.4, -0.9, 0.2], fore: [-0.2, -0.95, 0.1] },
};

function Equipment({ id }: { id: StationId }) {
  const x = SPOTS[id];
  const metal = <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.3} />;
  const dark = <meshStandardMaterial color="#1f2937" roughness={0.6} />;
  switch (id) {
    case "treadmill":
      return (
        <group position={[x, 0, 0]}>
          {/* Side-on: the runner faces +x, the console at that end. */}
          <mesh position={[0, 0.12, 0]} castShadow receiveShadow><boxGeometry args={[2, 0.24, 0.9]} />{dark}</mesh>
          <mesh position={[0, 0.25, 0]}><boxGeometry args={[1.8, 0.02, 0.7]} /><meshStandardMaterial color="#111827" roughness={0.95} /></mesh>
          {[-0.4, 0.4].map((dz) => <mesh key={dz} position={[0.85, 0.75, dz]}><cylinderGeometry args={[0.03, 0.03, 1.1, 8]} />{metal}</mesh>)}
          {[-0.4, 0.4].map((dz) => <mesh key={`r${dz}`} position={[0.45, 1.05, dz]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 0.8, 8]} />{metal}</mesh>)}
          <mesh position={[0.9, 1.3, 0]} rotation={[0, 0, 0.4]}><boxGeometry args={[0.06, 0.32, 0.85]} /><meshStandardMaterial color="#0f172a" emissive="#0ea5e9" emissiveIntensity={0.4} /></mesh>
        </group>
      );
    case "squat":
      return (
        <group position={[x, 0, 0]}>
          <mesh position={[0, 0.06, 0]} receiveShadow><boxGeometry args={[2.2, 0.12, 2.2]} /><meshStandardMaterial color="#3f2a14" roughness={0.8} /></mesh>
          {[-0.95, 0.95].map((dx) => [-0.7, 0.7].map((dz) => <mesh key={`${dx}${dz}`} position={[dx, 1.15, dz]} castShadow><boxGeometry args={[0.08, 2.1, 0.08]} />{metal}</mesh>))}
          {[-0.95, 0.95].map((dx) => <mesh key={dx} position={[dx, 2.2, 0]}><boxGeometry args={[0.08, 0.08, 1.48]} />{metal}</mesh>)}
        </group>
      );
    case "bag":
      return null; // drawn by HeavyBag (it swings)
    case "rower":
      return (
        <group position={[x, 0, 0]}>
          <mesh position={[0, 0.22, 0]} castShadow><boxGeometry args={[2.3, 0.08, 0.22]} />{metal}</mesh>
          <mesh position={[0.95, 0.42, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.32, 0.32, 0.2, 24]} />{dark}</mesh>
          {[-1, 1].map((dx) => <mesh key={dx} position={[dx, 0.09, 0]}><boxGeometry args={[0.12, 0.18, 0.6]} />{dark}</mesh>)}
        </group>
      );
    case "spin":
      return (
        <group position={[x, 0, 0]}>
          <mesh position={[0, 0.05, 0]}><boxGeometry args={[1.1, 0.1, 0.5]} />{dark}</mesh>
          <mesh position={[0.25, 0.45, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.28, 0.28, 0.08, 24]} /><meshStandardMaterial color="#dc2626" metalness={0.4} roughness={0.4} /></mesh>
          <mesh position={[-0.1, 0.6, 0]} rotation={[0, 0, 0.35]}><boxGeometry args={[0.07, 1.1, 0.07]} />{metal}</mesh>
          <mesh position={[-0.28, 0.98, 0]}><boxGeometry args={[0.3, 0.06, 0.18]} />{dark}</mesh>
          <mesh position={[0.4, 1.05, 0]}><boxGeometry args={[0.07, 0.07, 0.5]} />{metal}</mesh>
        </group>
      );
    case "yoga":
      return <mesh position={[x, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[0.8, 1.9]} /><meshStandardMaterial color="#7c3aed" roughness={0.9} /></mesh>;
  }
}

/** The heavy bag on its chain: a dynamic body hung from a fixed point by a ball joint. */
function HeavyBag({ simRef }: { simRef: RefObject<StationSim | null> }) {
  const anchor = useRef<RapierRigidBody>(null);
  const bag = useRef<RapierRigidBody>(null);
  const x = SPOTS.bag + 0.45;
  useSphericalJoint(anchor as RefObject<RapierRigidBody>, bag as RefObject<RapierRigidBody>, [[0, 0, 0], [0, 1.45, 0]]);
  const lastAt = useRef(-1);
  useGameFrame(() => {
    const s = simRef.current;
    if (!s || s.kind !== "bag" || !s.lastHit || s.lastHit.at === lastAt.current || !bag.current) return;
    lastAt.current = s.lastHit.at;
    // Hooks swing it sideways, straight punches drive it away.
    const hook = s.lastHit.punch >= 2;
    const p = s.lastHit.power * 9;
    bag.current.applyImpulseAtPoint({ x: hook ? p * 0.5 : p, y: 0, z: hook ? (s.lastHit.punch === 2 ? -p : p) : 0 }, { x: x - 0.22, y: 1.25, z: 0 }, true);
  });
  return (
    <group>
      <RigidBody ref={anchor} type="fixed" position={[x, 2.75, 0]} />
      <RigidBody ref={bag} position={[x, 1.3, 0]} colliders={false} linearDamping={0.7} angularDamping={1.4} mass={30}>
        <CylinderCollider args={[0.5, 0.22]} />
        <mesh castShadow><cylinderGeometry args={[0.22, 0.22, 1, 24]} /><meshStandardMaterial color="#7f1d1d" roughness={0.55} /></mesh>
        <mesh position={[0, 0.52, 0]}><cylinderGeometry args={[0.23, 0.23, 0.06, 24]} /><meshStandardMaterial color="#111827" /></mesh>
        <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.01, 0.01, 0.9, 6]} /><meshStandardMaterial color="#9ca3af" metalness={0.9} /></mesh>
      </RigidBody>
    </group>
  );
}

/** The citizen at the station, posed from its state. */
function Athlete({ look, station, simRef }: { look?: AvatarLookProps; station: StationId; simRef: RefObject<StationSim | null> }) {
  const rig = useRef<ArmRig | null>(newRig());
  const body = useRef<THREE.Group>(null);
  const lean = useRef<THREE.Group>(null);
  const bar = useRef<THREE.Group>(null);
  const p = useRef({ y: 0, rx: 0, rz: 0, x: 0 });
  const x = SPOTS[station];
  const anim: AvatarAnimation = station === "treadmill" ? "run" : station === "rower" || station === "spin" ? "sit" : "idle";
  // Where the citizen stands (or sits) at each station, and which way they face.
  const place = useMemo((): { pos: [number, number, number]; yaw: number } => {
    switch (station) {
      case "treadmill": return { pos: [x - 0.15, 0.25, 0], yaw: Math.PI / 2 };
      case "squat": return { pos: [x, 0.12, 0], yaw: 0 };
      case "bag": return { pos: [x - 0.2, 0, 0], yaw: Math.PI / 2 };
      case "rower": return { pos: [x - 0.3, 0.05, 0], yaw: Math.PI / 2 };
      case "spin": return { pos: [x - 0.2, 0.45, 0], yaw: Math.PI / 2 };
      case "yoga": return { pos: [x, 0, 0], yaw: 0 };
    }
  }, [station, x]);

  useGameFrame((dt, t) => {
    const s = simRef.current, r = rig.current;
    if (!s || !r || !lean.current) return;
    const tgt = { y: 0, rx: 0, rz: 0, x: 0 };
    let R: ArmPose = POSE.guard, L: ArmPose = POSE.guard, weight = 1;
    if (s.kind === "treadmill") { weight = 0; tgt.rx = 0.08; }
    else if (s.kind === "squat") {
      // Down and up over the rep; the bar tips with the tilt.
      const k = s.t - s.repAt < 1.1 ? Math.sin(((s.t - s.repAt) / 1.1) * Math.PI) : 0;
      tgt.y = -0.32 * k; tgt.rx = 0.25 * k; tgt.rz = s.tilt * 0.12;
      R = LIFT.bar; L = LIFT.bar;
      if (bar.current) { bar.current.rotation.z = -s.tilt * 0.25; }
    } else if (s.kind === "bag") {
      const h = s.lastHit && s.t - s.lastHit.at < 0.35 ? s.lastHit : null;
      if (h) {
        const k = punchCurve((s.t - h.at) / 0.35);
        const arm = blend(POSE.guard, h.punch >= 2 ? POSE.hook : POSE.extend, k);
        if (h.punch === 1 || h.punch === 3) R = arm; else L = arm;
      }
      tgt.y = Math.sin(t * 6) * 0.01;
    } else if (s.kind === "rower") {
      // Reach to the catch, drive back with the legs, pull to the chest.
      const k = s.driving ? Math.min(1, (s.t - s.phaseAt) / 0.75) : 1 - Math.min(1, (s.t - s.phaseAt) / 1.2);
      R = blend(LIFT.catch, LIFT.finish, k); L = R;
      tgt.x = -0.45 + k * 0.6; tgt.rx = 0.35 - k * 0.55;
    } else if (s.kind === "spin") {
      R = LIFT.bars; L = LIFT.bars;
      tgt.rx = 0.35; tgt.y = Math.abs(Math.sin(t * 9)) * 0.02;
    } else if (s.kind === "yoga") {
      const poses = [[POSE.victory, POSE.victory], [LIFT.tree, LIFT.tree], [LIFT.warrior, LIFT.warrior], [LIFT.eagle, LIFT.eagle], [LIFT.reachFwd, LIFT.reachBack]];
      [R, L] = poses[Math.min(poses.length - 1, s.pose)] as [ArmPose, ArmPose];
      // The body sways with the dot you're balancing.
      tgt.rz = -s.x * 0.18; tgt.rx = s.y * 0.14;
    }
    const q = p.current;
    q.y = damp(q.y, tgt.y, 10, dt); q.rx = damp(q.rx, tgt.rx, 8, dt); q.rz = damp(q.rz, tgt.rz, 8, dt); q.x = damp(q.x, tgt.x, 8, dt);
    lean.current.position.set(0, q.y, q.x);
    lean.current.rotation.set(q.rx, 0, q.rz);
    setRig(r, R, L);
    r.weight = weight;
  });

  return (
    <group ref={body} position={place.pos} rotation={[0, place.yaw, 0]}>
      <group ref={lean}>
        <CitizenAvatar look={look} animation={anim} rig={rig} />
        {station === "squat" && (
          <group ref={bar} position={[0, 1.44, -0.05]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.022, 0.022, 2, 10]} /><meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.2} /></mesh>
            {[-0.85, 0.85].map((dx) => <mesh key={dx} position={[dx, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.22, 0.22, 0.07, 24]} /><meshStandardMaterial color="#111827" /></mesh>)}
          </group>
        )}
      </group>
    </group>
  );
}

/** The belt rolling under a runner: stripes moving at the treadmill's speed. */
function Belt({ simRef }: { simRef: RefObject<StationSim | null> }) {
  const g = useRef<THREE.Group>(null);
  useGameFrame((dt) => {
    const s = simRef.current;
    if (!g.current || !s || s.kind !== "treadmill") return;
    // The belt runs back under the runner (towards -x).
    g.current.children.forEach((c) => { c.position.x = ((c.position.x - (s.speed / 3.6) * dt + 0.9 + 1.8) % 1.8) - 0.9; });
  });
  return (
    <group ref={g} position={[SPOTS.treadmill, 0.262, 0]}>
      {Array.from({ length: 9 }).map((_, i) => <mesh key={i} position={[-0.9 + i * 0.2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.02, 0.68]} /><meshBasicMaterial color="#374151" /></mesh>)}
    </group>
  );
}

function Camera({ station }: { station: StationId }) {
  const camera = useThree((s) => s.camera);
  const look = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  useGameFrame((dt) => {
    const x = SPOTS[station];
    const side = station === "bag" || station === "rower" || station === "spin" || station === "treadmill";
    target.set(x + (side ? 0.2 : 0.4), station === "yoga" ? 1.9 : 1.75, side ? 3.6 : 3.3);
    look.set(x + (station === "bag" ? 0.25 : 0), station === "rower" ? 0.7 : 1.05, 0);
    camera.position.lerp(target, Math.min(1, dt * 4));
    camera.lookAt(look);
    applyShake(camera);
  });
  return null;
}

export function GymScene({ look, station, simRef, accent = "#e11d48", paused }: { look?: AvatarLookProps; station: StationId; simRef: RefObject<StationSim | null>; accent?: string; paused: boolean }) {
  const tier = useQuality();
  return (
    <group>
      <hemisphereLight args={["#f8fafc", "#1f2937", 0.7]} />
      <directionalLight position={[2, 6, 4]} intensity={1.6} castShadow={tier === 2} shadow-mapSize={[1024, 1024]} />
      {/* Floor, back wall with its mirror, the gym's colour strip and the ceiling lights */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[18, 10]} /><meshStandardMaterial color="#27272a" roughness={0.95} /></mesh>
      <mesh position={[0, 2, -2.2]}><planeGeometry args={[18, 4]} /><meshStandardMaterial color="#e5e7eb" roughness={0.8} /></mesh>
      <mesh position={[0, 1.4, -2.18]}><planeGeometry args={[16, 1.9]} /><meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.08} /></mesh>
      <mesh position={[0, 2.75, -2.17]}><planeGeometry args={[18, 0.14]} /><meshBasicMaterial color={accent} toneMapped={false} /></mesh>
      {[-6, -2, 2, 6].map((lx) => <mesh key={lx} position={[lx, 3.4, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[2.4, 0.35]} /><meshBasicMaterial color="#fefce8" toneMapped={false} /></mesh>)}
      {(Object.keys(SPOTS) as StationId[]).map((id) => <Equipment key={id} id={id} />)}
      <Belt simRef={simRef} />
      <Physics paused={paused} gravity={[0, -9.81, 0]}>
        <HeavyBag simRef={simRef} />
      </Physics>
      <Athlete look={look} station={station} simRef={simRef} />
      <Camera station={station} />
    </group>
  );
}
