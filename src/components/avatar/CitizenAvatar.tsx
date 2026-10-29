"use client";

// Realistic 3D citizen. Two sources:
//  - roster: ready-made Rocketbox humans (MIT) that play our animation clips directly;
//  - custom: an avatar the citizen made from selfies or photos in Avaturn, animated by
//    retargeting the same clips from an invisible Rocketbox skeleton.

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { applyBodyShape, buildBodyFrame, defaultBodyType, prepareForShaping } from "./bodyShape";
import { isOutfit, presetFor, rosterAnimations, rosterModel, type AvatarLookProps, type Gender } from "./roster";
import { composeOutfit } from "./outfit";
import { createRetargeter } from "./retarget";
import { useAvatarUrl } from "./customAvatarStore";
import { attachAccessories, buildAccessoryRig } from "./accessories";
import type { Accessory } from "@/lib/city/types";

export type { AvatarLookProps } from "./roster";
/**
 * "sleep" and "swim" have no clips of their own: sleep is the idle clip slowed to a sleeper's breathing,
 * swim is the walk clip sped up for the leg kick (the scene lays the body down; BodyPose moves the arms).
 */
export type AvatarAnimation = "idle" | "sit" | "wave" | "clap" | "walk" | "dance" | "talk" | "sleep" | "swim" | "skate" | "run";
// skate: the walk clip slowed right down, for long gliding strides; run: its own clip, built from the walk
// (see makeRunClip), played at a runner's cadence.
const CLIP_FOR: Partial<Record<AvatarAnimation, AvatarAnimation>> = { sleep: "idle", swim: "walk", skate: "walk" };
const SPEED_FOR: Partial<Record<AvatarAnimation, number>> = { sleep: 0.3, swim: 1.5, skate: 0.55, run: 1.85 };

/**
 * Arm poses laid over whatever clip is playing, for rides and water: arms crossed on the chest (slides),
 * both arms up (screaming down a drop), freestyle strokes (swimming), arms out for balance (surfing),
 * gripping the handles (rafts and rings), hugging the knees (cannonball), a mic to the mouth (karaoke)
 * and the bowling swing.
 */
export type BodyPose = "armsCrossed" | "armsUp" | "swim" | "balance" | "grip" | "tuck" | "mic" | "throw";

export const DEFAULT_LOOK: AvatarLookProps = { gender: "woman", bodyType: "Hourglass" };

const HEIGHT: Record<Gender, number> = { woman: 1.68, man: 1.8 };
const CLIPS: Exclude<AvatarAnimation, "sleep" | "swim" | "skate" | "run">[] = ["idle", "sit", "wave", "clap", "walk", "dance", "talk"];

/** Soft studio lighting for realistic skin, generated in code (no HDR download). */
export function StudioEnvironment({ intensity = 0.6 }: { intensity?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  // Setting scene.environment is how three.js takes an environment map, so the scene is mutated here.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
  /* eslint-enable react-hooks/immutability */
  return null;
}

/**
 * A run, made from the walk: the same skeleton motion, every joint moving the way it already does but
 * further (a long stride, a driving thigh, arms swinging from the shoulder), with the knees and elbows
 * held bent along their own hinge (elbows near 90°, pumping), and a bigger bounce through the hips.
 *  scale: how much further each joint swings round its average;  bend: extra flex in radians, in the
 *  direction the joint already flexes in the walk compared with the skeleton at rest.
 */
const RUN_SHAPE: Record<string, { scale: number; bend?: number }> = {
  Bip01_L_Thigh: { scale: 1.75 }, Bip01_R_Thigh: { scale: 1.75 },
  Bip01_L_Calf: { scale: 1.7, bend: 0.5 }, Bip01_R_Calf: { scale: 1.7, bend: 0.5 },
  Bip01_L_Foot: { scale: 1.3 }, Bip01_R_Foot: { scale: 1.3 },
  // The arms are placed each frame instead (useRunArms): their bones' axes don't amplify cleanly.
  Bip01_Spine: { scale: 1.4 }, Bip01_Spine1: { scale: 1.4 }, Bip01_Pelvis: { scale: 1.35 },
};

/** The main direction a set of rotation vectors spread along (power iteration on their covariance), or null. */
function principalAxis(rv: THREE.Vector3[]): THREE.Vector3 | null {
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const r of rv) {
    const c = [r.x, r.y, r.z];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) m[a * 3 + b] += c[a] * c[b];
  }
  let x = new THREE.Vector3(1, 0.5, 0.25);
  for (let k = 0; k < 24; k++) {
    const y = new THREE.Vector3(m[0] * x.x + m[1] * x.y + m[2] * x.z, m[3] * x.x + m[4] * x.y + m[5] * x.z, m[6] * x.x + m[7] * x.y + m[8] * x.z);
    if (y.lengthSq() < 1e-14) return null;
    x = y.normalize();
  }
  return x;
}

function makeRunClip(walk: THREE.AnimationClip, rest: THREE.Object3D): THREE.AnimationClip {
  const run = walk.clone();
  run.name = "run";
  const q = new THREE.Quaternion(), mean = new THREE.Quaternion(), d = new THREE.Quaternion(), flex = new THREE.Quaternion(), axis = new THREE.Vector3();
  for (const t of run.tracks) {
    const bone = t.name.split(".")[0];
    if (t.name.endsWith(".position") && bone === "Bip01_Pelvis") {
      // Twice the rise and fall of the hips: a runner's bounce.
      const v = t.values, n = v.length / 3;
      let avg = 0;
      for (let i = 0; i < n; i++) avg += v[i * 3 + 1] / n;
      for (let i = 0; i < n; i++) v[i * 3 + 1] = avg + (v[i * 3 + 1] - avg) * 2.2;
      continue;
    }
    const shape = RUN_SHAPE[bone];
    if (!shape || !t.name.endsWith(".quaternion")) continue;
    const v = t.values, n = v.length / 4;
    // The joint's average pose over the cycle (all keys on the same side of the sphere).
    const first = new THREE.Quaternion(v[0], v[1], v[2], v[3]);
    const sum = [0, 0, 0, 0];
    for (let i = 0; i < n; i++) {
      q.fromArray(v, i * 4);
      const sign = q.dot(first) < 0 ? -1 : 1;
      sum[0] += q.x * sign; sum[1] += q.y * sign; sum[2] += q.z * sign; sum[3] += q.w * sign;
    }
    mean.set(sum[0], sum[1], sum[2], sum[3]).normalize();
    // Each key as a rotation vector away from the average (axis × angle).
    const rv: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      q.fromArray(v, i * 4);
      d.copy(mean).invert().multiply(q);
      if (d.w < 0) d.set(-d.x, -d.y, -d.z, -d.w);
      const angle = 2 * Math.acos(Math.min(1, d.w));
      axis.set(d.x, d.y, d.z);
      // A copy for each key (axis is reused scratch space).
      rv.push(axis.lengthSq() > 1e-10 ? axis.clone().normalize().multiplyScalar(angle) : new THREE.Vector3());
    }
    // The joint's hinge: the axis it swings round most (the main direction of those vectors). Only the swing
    // round it is made bigger; any sideways or twisting motion stays as it is in the walk, so a leg can't
    // flare out to the side.
    const hinge = principalAxis(rv);
    if (shape.bend) {
      const restQ = rest.getObjectByName(bone)?.quaternion;
      flex.identity();
      if (restQ && hinge) {
        // Bend further along the hinge, in the direction the joint already flexes from rest.
        d.copy(restQ).invert().multiply(mean);
        if (d.w < 0) d.set(-d.x, -d.y, -d.z, -d.w);
        const dir = Math.sign(d.x * hinge.x + d.y * hinge.y + d.z * hinge.z) || 1;
        flex.setFromAxisAngle(hinge, dir * shape.bend);
      }
    }
    for (let i = 0; i < n; i++) {
      const r = rv[i].clone();
      if (hinge) r.addScaledVector(hinge, r.dot(hinge) * (shape.scale - 1));
      const angle = r.length();
      d.identity();
      if (angle > 1e-8) d.setFromAxisAngle(r.divideScalar(angle), angle);
      q.copy(mean);
      if (shape.bend) q.multiply(flex);
      q.multiply(d).normalize();
      q.toArray(v, i * 4);
    }
  }
  return run;
}

/** Clips from the roster animation files, renamed, and trimmed so they fit any body size. */
function useRosterClips(gender: Gender) {
  const urls = rosterAnimations(gender);
  const files = useGLTF(CLIPS.map((c) => urls[c]));
  return useMemo(
    () => {
      const clips = files.map((f, i) => {
        const clip = f.animations[0].clone();
        clip.name = CLIPS[i];
        // Rotations drive every bone, but only the root/pelvis may move: per-bone offsets
        // would force the animation actor's proportions onto every body.
        // The walk is played in place: the scene moves the avatar, so the root must not drift.
        const rootMotion = CLIPS[i] === "walk" ? /^Bip01_Pelvis\.position$/ : /^Bip01(_Pelvis)?\.position$/;
        clip.tracks = clip.tracks.filter((t) => t.name.endsWith(".quaternion") || rootMotion.test(t.name));
        return clip;
      });
      const w = CLIPS.indexOf("walk");
      return [...clips, makeRunClip(clips[w], files[w].scene)];
    },
    [files],
  );
}

/** Clones a loaded model and measures it at rest: height, floor offset and facing. */
function usePreparedModel(source: THREE.Object3D, shape: boolean) {
  return useMemo(() => {
    const scene = cloneSkinned(source) as THREE.Group;
    const meshes: THREE.Mesh[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false; // skinned bounds don't follow the animation
      // Sculpting works on the model's own body; a face borrowed for an outfit is left as made.
      if (!m.userData.borrowedFace) meshes.push(m);
    });
    if (shape) prepareForShaping(meshes);
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);

    // Facing: perpendicular to the hips (right thigh -> left thigh), so turned-out feet don't skew it.
    const named = (...names: string[]) => names.map((n) => scene.getObjectByName(n)).find(Boolean);
    const leftThigh = named("Bip01_L_Thigh", "LeftUpLeg");
    const rightThigh = named("Bip01_R_Thigh", "RightUpLeg");
    let yaw = 0;
    if (leftThigh && rightThigh) {
      const left = leftThigh.getWorldPosition(new THREE.Vector3()).sub(rightThigh.getWorldPosition(new THREE.Vector3()));
      const forward = new THREE.Vector3().crossVectors(left, new THREE.Vector3(0, 1, 0));
      yaw = Math.atan2(forward.x, forward.z);
    }
    const height = box.max.y - box.min.y;
    return { scene, meshes, frame: shape ? buildBodyFrame(meshes) : null, height, minY: box.min.y, yaw, rig: buildAccessoryRig(scene, height, yaw) };
  }, [source, shape]);
}

interface Placement {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

/** Keeps the worn accessories attached to the model's skeleton. */
function useAccessories(model: { rig: ReturnType<typeof buildAccessoryRig> }, accessories: Accessory[] | undefined) {
  const key = (accessories ?? []).slice().sort().join(",");
  useEffect(() => {
    if (!key) return;
    return attachAccessories(model.rig, key.split(",") as Accessory[]);
  }, [model, key]);
}

/** Places a model: real-world height, feet on the floor, facing +z, then the caller's position. */
function Framed({ model, gender, placement, children }: { model: { height: number; minY: number; yaw: number }; gender: Gender; placement: Placement; children: React.ReactNode }) {
  const s = HEIGHT[gender] / model.height;
  return (
    <group position={placement.position} rotation={placement.rotation}>
      <group rotation={[0, -model.yaw, 0]}>
        <group scale={s} position={[0, -model.minY * s, 0]}>{children}</group>
      </group>
    </group>
  );
}

function usePlay(actions: Record<string, THREE.AnimationAction | null>, animation: AvatarAnimation) {
  useEffect(() => {
    const action = actions[CLIP_FOR[animation] ?? animation] ?? actions.idle;
    if (!action) return;
    action.setEffectiveTimeScale(SPEED_FOR[animation] ?? 1);
    action.reset().fadeIn(0.35).play();
    return () => {
      action.fadeOut(0.35);
    };
  }, [actions, animation]);
}

export type CarryMode = "hold" | "raise" | "drink" | "eat";

/**
 * A runner's arms, set each frame once the run clip has posed the legs: each upper arm swings forward and
 * back beside the body in time with the opposite leg, the forearm held at a right angle to it (hands
 * carried in toward the middle), so the elbows pump. Bones are turned to point where they should go, so
 * this works whatever the skeleton's own axes. Call after the clip has been applied for the frame.
 */
function useRunArms(model: { scene: THREE.Object3D }, active: boolean) {
  const bones = useMemo(() => {
    const named = (...names: string[]) => names.map((n) => model.scene.getObjectByName(n)).find(Boolean);
    const side = (s: "L" | "R", full: "Left" | "Right") => ({
      upper: named(`Bip01_${s}_UpperArm`, `${full}Arm`), fore: named(`Bip01_${s}_Forearm`, `${full}ForeArm`), hand: named(`Bip01_${s}_Hand`, `${full}Hand`),
      thigh: named(`Bip01_${s}_Thigh`, `${full}UpLeg`), calf: named(`Bip01_${s}_Calf`, `${full}Leg`),
    });
    return { L: side("L", "Left"), R: side("R", "Right") };
  }, [model]);
  const v = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), left: new THREE.Vector3(), fwd: new THREE.Vector3(), down: new THREE.Vector3(),
    dir: new THREE.Vector3(), cur: new THREE.Vector3(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), q3: new THREE.Quaternion() }), []);

  useFrame(() => {
    if (!active) return;
    const { L, R } = bones;
    if (!L.upper || !L.fore || !L.hand || !L.thigh || !L.calf || !R.upper || !R.fore || !R.hand || !R.thigh || !R.calf) return;
    model.scene.updateWorldMatrix(true, true);
    // The body's own frame: left (across the hips), forward, and down.
    v.left.copy(L.thigh.getWorldPosition(v.a)).sub(R.thigh.getWorldPosition(v.b)).normalize();
    v.down.set(0, -1, 0);
    v.fwd.crossVectors(v.left, v.down.clone().negate()).normalize();
    v.down.crossVectors(v.left, v.fwd).normalize().negate();
    if (v.down.y > 0) v.down.negate();

    const aim = (bone: THREE.Object3D, child: THREE.Object3D, to: THREE.Vector3) => {
      if (!bone.parent) return;
      v.cur.copy(child.getWorldPosition(v.a)).sub(bone.getWorldPosition(v.b)).normalize();
      v.q.setFromUnitVectors(v.cur, to);
      bone.getWorldQuaternion(v.q2).premultiply(v.q);
      bone.quaternion.copy(bone.parent.getWorldQuaternion(v.q3).invert().multiply(v.q2));
      bone.updateWorldMatrix(false, true);
    };

    for (const [arm, opp, out] of [[L, R, 1], [R, L, -1]] as const) {
      // How far the opposite knee is ahead of its hip (−1 behind … 1 ahead): the arm swings with it.
      const thigh = v.a.copy(opp.calf!.getWorldPosition(v.a)).sub(opp.thigh!.getWorldPosition(v.b));
      const k = Math.max(-1, Math.min(1, thigh.dot(v.fwd) / Math.max(0.001, thigh.length())));
      // A slight backward bias: the elbow drives back behind the body on the back swing.
      const swing = k * 1.4 - 0.12;
      // Upper arm: down, swung forward or back, a little out from the body.
      v.dir.copy(v.down).multiplyScalar(Math.cos(swing)).addScaledVector(v.fwd, Math.sin(swing)).addScaledVector(v.left, out * 0.14).normalize();
      aim(arm.upper!, arm.fore!, v.dir.clone());
      // Forearm: a right angle forward of the upper arm, hands toward the middle.
      v.dir.copy(v.down).multiplyScalar(-Math.sin(swing)).addScaledVector(v.fwd, Math.cos(swing)).addScaledVector(v.left, -out * 0.28).normalize();
      aim(arm.fore!, arm.hand!, v.dir.clone());
    }
  });
}

/**
 * Something carried in the right hand (a bottle, a drink, food prop…), kept upright whatever the arm does.
 * With `raise`, the arm is lifted overhead (bottle service).
 * With `drink` or `eat`, the arm periodically lifts towards the mouth in a natural sip or dining gesture.
 * Call after useAnimations so it runs once the clip has posed the skeleton for the frame.
 */
function useCarry(model: { scene: THREE.Object3D }, mode: CarryMode | false, held: React.RefObject<THREE.Group | null>) {
  const bones = useMemo(() => {
    const named = (...names: string[]) => names.map((n) => model.scene.getObjectByName(n)).find(Boolean);
    return {
      upper: named("Bip01_R_UpperArm", "RightArm"),
      forearm: named("Bip01_R_Forearm", "RightForeArm", "Bip01_R_Elbow"),
      hand: named("Bip01_R_Hand", "RightHand"),
      neck: named("Bip01_Neck", "Neck"),
      head: named("Bip01_Head", "Head"),
    };
  }, [model]);
  const tmp = useMemo(() => ({
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    c: new THREE.Vector3(),
    q: new THREE.Quaternion(),
    q2: new THREE.Quaternion(),
    target: new THREE.Vector3(),
  }), []);

  useFrame(({ clock }) => {
    const { upper, forearm, hand, neck, head } = bones;
    if (!upper || !hand) return;
    const { a, b, c, q, q2, target } = tmp;

    // Refresh matrices so bone world coordinates are accurate after animation update
    model.scene.updateWorldMatrix(true, false);

    let sipWeight = 0;
    let eatWeight = 0;

    if (mode === "raise" && upper.parent && neck) {
      // Swing the whole arm so shoulder→hand points up and a little out to the side.
      const shoulder = upper.getWorldPosition(a);
      const current = hand.getWorldPosition(b).sub(shoulder).normalize();
      const out = neck.getWorldPosition(c).negate().add(shoulder).setY(0).normalize();
      target.copy(out).multiplyScalar(0.3).add(new THREE.Vector3(0, 1, 0)).normalize();
      q.setFromUnitVectors(current, target);
      upper.getWorldQuaternion(q2).premultiply(q);
      upper.quaternion.copy(upper.parent.getWorldQuaternion(q).invert().multiply(q2));
      upper.updateWorldMatrix(false, true);
    } else if (mode === "drink" && upper.parent && neck) {
      // Natural drinking gesture: sips every 4 seconds
      const t = clock.getElapsedTime() % 4.0;
      if (t < 1.1) {
        sipWeight = Math.sin((t / 1.1) * (Math.PI / 2));
      } else if (t < 2.3) {
        sipWeight = 1.0;
      } else if (t < 3.2) {
        sipWeight = Math.cos(((t - 2.3) / 0.9) * (Math.PI / 2));
      } else {
        sipWeight = 0;
      }

      const shoulder = upper.getWorldPosition(a);
      const mouthTarget = (head ?? neck).getWorldPosition(c).add(new THREE.Vector3(0, -0.04, 0.12));
      const restTarget = shoulder.clone().add(new THREE.Vector3(0.08, -0.16, 0.28));
      const currentTarget = restTarget.lerp(mouthTarget, sipWeight);

      const current = hand.getWorldPosition(b).sub(shoulder).normalize();
      target.copy(currentTarget).sub(shoulder).normalize();
      q.setFromUnitVectors(current, target);
      const identity = new THREE.Quaternion();
      const weight = 0.55 + sipWeight * 0.42;
      const blended = identity.slerp(q, weight);
      upper.getWorldQuaternion(q2).premultiply(blended);
      upper.quaternion.copy(upper.parent.getWorldQuaternion(q).invert().multiply(q2));
      upper.updateWorldMatrix(false, true);

      if (forearm && forearm.parent) {
        const bendQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.5 + sipWeight * 0.85);
        forearm.quaternion.multiply(bendQ);
        forearm.updateWorldMatrix(false, true);
      }
    } else if (mode === "eat" && upper.parent && neck) {
      // Natural dining gesture: raises fork/food towards mouth every 4.2 seconds
      const t = clock.getElapsedTime() % 4.2;
      if (t < 1.0) {
        eatWeight = Math.sin((t / 1.0) * (Math.PI / 2));
      } else if (t < 2.2) {
        eatWeight = 1.0;
      } else if (t < 3.2) {
        eatWeight = Math.cos(((t - 2.2) / 1.0) * (Math.PI / 2));
      } else {
        eatWeight = 0;
      }

      const shoulder = upper.getWorldPosition(a);
      const mouthTarget = (head ?? neck).getWorldPosition(c).add(new THREE.Vector3(0, -0.06, 0.1));
      const plateTarget = shoulder.clone().add(new THREE.Vector3(0.06, -0.25, 0.25));
      const currentTarget = plateTarget.lerp(mouthTarget, eatWeight);

      const current = hand.getWorldPosition(b).sub(shoulder).normalize();
      target.copy(currentTarget).sub(shoulder).normalize();
      q.setFromUnitVectors(current, target);
      const identity = new THREE.Quaternion();
      const weight = 0.5 + eatWeight * 0.45;
      const blended = identity.slerp(q, weight);
      upper.getWorldQuaternion(q2).premultiply(blended);
      upper.quaternion.copy(upper.parent.getWorldQuaternion(q).invert().multiply(q2));
      upper.updateWorldMatrix(false, true);

      if (forearm && forearm.parent) {
        const bendQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.45 + eatWeight * 0.75);
        forearm.quaternion.multiply(bendQ);
        forearm.updateWorldMatrix(false, true);
      }
    }

    const g = held.current;
    if (g?.parent) {
      model.scene.updateWorldMatrix(true, false);
      const handPos = hand.getWorldPosition(a);
      g.parent.updateWorldMatrix(true, false);
      g.position.copy(g.parent.worldToLocal(handPos));
      if (mode === "drink" && sipWeight > 0.2) {
        const upright = g.parent.getWorldQuaternion(q2).invert();
        g.quaternion.copy(upright).slerp(hand.getWorldQuaternion(q), sipWeight * 0.35);
      } else {
        g.quaternion.copy(g.parent.getWorldQuaternion(q).invert());
      }
    }
  });
}

/** Points `bone` so the line from it to `child` runs along `dir` (world space), blended by `w`. */
function aimBone(bone: THREE.Object3D, child: THREE.Object3D, dir: THREE.Vector3, w: number, t: { a: THREE.Vector3; b: THREE.Vector3; q: THREE.Quaternion; q2: THREE.Quaternion; id: THREE.Quaternion }) {
  if (!bone.parent) return;
  const from = child.getWorldPosition(t.b).sub(bone.getWorldPosition(t.a)).normalize();
  // The turn from where the bone points now to `dir`, eased in by the pose's weight.
  t.id.setFromUnitVectors(from, dir);
  t.q.identity().slerp(t.id, w);
  bone.getWorldQuaternion(t.q2).premultiply(t.q);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(t.q).invert().multiply(t.q2));
  bone.updateWorldMatrix(false, true);
}

/** Lays a BodyPose over the playing clip. Works on both skeletons (Rocketbox and custom avatars). */
function useBodyPose(model: { scene: THREE.Object3D }, pose: BodyPose | undefined) {
  const bones = useMemo(() => {
    const named = (...names: string[]) => names.map((n) => model.scene.getObjectByName(n)).find(Boolean);
    const side = (s: "L" | "R", full: "Left" | "Right") => ({
      upper: named(`Bip01_${s}_UpperArm`, `${full}Arm`),
      fore: named(`Bip01_${s}_Forearm`, `${full}ForeArm`),
      hand: named(`Bip01_${s}_Hand`, `${full}Hand`),
    });
    return { L: side("L", "Left"), R: side("R", "Right"), pelvis: named("Bip01_Pelvis", "Hips"), neck: named("Bip01_Neck", "Neck") };
  }, [model]);
  const t = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), id: new THREE.Quaternion(), up: new THREE.Vector3(), right: new THREE.Vector3(), fwd: new THREE.Vector3(), d: new THREE.Vector3() }), []);
  const weight = useRef(0);
  const last = useRef<BodyPose | undefined>(undefined);

  useFrame(({ clock }, dt) => {
    if (pose) last.current = pose;
    weight.current = THREE.MathUtils.damp(weight.current, pose ? 1 : 0, 6, dt);
    const p = last.current;
    const { L, R, pelvis, neck } = bones;
    if (!p || weight.current < 0.01 || !L.upper || !R.upper || !L.fore || !R.fore || !L.hand || !R.hand || !pelvis || !neck) return;
    model.scene.updateWorldMatrix(true, true);
    // The body's own frame, from the skeleton: up the spine, across the shoulders, and the way it faces.
    const up = neck.getWorldPosition(t.up).sub(pelvis.getWorldPosition(t.a)).normalize();
    const right = R.upper.getWorldPosition(t.right).sub(L.upper.getWorldPosition(t.a)).normalize();
    const fwd = t.fwd.crossVectors(up, right).normalize();
    const time = clock.getElapsedTime();
    const w = weight.current;
    const dir = (u: number, f: number, r: number) => t.d.set(0, 0, 0).addScaledVector(up, u).addScaledVector(fwd, f).addScaledVector(right, r).normalize();

    for (const [arm, k] of [[R, 1], [L, -1]] as const) {
      // k: +1 right arm, -1 left arm (mirrors the sideways parts)
      let upper: THREE.Vector3, fore: THREE.Vector3;
      if (p === "armsCrossed") {
        upper = dir(-0.75, 0.55, k * 0.15).clone();
        fore = dir(0.3, 0.35, -k * 0.9).clone();
      } else if (p === "armsUp") {
        const shake = Math.sin(time * 9 + k) * 0.08;
        upper = dir(0.92, 0.15, k * (0.35 + shake)).clone();
        fore = upper.clone();
      } else if (p === "swim") {
        // Freestyle: each arm windmills over the head and pulls through the water, half a stroke apart.
        const a = time * 4.4 + (k === 1 ? 0 : Math.PI);
        upper = dir(Math.cos(a), Math.sin(a) * 0.9, k * 0.25).clone();
        fore = upper.clone();
      } else if (p === "balance") {
        const sway = Math.sin(time * 2.2) * 0.15;
        upper = dir(0.05 + k * sway, 0.15, k * 0.95).clone();
        fore = dir(0.2 + k * sway, 0.25, k * 0.9).clone();
      } else if (p === "grip") {
        upper = dir(-0.7, 0.35, k * 0.55).clone();
        fore = dir(-0.85, 0.3, k * 0.35).clone();
      } else if (p === "mic") {
        if (k === 1) {
          // Right hand holds the mic at the mouth; the left arm gestures to the crowd.
          upper = dir(-0.6, 0.5, 0.25).clone();
          fore = dir(0.85, 0.3, -0.35).clone();
        } else {
          const g = Math.sin(time * 2.6);
          upper = dir(-0.2 + g * 0.35, 0.55, -0.7).clone();
          fore = dir(0.1 + g * 0.4, 0.7, -0.4).clone();
        }
      } else if (p === "throw") {
        if (k === 1) {
          // The bowling swing: back, then through and up as the ball goes.
          const a = Math.min(1, ((time * 1.25) % 1.6)) * 2.6 - 1.3;
          upper = dir(-Math.cos(a), Math.sin(a), 0.1).clone();
          fore = upper.clone();
        } else {
          upper = dir(-0.1, 0.2, -0.95).clone();
          fore = upper.clone();
        }
      } else {
        // tuck: hugging the knees
        upper = dir(-0.35, 0.9, k * 0.2).clone();
        fore = dir(-0.75, 0.2, -k * 0.6).clone();
      }
      aimBone(arm.upper!, arm.fore!, upper, w, t);
      aimBone(arm.fore!, arm.hand!, fore, w, t);
    }
  });
}

function RosterAvatar({
  look,
  animation,
  placement,
  accessories,
  holding,
  carryMode,
  raiseHand = false,
  pose,
}: {
  look: AvatarLookProps;
  animation: AvatarAnimation;
  placement: Placement;
  accessories?: Accessory[];
  holding?: React.ReactNode;
  carryMode?: CarryMode;
  raiseHand?: boolean;
  pose?: BodyPose;
}) {
  const gltf = useGLTF(rosterModel(presetFor(look)));
  // The chosen outfit: this face on another roster citizen's clothes.
  const wearId = look.wear && look.wear !== presetFor(look) && isOutfit(look.wear, look.gender) ? look.wear : null;
  const wearGltf = useGLTF(rosterModel(wearId ?? presetFor(look)));
  const source = useMemo(() => (wearId ? composeOutfit(gltf.scene, wearGltf.scene) : gltf.scene), [wearId, gltf.scene, wearGltf.scene]);
  const model = usePreparedModel(source, true);
  useAccessories(model, accessories);
  const clips = useRosterClips(look.gender);
  const root = useRef<THREE.Group>(null);
  const { actions } = useAnimations(clips, root);
  usePlay(actions, animation);
  useRunArms(model, animation === "run");
  const held = useRef<THREE.Group>(null);
  const effectiveMode: CarryMode | false = carryMode ?? (raiseHand ? "raise" : !!holding ? "hold" : false);
  // The pose first, so anything held follows the posed hand.
  useBodyPose(model, pose);
  useCarry(model, effectiveMode, held);

  const bodyType = look.bodyType ?? defaultBodyType(look.gender);
  useEffect(() => {
    if (model.frame) applyBodyShape(model.meshes, model.frame, look.gender, bodyType);
  }, [model, look.gender, bodyType]);

  return (
    <>
      <Framed model={model} gender={look.gender} placement={placement}>
        <group ref={root}>
          <primitive object={model.scene} />
        </group>
      </Framed>
      {holding && <group ref={held}>{holding}</group>}
    </>
  );
}

function CustomAvatar({
  look,
  url,
  animation,
  placement,
  accessories,
  holding,
  carryMode,
  raiseHand = false,
  pose,
}: {
  look: AvatarLookProps;
  url: string;
  animation: AvatarAnimation;
  placement: Placement;
  accessories?: Accessory[];
  holding?: React.ReactNode;
  carryMode?: CarryMode;
  raiseHand?: boolean;
  pose?: BodyPose;
}) {
  const gltf = useGLTF(url);
  const model = usePreparedModel(gltf.scene, false);
  useAccessories(model, accessories);

  // Invisible Rocketbox skeleton that plays the clip we copy from.
  const sourceGltf = useGLTF(rosterModel(presetFor({ gender: look.gender })));
  const source = useMemo(() => cloneSkinned(sourceGltf.scene), [sourceGltf.scene]);
  const retargeter = useMemo(() => createRetargeter(source, model.scene), [source, model.scene]);
  const sourceRef = useRef<THREE.Object3D>(source);
  useEffect(() => {
    sourceRef.current = source;
  }, [source]);
  const clips = useRosterClips(look.gender);
  const { actions } = useAnimations(clips, sourceRef);
  usePlay(actions, animation);

  const held = useRef<THREE.Group>(null);
  const effectiveMode: CarryMode | false = carryMode ?? (raiseHand ? "raise" : !!holding ? "hold" : false);
  useCarry(model, effectiveMode, held);

  // Registered after useAnimations, so it runs once the source has been posed for this frame.
  useFrame(() => retargeter?.update());
  useRunArms(model, animation === "run");
  useBodyPose(model, pose);

  return (
    <>
      <Framed model={model} gender={look.gender} placement={placement}>
        <primitive object={model.scene} />
      </Framed>
      {holding && <group ref={held}>{holding}</group>}
    </>
  );
}

interface CitizenAvatarProps {
  look?: AvatarLookProps;
  /** Accessories worn (or being tried on). */
  accessories?: Accessory[];
  animation?: AvatarAnimation;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Carried in the right hand, upright, with its origin at the grip. */
  holding?: React.ReactNode;
  /** Hold it up high, as bottle-service hosts do. */
  raiseHand?: boolean;
  /** Active arm gesture mode for drinking, dining, or holding props */
  carryMode?: CarryMode;
  /** Arm pose for rides and water (laid over the clip). */
  pose?: BodyPose;
}

export function CitizenAvatar({
  look = DEFAULT_LOOK,
  animation = "idle",
  position,
  rotation,
  accessories,
  holding,
  raiseHand,
  carryMode,
  pose,
}: CitizenAvatarProps) {
  const customUrl = useAvatarUrl(look.custom?.url);
  const placement = { position, rotation };
  // Keyed by model: the animation mixer binds to one skeleton, so a new model needs a fresh mixer.
  const roster = (
    <RosterAvatar
      key={`${presetFor(look)}:${look.wear ?? ""}`}
      look={look}
      animation={animation}
      placement={placement}
      accessories={accessories}
      holding={holding}
      raiseHand={raiseHand}
      carryMode={carryMode}
      pose={pose}
    />
  );
  if (!look.custom || !customUrl) return roster;
  return (
    <Suspense fallback={roster}>
      <CustomAvatar
        key={customUrl}
        look={look}
        url={customUrl}
        animation={animation}
        placement={placement}
        accessories={accessories}
        holding={holding}
        raiseHand={raiseHand}
        carryMode={carryMode}
        pose={pose}
      />
    </Suspense>
  );
}
