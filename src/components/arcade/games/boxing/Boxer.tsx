"use client";

// One boxer in the ring: the citizen's own avatar with its arms driven live from the fight (guard, punches,
// blocks, the opponent's wind-ups), the body leaning into slips and ducks, snapping back when hit and falling
// on a knockdown, and boxing gloves that follow the hands. The opponent's gloves glow as it winds up, so its
// tells are easy to read.

import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { CitizenAvatar, type ArmRig } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { useGameFrame } from "../../stage";
import { FIGHT_RULES, type FightState } from "./fight";
import { blend, newRig, POSE, punchCurve, setRig } from "./poses";

const damp = THREE.MathUtils.damp;

function Glove({ color, glowRef }: { color: string; glowRef: RefObject<THREE.MeshStandardMaterial | null> }) {
  return (
    <group>
      <mesh castShadow scale={[1, 1.08, 1.25]}>
        <sphereGeometry args={[0.068, 18, 14]} />
        <meshStandardMaterial ref={glowRef} color={color} roughness={0.35} metalness={0.05} emissive="#ff3b3b" emissiveIntensity={0} />
      </mesh>
      <mesh position={[0, 0, -0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.05, 0.07, 14]} />
        <meshStandardMaterial color="#f5f5f4" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function Boxer({ look, side, fightRef, glove = "#dc2626", z }: {
  look?: AvatarLookProps;
  side: "me" | "op";
  fightRef: RefObject<FightState>;
  glove?: string;
  /** Where it stands on the ring's centre line (the player faces -z, the opponent +z). */
  z: number;
}) {
  const rig = useRef<ArmRig | null>(newRig());
  const body = useRef<THREE.Group>(null);
  const lean = useRef<THREE.Group>(null);
  const gloveR = useRef<THREE.Group>(null);
  const gloveL = useRef<THREE.Group>(null);
  const glowR = useRef<THREE.MeshStandardMaterial>(null);
  const glowL = useRef<THREE.MeshStandardMaterial>(null);
  const bones = useRef<{ R?: THREE.Object3D; L?: THREE.Object3D }>({});
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const pose = useRef({ rx: 0, rz: 0, x: 0, y: 0, z: 0, ry: 0 });

  useGameFrame((dt, t) => {
    const s = fightRef.current;
    const r = rig.current;
    if (!s || !r || !lean.current) return;
    const me = side === "me";
    const p = pose.current;
    let target = { rx: 0, rz: 0, x: 0, y: Math.sin(t * 7) * 0.012, z: 0, ry: 0 };
    let R = POSE.guard, L = POSE.guard;
    let glowRight = 0, glowLeft = 0;
    const down = (me && s.phase === "meDown") || (!me && s.phase === "opDown") || (s.phase === "over" && s.result && (me ? !s.result.win : s.result.win) && s.result.method !== "Decision");
    const won = s.phase === "over" && s.result && (me ? s.result.win : !s.result.win);

    if (down) {
      R = POSE.limp; L = POSE.limp;
      target = { rx: -1.35, rz: 0.1, x: 0, y: 0, z: -0.55, ry: 0 };
    } else if (won) {
      R = POSE.victory; L = POSE.victory;
      target.y = Math.abs(Math.sin(t * 5)) * 0.05;
    } else if (me) {
      // The player: punches, block, slips and ducks, recoil when hit.
      if (s.punch) {
        const def = FIGHT_RULES.player[s.punch.move];
        const k = punchCurve(Math.min(1, s.punch.at / (def.time * (s.me.stamina < FIGHT_RULES.stamina.tiredBelow ? 1.35 : 1))));
        const peak = s.punch.move === "hookL" || s.punch.move === "hookR" ? POSE.hook : s.punch.move === "upper" ? POSE.upper : POSE.extend;
        const arm = blend(POSE.guard, peak, k);
        if (def.hand === "R") R = arm; else L = arm;
        target.ry = (def.hand === "R" ? 1 : -1) * 0.22 * k;
        target.rx = 0.12 * k;
      } else if (s.blocking) {
        R = POSE.block; L = POSE.block;
        target.rx = 0.12;
      }
      if (s.dodge && s.dodge.at < FIGHT_RULES.dodge.active + FIGHT_RULES.dodge.recover * 0.5) {
        if (s.dodge.move === "duck") { target.rx = 0.62; target.y = -0.04; }
        else { const left = s.dodge.move === "slipL"; target.rz = left ? -0.34 : 0.34; target.x = left ? 0.2 : -0.2; }
      }
      if (s.recoil > 0) target.rx = -0.3 * (s.recoil / 0.3);
    } else {
      // The opponent: its wind-ups (the tells), its strikes, blocking your punches, reeling when hit.
      const a = s.opAttack;
      if (a) {
        const right = a.move === "hookR" || a.move === "upper";
        const wind = a.move === "upper" ? POSE.windUpper : a.move === "jab" || a.move === "combo" ? POSE.windJab : POSE.windHook;
        const peak = a.move === "upper" ? POSE.upper : a.move === "hookL" || a.move === "hookR" ? POSE.hook : POSE.extend;
        if (a.phase === "tell") {
          const k = Math.min(1, a.at / a.tell);
          const arm = blend(POSE.guard, wind, k);
          if (right) R = arm; else L = arm;
          // The body tell: a shoulder dip to the punching side, a crouch for the uppercut.
          target.rz = (right ? 1 : -1) * (a.move.startsWith("hook") ? 0.2 : 0.06) * k;
          target.rx = a.move === "upper" ? 0.32 * k : -0.06 * k;
          target.ry = (right ? -1 : 1) * 0.18 * k; // the punching shoulder drawn back
          if (right) glowRight = k; else glowLeft = k;
        } else {
          const m = FIGHT_RULES.opponent[a.move];
          const hits = "hits" in m ? (m as { hits: number }).hits : 1;
          const gap = "gap" in m ? (m as { gap: number }).gap : 0;
          // Combos alternate hands, each punch out and back.
          const idx = Math.min(hits - 1, Math.floor(a.at / Math.max(0.001, gap || m.strike)));
          const local = gap ? (a.at - idx * gap) / Math.max(0.12, m.strike) : a.at / m.strike;
          const arm = blend(wind, peak, punchCurve(Math.min(1, local)));
          const useRight = a.move === "combo" ? idx % 2 === 1 : right;
          if (useRight) R = arm; else L = arm;
          target.ry = (useRight ? 1 : -1) * 0.2; // the punching shoulder driven through
          target.rx = 0.1;
        }
      } else if (s.opBlocking && s.punch && !s.punch.landed) {
        R = POSE.block; L = POSE.block;
      }
      if (s.t < s.openUntil) { target.rx = -0.12; target.rz = 0.08 * Math.sin(t * 9); }
      if (s.opRecoil > 0) target.rx = -0.32 * (s.opRecoil / 0.25);
    }

    // Ease towards the target: quick into slips and punches, a little slower back.
    const speed = down ? 4 : 16;
    p.rx = damp(p.rx, target.rx, speed, dt); p.rz = damp(p.rz, target.rz, speed, dt); p.ry = damp(p.ry, target.ry, speed, dt);
    p.x = damp(p.x, target.x, speed, dt); p.y = damp(p.y, target.y, speed, dt); p.z = damp(p.z, target.z, down ? 3 : 12, dt);
    lean.current.rotation.set(p.rx, p.ry, p.rz);
    lean.current.position.set(p.x, p.y, p.z);
    setRig(r, R, L);

    // Gloves on the hands (the hand bones are found once the avatar has loaded).
    const g = bones.current;
    if (!g.R || !g.L) {
      lean.current.traverse((o) => {
        if (/(Bip01_R_Hand|RightHand)$/.test(o.name)) g.R = o;
        if (/(Bip01_L_Hand|LeftHand)$/.test(o.name)) g.L = o;
      });
    }
    if (g.R && gloveR.current && body.current) { g.R.getWorldPosition(tmp); body.current.worldToLocal(tmp); gloveR.current.position.copy(tmp); gloveR.current.visible = true; }
    if (g.L && gloveL.current && body.current) { g.L.getWorldPosition(tmp); body.current.worldToLocal(tmp); gloveL.current.position.copy(tmp); gloveL.current.visible = true; }
    if (glowR.current) glowR.current.emissiveIntensity = glowRight * 1.6;
    if (glowL.current) glowL.current.emissiveIntensity = glowLeft * 1.6;
  });

  return (
    <group ref={body} position={[0, 0, z]} rotation={[0, side === "me" ? Math.PI : 0, 0]}>
      <group ref={lean}>
        <CitizenAvatar look={look} animation="idle" rig={rig} />
      </group>
      <group ref={gloveR} visible={false}><Glove color={glove} glowRef={glowR} /></group>
      <group ref={gloveL} visible={false}><Glove color={glove} glowRef={glowL} /></group>
    </group>
  );
}
