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
import { WIGS_CATALOG, isOutfit, outfitById, presetFor, rosterAnimations, rosterModel, type AvatarLookProps, type Gender } from "./roster";
import { composeOutfit } from "./outfit";
import { createRetargeter } from "./retarget";
import { useAvatarUrl } from "./customAvatarStore";
import { attachAccessories, attachLookExtras, buildAccessoryRig } from "./accessories";
import { MoneySpray3D } from "./MoneySpray3D";
import type { Accessory } from "@/lib/city/types";

export type { AvatarLookProps } from "./roster";
/**
 * "sleep" and "swim" have no clips of their own: sleep is the idle clip slowed to a sleeper's breathing,
 * swim is the walk clip sped up for the leg kick (the scene lays the body down; BodyPose moves the arms).
 * Also includes interactive party & combat animations: "rock_female", "rock_male", "slap", "fight", "knocked", "box", "spray_money".
 */
export type AvatarAnimation =
  | "idle"
  | "sit"
  | "wave"
  | "clap"
  | "walk"
  | "angry_walk"
  | "dance"
  | "talk"
  | "sleep"
  | "swim"
  | "skate"
  | "run"
  | "rock_female"
  | "rock_male"
  | "slap"
  | "fight"
  | "knocked"
  | "box"
  | "spray_money";
// skate: the walk clip slowed right down, for long gliding strides; run: its own clip, built from the walk
// (see makeRunClip), played at a runner's cadence.
const CLIP_FOR: Partial<Record<AvatarAnimation, AvatarAnimation>> = {
  sleep: "idle",
  swim: "walk",
  skate: "walk",
  angry_walk: "walk",
  rock_female: "dance",
  rock_male: "dance",
  slap: "wave",
  fight: "dance",
  knocked: "idle",
  box: "dance",
  spray_money: "dance",
};
const SPEED_FOR: Partial<Record<AvatarAnimation, number>> = {
  sleep: 0.3,
  swim: 1.5,
  skate: 0.55,
  run: 1.85,
  angry_walk: 1.35,
  rock_female: 0.85,
  rock_male: 0.85,
  slap: 2.2,
  fight: 1.9,
  knocked: 0.25,
  box: 1.8,
  spray_money: 1.3,
};

/**
 * Arm poses laid over whatever clip is playing, for rides and water: arms crossed on the chest (slides),
 * both arms up (screaming down a drop), freestyle strokes (swimming), arms out for balance (surfing),
 * gripping the handles (rafts and rings), hugging the knees (cannonball), a mic to the mouth (karaoke)
 * and the bowling swing.
 */
export type BodyPose = "armsCrossed" | "armsUp" | "swim" | "balance" | "grip" | "tuck" | "mic" | "throw";

export const DEFAULT_LOOK: AvatarLookProps = { gender: "woman", bodyType: "Hourglass" };

const HEIGHT: Record<Gender, number> = { woman: 1.68, man: 1.8 };
const CLIPS: ("idle" | "sit" | "wave" | "clap" | "walk" | "dance" | "talk")[] = ["idle", "sit", "wave", "clap", "walk", "dance", "talk"];

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

/** Keeps the worn accessories, wigs, nails, shoes, and pregnancy bump attached to the model's skeleton. */
function useAccessories(model: { rig: ReturnType<typeof buildAccessoryRig>; meshes?: THREE.Mesh[] }, accessories: Accessory[] | undefined, look: AvatarLookProps) {
  const key = (accessories ?? []).slice().sort().join(",");
  useEffect(() => {
    if (!key) return;
    return attachAccessories(model.rig, key.split(",") as Accessory[]);
  }, [model, key]);

  const extrasKey = `${look.wear ?? ""}|${look.wigId ?? ""}|${look.shoeId ?? ""}|${look.nailId ?? ""}|${look.nailColor ?? ""}|${look.primaryColor ?? ""}|${look.outfitColor ?? ""}|${look.secondaryColor ?? ""}|${look.pregnantWeeks ?? 0}|${look.gloves ?? ""}`;
  useEffect(() => {
    return attachLookExtras(model.rig, look, model.meshes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, extrasKey]);
}

/** Tints clothing materials in real time (#20, #28) with exact vibrant hue while keeping hands, face, and skin untouched. */
function useClothingTint(model: { scene: THREE.Object3D; meshes: THREE.Mesh[] }, look: AvatarLookProps) {
  const outfit = outfitById(look.wear);
  const tintHex = look.primaryColor ?? look.outfitColor ?? outfit?.defaultPrimaryColor;

  useEffect(() => {
    if (!tintHex) return;
    const targetColor = new THREE.Color(tintHex);

    for (const m of model.meshes) {
      if (m.userData.borrowedFace) continue;
      const skinned = m as THREE.SkinnedMesh;

      // Ensure geometry has isolation attribute (aIsExempt = 1.0 for hands, shoes, and legs; 0.0 for outfit)
      const count = m.geometry.attributes.position ? m.geometry.attributes.position.count : 0;
      if (count > 0) {
        const isExemptArray = new Float32Array(count);
        if (
          skinned.isSkinnedMesh &&
          skinned.skeleton &&
          skinned.geometry.attributes.skinIndex &&
          skinned.geometry.attributes.skinWeight
        ) {
          const skinIndex = skinned.geometry.attributes.skinIndex;
          const skinWeight = skinned.geometry.attributes.skinWeight;
          const isFloorRobe =
            look.wear === "Male_Adult_21" ||
            look.wear === "Male_Adult_19" ||
            outfit?.baseModel === "Male_Adult_21" ||
            outfit?.baseModel === "Male_Adult_19";

          const exemptBoneMask = skinned.skeleton.bones.map((b) => {
            const n = (b?.name || "").toLowerCase();
            const isHand = n.includes("hand") || n.includes("finger");
            const isShoe = n.includes("foot") || n.includes("toe");
            const isLeg = !isFloorRobe && (n.includes("calf") || n.includes("leg"));
            return isHand || isShoe || isLeg;
          });

          for (let i = 0; i < count; i++) {
            let ew = 0;
            for (let c = 0; c < 4; c++) {
              const boneIdx = skinIndex.getComponent(i, c);
              const w = skinWeight.getComponent(i, c);
              if (exemptBoneMask[boneIdx]) {
                ew += w;
              }
            }
            isExemptArray[i] = ew > 0.05 ? 1.0 : 0.0;
          }
        }
        m.geometry.setAttribute("aIsExempt", new THREE.BufferAttribute(isExemptArray, 1));
      }

      const list = Array.isArray(m.material) ? m.material : [m.material];
      for (const raw of list) {
        const mat = raw as THREE.MeshStandardMaterial;
        if (!mat) continue;
        const name = (mat.name || "").toLowerCase();
        // Skip head, skin, eyes, eyelashes, and hair materials
        if (
          name.includes("head") ||
          name.includes("opacity") ||
          name.includes("skin") ||
          name.includes("eye") ||
          name.includes("hair")
        ) {
          continue;
        }

        // If material already has our exact clothing shader, update uniform in real-time
        if (mat.userData?.clothingColor) {
          mat.userData.clothingColor.value.copy(targetColor);
          continue;
        }

        const cloned = mat.clone();
        cloned.userData.clothingColor = { value: targetColor.clone() };
        cloned.customProgramCacheKey = () => "clothing_exact_tint_v3";

        cloned.onBeforeCompile = (shader) => {
          shader.uniforms.uClothingColor = cloned.userData.clothingColor;
          shader.vertexShader = `
            attribute float aIsExempt;
            varying float vIsExempt;
            ${shader.vertexShader}
          `.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
             vIsExempt = aIsExempt;`
          );
          shader.fragmentShader = `
            uniform vec3 uClothingColor;
            varying float vIsExempt;
            ${shader.fragmentShader}
          `.replace(
            "#include <map_fragment>",
            `#ifdef USE_MAP
              vec4 sampledDiffuseColor = texture2D( map, vMapUv );
              if (vIsExempt > 0.5) {
                // Shoes, legs, feet, hands, and skin remain completely untouched
                diffuseColor = sampledDiffuseColor;
              } else {
                // Exact clothing color with fabric fold & seam luminance
                float lum = dot(sampledDiffuseColor.rgb, vec3(0.299, 0.587, 0.114));
                float foldShade = clamp(lum * 1.25 + 0.18, 0.48, 1.28);
                diffuseColor = vec4(uClothingColor * foldShade, sampledDiffuseColor.a);
              }
            #else
              diffuseColor = vec4(uClothingColor, 1.0);
            #endif`
          );
        };

        if (Array.isArray(m.material)) {
          const idx = m.material.indexOf(raw);
          if (idx >= 0) m.material[idx] = cloned;
        } else {
          m.material = cloned;
        }
      }
    }

    // Also tint pregnancy bump to perfectly match clothing in real time
    model.scene.traverse((child) => {
      if (child.name === "pregnancy_bump" && child instanceof THREE.Mesh) {
        const bMat = child.material as THREE.MeshStandardMaterial;
        if (bMat && bMat.color) {
          bMat.color.copy(targetColor);
          bMat.needsUpdate = true;
        }
      }
    });
  }, [model, tintHex]);
}

/**
 * Procedural bone modulation for interactive party & combat animations:
 * - "rock_female": bends spine forward ~38° and oscillates pelvis/hips rhythmically (#1)
 * - "rock_male": slight groove lean-back with hands near waist (#1)
 * - "slap": cross-body right-hand slap swing (#2)
 * - "fight" / "box": rapid alternating left/right jab & hook punches (#2, #3, #4)
 * - "spray_money": left hand holds cash stack while right arm flicks bills upward (#14)
 */
/** Points `bone` so the line from it to `child` runs along `dir` (world space), blended by `w`. */
function aimBone(
  bone: THREE.Object3D,
  child: THREE.Object3D,
  dir: THREE.Vector3,
  w: number,
  t: { a: THREE.Vector3; b: THREE.Vector3; q: THREE.Quaternion; q2: THREE.Quaternion; id: THREE.Quaternion }
) {
  if (!bone.parent) return;
  const from = child.getWorldPosition(t.b).sub(bone.getWorldPosition(t.a)).normalize();
  t.id.setFromUnitVectors(from, dir);
  t.q.identity().slerp(t.id, w);
  bone.getWorldQuaternion(t.q2).premultiply(t.q);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(t.q).invert().multiply(t.q2));
  bone.updateWorldMatrix(false, true);
}

function useSpecialAnimationPose(model: { scene: THREE.Object3D }, animation: AvatarAnimation) {
  const bones = useMemo(() => {
    const named = (...names: string[]) => names.map((n) => model.scene.getObjectByName(n)).find(Boolean);
    return {
      pelvis: named("Bip01_Pelvis", "Hips"),
      spine: named("Bip01_Spine", "Spine"),
      spine1: named("Bip01_Spine1", "Spine1", "Spine2"),
      neck: named("Bip01_Neck", "Neck"),
      rUpper: named("Bip01_R_UpperArm", "RightArm"),
      rFore: named("Bip01_R_Forearm", "RightForeArm"),
      rHand: named("Bip01_R_Hand", "RightHand"),
      lUpper: named("Bip01_L_UpperArm", "LeftArm"),
      lFore: named("Bip01_L_Forearm", "LeftForeArm"),
      lHand: named("Bip01_L_Hand", "LeftHand"),
    };
  }, [model]);

  const tVec = useMemo(
    () => ({
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      up: new THREE.Vector3(),
      right: new THREE.Vector3(),
      fwd: new THREE.Vector3(),
      d: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      q2: new THREE.Quaternion(),
      id: new THREE.Quaternion(),
    }),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const { pelvis, spine, spine1, neck, rUpper, rFore, rHand, lUpper, lFore, lHand } = bones;
    if (animation === "rock_female") {
      // Bend torso forward at 45° angle to the ground, with backside moving slowly on partner's waistline
      // 45 degrees = ~0.785 rad forward spine bend (0.48 + 0.31 = 0.79 rad ~ 45.3°)
      if (spine) spine.rotation.z += 0.48;
      if (spine1) spine1.rotation.z += 0.31;
      // Head holds up playfully, looking back over shoulder towards partner
      if (neck) {
        neck.rotation.z -= 0.38;
        neck.rotation.y += Math.sin(t * 2.8) * 0.14;
      }
      // Hands rest on thighs/hips for balance in the arched 45° posture
      if (rUpper && lUpper && rFore && lFore) {
        rUpper.rotation.z += 0.36;
        rUpper.rotation.y += 0.16;
        lUpper.rotation.z += 0.36;
        lUpper.rotation.y -= 0.16;
        rFore.rotation.z += 0.42;
        lFore.rotation.z += 0.42;
      }
      // Slow sensual Afrobeats whining motion against partner's waistline
      const slowWine = t * 2.8;
      const wineCycleX = Math.sin(slowWine);
      const wineCycleZ = Math.cos(slowWine);
      if (pelvis) {
        pelvis.rotation.x += wineCycleX * 0.28; // rolling side-to-side wine
        pelvis.rotation.y += wineCycleZ * 0.22; // circular hip gyration
        pelvis.rotation.z += 0.06 + wineCycleZ * 0.12; // deep arch & pelvic pulse
        // Physical displacement moving backside directly on the waistline slowly:
        pelvis.position.x += wineCycleX * 0.035;
        pelvis.position.z += wineCycleZ * 0.045; // rhythmic back-and-forth contact on waistline
        pelvis.position.y += Math.abs(wineCycleX) * 0.015;
      }
    } else if (animation === "rock_male") {
      // Partner standing behind: hands framing waistline, swaying slowly with the wine
      const partnerWine = t * 2.8;
      if (spine) spine.rotation.z += 0.08;
      if (pelvis) {
        pelvis.rotation.x += Math.sin(partnerWine) * 0.18;
        pelvis.rotation.y += Math.cos(partnerWine) * 0.15;
        pelvis.position.z += Math.cos(partnerWine) * 0.025;
      }
      // Hands held forward at waistline height framing the dancer's hips
      if (rUpper && lUpper && rFore && lFore) {
        rUpper.rotation.z -= 0.22;
        rUpper.rotation.x += 0.42;
        lUpper.rotation.z -= 0.22;
        lUpper.rotation.x -= 0.42;
        rFore.rotation.z += 0.55;
        lFore.rotation.z += 0.55;
      }
    } else if (animation === "angry_walk") {
      // Aggressive determined stomp: torso tilted forward, arms clenched with heavy swinging cadence
      if (spine) spine.rotation.x += 0.22;
      if (spine1) spine1.rotation.x += 0.12;
      if (neck) neck.rotation.x -= 0.18; // intense forward head glare
      const stomp = Math.sin(t * 10);
      if (rUpper && lUpper && rFore && lFore) {
        rUpper.rotation.x += stomp * 0.45;
        lUpper.rotation.x -= stomp * 0.45;
        rFore.rotation.z += 0.55; // clenched fists
        lFore.rotation.z += 0.55;
      }
    } else if (animation === "slap") {
      const swing = Math.sin(t * 16);
      if (rUpper) rUpper.rotation.y += swing * 0.95;
      if (rFore) rFore.rotation.z += 0.45;
    } else if (animation === "fight" || animation === "box") {
      // Authentic Boxing Stance: High Chin Guard with snapping forward Jabs & Crosses
      // Fists and arms point FORWARD at the opponent, never backwards!
      if (pelvis && (neck ?? spine1 ?? spine) && rUpper && rFore && rHand && lUpper && lFore && lHand) {
        model.scene.updateWorldMatrix(true, true);
        const top = neck ?? spine1 ?? spine!;
        const up = top.getWorldPosition(tVec.up).sub(pelvis.getWorldPosition(tVec.a)).normalize();
        const right = rUpper.getWorldPosition(tVec.right).sub(lUpper.getWorldPosition(tVec.a)).normalize();
        const fwd = tVec.fwd.crossVectors(up, right).normalize();
        const dir = (u: number, f: number, r: number) =>
          tVec.d.set(0, 0, 0).addScaledVector(up, u).addScaledVector(fwd, f).addScaledVector(right, r).normalize();

        const jabCycle = Math.sin(t * 12);
        const isRightPunching = jabCycle > 0;
        const punchExt = Math.abs(jabCycle);

        // Left Arm: Snapping Lead Jab vs High Chin Guard
        let leftUpperDir: THREE.Vector3;
        let leftForeDir: THREE.Vector3;
        if (!isRightPunching) {
          // Left Jab driving straight forward towards opponent
          leftUpperDir = dir(0.04, 0.78 + punchExt * 0.22, -0.12).clone();
          leftForeDir = dir(0.06, 0.96 + punchExt * 0.04, -0.04).clone();
        } else {
          // Left High Guard protecting chin & cheekbone
          leftUpperDir = dir(-0.38, 0.52, -0.2).clone();
          leftForeDir = dir(0.85, 0.42, 0.16).clone();
        }
        aimBone(lUpper, lFore, leftUpperDir, 1, tVec);
        aimBone(lFore, lHand, leftForeDir, 1, tVec);

        // Right Arm: Power Cross vs High Chin Guard
        let rightUpperDir: THREE.Vector3;
        let rightForeDir: THREE.Vector3;
        if (isRightPunching) {
          // Right Cross driving forward with power
          rightUpperDir = dir(0.04, 0.78 + punchExt * 0.22, 0.12).clone();
          rightForeDir = dir(0.06, 0.96 + punchExt * 0.04, 0.04).clone();
        } else {
          // Right High Guard tucked tight to chin
          rightUpperDir = dir(-0.38, 0.52, 0.2).clone();
          rightForeDir = dir(0.85, 0.42, -0.16).clone();
        }
        aimBone(rUpper, rFore, rightUpperDir, 1, tVec);
        aimBone(rFore, rHand, rightForeDir, 1, tVec);

        // Torso rotates rhythmically with the punches
        if (spine) spine.rotation.y = Math.sin(t * 12) * 0.2;
        if (spine1) spine1.rotation.x = 0.08;
      }
    } else if (animation === "spray_money") {
      const flick = Math.abs(Math.sin(t * 9));
      if (lUpper) lUpper.rotation.z += 0.5;
      if (rUpper) rUpper.rotation.z += 0.7 + flick * 0.65;
      if (rFore) rFore.rotation.x += Math.sin(t * 18) * 0.45;
    }
  });
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

function useAvatarHairAndShoeReplacement(
  model: ReturnType<typeof usePreparedModel>,
  look: AvatarLookProps,
  accessories?: Accessory[]
) {
  const wearOutfit = outfitById(look.wear);
  const rawWig = look.wigId ?? wearOutfit?.defaultWigId;

  // Headwear that physically encases the skull: caps, geles, turbans, kofias, okukus, agals
  const isEnclosingHeadwear = Boolean(
    (rawWig &&
      rawWig !== "none" &&
      (rawWig.includes("cap") ||
        rawWig.includes("gele") ||
        rawWig.includes("okuku") ||
        rawWig.includes("turban") ||
        rawWig.includes("kofia") ||
        rawWig.includes("hat") ||
        rawWig === "fila_cap" ||
        rawWig === "igbo_red_cap" ||
        rawWig === "emirati_ghutra_agal" ||
        rawWig === "tanyi_crown")) ||
      accessories?.includes("cap")
  );

  const wigDef = rawWig && rawWig !== "none" ? WIGS_CATALOG.find((w) => w.id === rawWig) : undefined;
  const hairColorHex = wigDef?.color;

  useEffect(() => {
    // Traverse the full scene so borrowed face/hair meshes from composeOutfit are also targeted
    model.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const list = Array.isArray(m.material) ? m.material : [m.material];
      let hasHairMat = false;
      let hasHeadOrBodyMat = false;

      for (const mat of list) {
        if (!mat) continue;
        const matName = (mat.name || "").toLowerCase();
        const isHeadOrBody =
          matName.includes("head") ||
          matName.includes("body") ||
          matName.includes("face") ||
          matName.includes("skin");

        if (isHeadOrBody) {
          hasHeadOrBodyMat = true;
        } else if (matName.includes("opacity") || matName.includes("hair")) {
          hasHairMat = true;
          // Hide or restore hair cards cleanly — only skull-enclosing headwear hides them!
          mat.opacity = isEnclosingHeadwear ? 0 : 1;
          mat.transparent = true;
          mat.depthWrite = !isEnclosingHeadwear;
          mat.visible = !isEnclosingHeadwear;

          const stdMat = mat as THREE.MeshStandardMaterial;
          if (stdMat.color) {
            if (stdMat.userData.origHairHex === undefined) {
              stdMat.userData.origHairHex = stdMat.color.getHex();
            }
            if (!isEnclosingHeadwear && hairColorHex) {
              stdMat.color.set(hairColorHex);
            } else if (stdMat.userData.origHairHex !== undefined) {
              stdMat.color.setHex(stdMat.userData.origHairHex);
            }
          }
          mat.needsUpdate = true;
        }
      }

      const meshName = (m.name || "").toLowerCase();
      const isHairMesh =
        hasHairMat ||
        (!hasHeadOrBodyMat && (meshName.includes("hair") || (meshName.includes("opacity") && !meshName.includes("hipoly"))));

      // If the mesh is purely dedicated to hair cards and has no head or body primitives
      if (isHairMesh && !hasHeadOrBodyMat) {
        m.visible = !isEnclosingHeadwear;
      } else if (hasHeadOrBodyMat) {
        // Face and body MUST ALWAYS remain visible! Never hide the face when wearing caps or wigs!
        m.visible = true;
      }
    });
  }, [model, isEnclosingHeadwear, hairColorHex]);
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
  useAccessories(model, accessories, look);
  useClothingTint(model, look);
  useAvatarHairAndShoeReplacement(model, look, accessories);
  const clips = useRosterClips(look.gender);
  const root = useRef<THREE.Group>(null);
  const { actions } = useAnimations(clips, root);
  usePlay(actions, animation);
  useRunArms(model, animation === "run");
  useSpecialAnimationPose(model, animation);
  const held = useRef<THREE.Group>(null);
  const effectiveMode: CarryMode | false = carryMode ?? (raiseHand ? "raise" : !!holding ? "hold" : false);
  // The pose first, so anything held follows the posed hand.
  useBodyPose(model, pose);
  useCarry(model, effectiveMode, held);

  const bodyType = look.bodyType ?? defaultBodyType(look.gender);
  useEffect(() => {
    if (model.frame) {
      applyBodyShape(model.meshes, model.frame, look.gender, bodyType);
    }
  }, [model, look.gender, bodyType]);

  return (
    <>
      <Framed model={model} gender={look.gender} placement={placement}>
        <group ref={root}>
          <primitive object={model.scene} />
        </group>
        {animation === "spray_money" && <MoneySpray3D active />}
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
  useAccessories(model, accessories, look);
  useClothingTint(model, look);
  useAvatarHairAndShoeReplacement(model, look, accessories);

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
        <MoneySpray3D active={animation === "spray_money"} />
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
