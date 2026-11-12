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
import { blend, legPose, newRig, POSE, punchCurve, setRig, type LegDrive } from "./poses";

const damp = THREE.MathUtils.damp;

function Glove({ color, glowRef }: { color: string; glowRef: RefObject<THREE.MeshStandardMaterial | null> }) {
  return (
    <group>
      <mesh castShadow scale={[1, 1.08, 1.25]}>
        <sphereGeometry args={[0.078, 18, 14]} />
        <meshStandardMaterial ref={glowRef} color={color} roughness={0.35} metalness={0.05} emissive="#ff3b3b" emissiveIntensity={0} />
      </mesh>
      <mesh position={[0, 0, -0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.05, 0.07, 14]} />
        <meshStandardMaterial color="#f5f5f4" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function Boxer({ look, side, fightRef, glove = "#dc2626" }: {
  look?: AvatarLookProps;
  side: "me" | "op";
  fightRef: RefObject<FightState>;
  glove?: string;
}) {
  const rig = useRef<ArmRig | null>(newRig());
  const body = useRef<THREE.Group>(null);
  const lean = useRef<THREE.Group>(null);
  const gloveR = useRef<THREE.Group>(null);
  const gloveL = useRef<THREE.Group>(null);
  const glowR = useRef<THREE.MeshStandardMaterial>(null);
  const glowL = useRef<THREE.MeshStandardMaterial>(null);
  const bones = useRef<{ R?: THREE.Object3D; L?: THREE.Object3D; FR?: THREE.Object3D; FL?: THREE.Object3D }>({});
  const tmp2 = useMemo(() => new THREE.Vector3(), []);
  const gloveQ = useMemo(() => ({ q: new THREE.Quaternion(), z: new THREE.Vector3(0, 0, 1) }), []);
  // Footwork: the step cycle, and how they're moving (smoothed), from where they are frame to frame.
  const feet = useRef({ step: 0, vx: 0, vz: 0, px: NaN, pz: NaN });
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const pose = useRef({ rx: 0, rz: 0, x: 0, y: 0, z: 0, ry: 0 });
  const yaw = useRef(side === "me" ? Math.PI : 0);
  const hop = useRef(0);

  useGameFrame((dt, t) => {
    const s = fightRef.current;
    const r = rig.current;
    if (!s || !r || !lean.current) return;
    const me = side === "me";
    const p = pose.current;
    let target = { rx: 0, rz: 0, x: 0, y: 0, z: 0, ry: 0 };
    // The legs: a soft stance with a bounce, then whatever the fight adds (below).
    const legs: LegDrive = { bend: 0.32 + 0.06 * Math.sin(t * 7), frontBend: 0, loadL: 0, loadR: 0, rearDrive: 0, step: 0, stepAmp: 0, moveF: 0, moveR: 0 };
    /** The legs behind a punch: the rear leg drives straights and right hooks, the front knee jabs and left hooks,
        an uppercut dips and rises, a body shot drops the level. */
    const punchLegs = (move: string, hand: string, k: number) => {
      if (move === "upper") legs.bend += 0.45 * k;
      else if (move === "body") legs.bend += 0.6 * k;
      else if (hand === "R") { legs.rearDrive += k; legs.frontBend += 0.15 * k; }
      else legs.frontBend += 0.28 * k;
    };
    const dodgeLegs = (d: { move: string } | null | undefined) => {
      if (!d) return;
      if (d.move === "duck") legs.bend += 0.7;
      else if (d.move === "slipL") legs.loadL += 0.5;
      else legs.loadR += 0.5;
    };
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
      legs.bend = 0.05;
    } else if (me) {
      // The player: punches, block, slips and ducks, recoil when hit.
      if (s.punch) {
        const def = FIGHT_RULES.player[s.punch.move];
        const prog = Math.min(1, s.punch.at / (def.time * (s.me.stamina < FIGHT_RULES.stamina.tiredBelow ? 1.35 : 1)));
        const move = s.punch.move;
        // The one-two: the left jab out and back in the first half, the right straight in the second.
        const two = move === "onetwo";
        const hand = two ? (prog < 0.5 ? "L" : "R") : def.hand;
        const k = punchCurve(two ? (prog < 0.5 ? prog * 2 : (prog - 0.5) * 2) : prog);
        const peak = move === "hookL" || move === "hookR" ? POSE.hook : move === "upper" ? POSE.upper : move === "body" ? POSE.body : POSE.extend;
        const arm = blend(POSE.guard, peak, k);
        if (hand === "R") R = arm; else L = arm;
        target.ry = (hand === "R" ? 1 : -1) * 0.22 * k;
        // Dropping the level for a body shot; stepping into an uppercut.
        target.rx = (move === "body" ? 0.42 : 0.12) * k;
        if (move === "body") target.y = -0.1 * k;
        punchLegs(move, hand, k);
      } else if (s.blocking) {
        R = POSE.block; L = POSE.block;
        target.rx = 0.12;
        legs.bend += 0.1;
      }
      if (s.dodge && s.dodge.at < FIGHT_RULES.dodge.active + FIGHT_RULES.dodge.recover * 0.5) {
        if (s.dodge.move === "duck") { target.rx = 0.62; target.y = -0.04; }
        else { const left = s.dodge.move === "slipL"; target.rz = left ? -0.34 : 0.34; target.x = left ? 0.2 : -0.2; }
        dodgeLegs(s.dodge);
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
          // Loading up: sitting into the legs (deep for an uppercut).
          legs.bend += (a.move === "upper" ? 0.35 : 0.12) * k;
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
          punchLegs(a.move, useRight ? "R" : "L", punchCurve(Math.min(1, local)));
        }
      } else if (s.opBlocking && s.punch && !s.punch.landed) {
        R = POSE.block; L = POSE.block;
      }
      // A live opponent dodges too: the same slips and ducks as yours.
      if (s.opDodge && s.opDodge.at < FIGHT_RULES.dodge.active + FIGHT_RULES.dodge.recover * 0.5) {
        if (s.opDodge.move === "duck") { target.rx = 0.62; target.y = -0.04; }
        else { const left = s.opDodge.move === "slipL"; target.rz = left ? -0.34 : 0.34; target.x = left ? 0.2 : -0.2; }
        dodgeLegs(s.opDodge);
      }
      if (s.t < s.openUntil) { target.rx = -0.12; target.rz = 0.08 * Math.sin(t * 9); }
      if (s.opRecoil > 0) target.rx = -0.32 * (s.opRecoil / 0.25);
    }

    // Ease towards the target: quick into slips and punches, a little slower back.
    const speed = down ? 4 : 16;
    p.rx = damp(p.rx, target.rx, speed, dt); p.rz = damp(p.rz, target.rz, speed, dt); p.ry = damp(p.ry, target.ry, speed, dt);
    p.x = damp(p.x, target.x, speed, dt); p.y = damp(p.y, target.y, speed, dt); p.z = damp(p.z, target.z, down ? 3 : 12, dt);
    lean.current.rotation.set(p.rx, p.ry, p.rz);
    // Footwork: where they stand in the ring, always squared up to the other fighter, bouncing as they move.
    const at = me ? s.pos.me : s.pos.op, other = me ? s.pos.op : s.pos.me;
    const moving = Math.min(1, (me ? s.speed.me : s.speed.op) / 1.2);
    hop.current += dt * (6 + moving * 8);
    if (body.current) {
      body.current.position.set(at[0], 0, at[1]);
      const want = Math.atan2(other[0] - at[0], other[1] - at[1]);
      const diff = Math.atan2(Math.sin(want - yaw.current), Math.cos(want - yaw.current));
      yaw.current += diff * Math.min(1, dt * 12);
      body.current.rotation.y = yaw.current;
    }
    // How they're moving, in their own frame (forward towards the other fighter, and to their right), from where
    // they are frame to frame: the feet step that way, bigger steps the faster they go, a little shuffle standing.
    const fw = feet.current;
    if (!Number.isNaN(fw.px) && dt > 0) {
      fw.vx = damp(fw.vx, (at[0] - fw.px) / dt, 10, dt);
      fw.vz = damp(fw.vz, (at[1] - fw.pz) / dt, 10, dt);
    }
    fw.px = at[0]; fw.pz = at[1];
    const sp = Math.hypot(fw.vx, fw.vz);
    const fwdX = Math.sin(yaw.current), fwdZ = Math.cos(yaw.current);
    legs.moveF = sp > 0.05 ? (fw.vx * fwdX + fw.vz * fwdZ) / sp : 0;
    // Their right, facing (fwdX, fwdZ), is (-fwdZ, fwdX) on the canvas (a fighter facing +z has their right at -x).
    legs.moveR = sp > 0.05 ? (-fw.vx * fwdZ + fw.vz * fwdX) / sp : 0;
    legs.stepAmp = Math.min(1, sp / 1.1) + 0.12;
    fw.step += dt * (6 + 8 * Math.min(1, sp / 1.1));
    legs.step = fw.step;
    // Knees bent lower the hips, so the feet stay on the canvas.
    const sit = Math.min(1.4, legs.bend + Math.max(legs.frontBend + legs.loadL, legs.loadR) * 0.5);
    lean.current.position.set(p.x, p.y - (down ? 0 : 0.085 * sit) + (down ? 0 : Math.abs(Math.sin(hop.current)) * 0.03 * moving), p.z);
    setRig(r, R, L);
    r.legs = down ? undefined : legPose(legs);
    // Hands shrunk away inside the gloves.
    r.handScale = 0.02;

    // Gloves on the hands (the hand bones are found once the avatar has loaded).
    const g = bones.current;
    if (!g.R || !g.L) {
      lean.current.traverse((o) => {
        if (/(Bip01_R_Hand|RightHand)$/.test(o.name)) g.R = o;
        if (/(Bip01_L_Hand|LeftHand)$/.test(o.name)) g.L = o;
        if (/(Bip01_R_Forearm|RightForeArm)$/.test(o.name)) g.FR = o;
        if (/(Bip01_L_Forearm|LeftForeArm)$/.test(o.name)) g.FL = o;
      });
    }
    // Each glove on the end of the forearm, over the (hidden) hand, its cuff towards the elbow.
    for (const [hand, fore, glove] of [[g.R, g.FR, gloveR.current], [g.L, g.FL, gloveL.current]] as const) {
      if (!hand || !glove || !body.current) continue;
      hand.getWorldPosition(tmp); body.current.worldToLocal(tmp);
      if (fore) {
        fore.getWorldPosition(tmp2); body.current.worldToLocal(tmp2);
        tmp2.subVectors(tmp, tmp2).normalize();
        glove.quaternion.copy(gloveQ.q.setFromUnitVectors(gloveQ.z, tmp2));
        tmp.addScaledVector(tmp2, 0.06);
      }
      glove.position.copy(tmp);
      glove.visible = true;
    }
    if (glowR.current) glowR.current.emissiveIntensity = glowRight * 1.6;
    if (glowL.current) glowL.current.emissiveIntensity = glowLeft * 1.6;
  });

  return (
    <group ref={body} position={[0, 0, side === "me" ? 0.62 : -0.62]} rotation={[0, side === "me" ? Math.PI : 0, 0]}>
      <group ref={lean}>
        <CitizenAvatar look={look} animation="idle" rig={rig} />
      </group>
      <group ref={gloveR} visible={false}><Glove color={glove} glowRef={glowR} /></group>
      <group ref={gloveL} visible={false}><Glove color={glove} glowRef={glowL} /></group>
    </group>
  );
}
