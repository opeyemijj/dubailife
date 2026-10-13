// Body-type sculpting for the rigged citizen models.
// Each vertex is pushed in the model's bind (rest) pose according to the bones it is skinned to,
// so the new shape follows every animation for free.

import * as THREE from "three";

export const BODY_TYPES = {
  woman: ["Hourglass", "Curvy", "Athletic", "Slim"],
  man: ["Muscular", "Athletic", "Big", "Slim"],
} as const;

export function defaultBodyType(gender: "woman" | "man") {
  return gender === "man" ? "Muscular" : "Hourglass";
}

/**
 * How one body region changes. Scales are multipliers (1 = unchanged) applied around the bone's axis.
 * r: overall thickness · sx: width · sz: depth · front/back: extra depth on the front or back half
 * (bust, chest, glutes) · spread: shift away from the body's centre line, as a fraction of height.
 */
interface Region { r?: number; sx?: number; sz?: number; front?: number; back?: number; spread?: number }
type Shape = Partial<Record<RegionName, Region>>;
type RegionName = "Hips" | "Abdomen" | "Torso" | "Neck" | "Shoulder" | "UpperArm" | "LowerArm" | "Hand" | "UpperLeg" | "LowerLeg";

// Tuned for realistic proportions: changes stay within what real bodies do.
const SHAPES: Record<string, Shape> = {
  // Women
  Hourglass: {
    Torso: { front: 1.3, sx: 1.03 },
    Abdomen: { sx: 0.85, sz: 0.925 },
    Hips: { sx: 1.3, sz: 1.05, back: 1.3 },
    UpperLeg: { r: 1.15, back: 1.125, spread: 0.011 },
    LowerLeg: { r: 1.04, spread: 0.003 },
    UpperArm: { r: 0.97 },
    LowerArm: { r: 0.96 },
  },
  Curvy: {
    Torso: { front: 1.35, sx: 1.06 },
    Abdomen: { sx: 0.95, sz: 1.0 },
    Hips: { sx: 1.375, sz: 1.075, back: 1.375 },
    UpperLeg: { r: 1.21, back: 1.15, spread: 0.014 },
    LowerLeg: { r: 1.075, spread: 0.004 },
    UpperArm: { r: 1.05 },
  },
  Athletic: {
    Torso: { sx: 1.04, front: 1.06 },
    Shoulder: { r: 1.06 },
    Abdomen: { sx: 0.94 },
    Hips: { sx: 1.06, back: 1.09 },
    UpperLeg: { r: 1.07, back: 1.04 },
    LowerLeg: { r: 1.05 },
    UpperArm: { r: 1.07 },
    LowerArm: { r: 1.03 },
  },
  Slim: {
    Torso: { sx: 0.965, sz: 0.975 },
    Abdomen: { sx: 0.94, sz: 0.95 },
    Hips: { sx: 0.985 },
    UpperLeg: { r: 0.95 },
    LowerLeg: { r: 0.96 },
    UpperArm: { r: 0.94 },
    LowerArm: { r: 0.95 },
  },
  // Men
  Muscular: {
    Torso: { sx: 1.3, sz: 1.15, front: 1.2 },
    Shoulder: { r: 1.45, spread: 0.02 },
    UpperArm: { r: 1.5, spread: 0.026 },
    LowerArm: { r: 1.3, spread: 0.026 },
    Hand: { r: 1.05, spread: 0.026 },
    Neck: { r: 1.3 },
    Abdomen: { sx: 0.98, sz: 0.96 },
    UpperLeg: { r: 1.22 },
    LowerLeg: { r: 1.18 },
  },
  "Athletic-man": {
    Torso: { sx: 1.075, sz: 1.03, front: 1.04 },
    Shoulder: { r: 1.1, spread: 0.005 },
    UpperArm: { r: 1.11, spread: 0.006 },
    LowerArm: { r: 1.06, spread: 0.006 },
    Hand: { spread: 0.006 },
    Neck: { r: 1.075 },
    Abdomen: { sx: 0.975 },
    UpperLeg: { r: 1.06 },
    LowerLeg: { r: 1.05 },
  },
  Big: {
    Torso: { sx: 1.11, sz: 1.11 },
    Abdomen: { sx: 1.16, sz: 1.2, front: 1.1 },
    Hips: { sx: 1.09, sz: 1.075 },
    Shoulder: { r: 1.1, spread: 0.007 },
    UpperArm: { r: 1.14, spread: 0.011 },
    LowerArm: { r: 1.09, spread: 0.011 },
    Hand: { spread: 0.011 },
    Neck: { r: 1.14 },
    UpperLeg: { r: 1.14, spread: 0.004 },
    LowerLeg: { r: 1.075 },
  },
  "Slim-man": {
    Torso: { sx: 0.96, sz: 0.97 },
    Abdomen: { sx: 0.95, sz: 0.95 },
    UpperArm: { r: 0.94 },
    LowerArm: { r: 0.95 },
    UpperLeg: { r: 0.95 },
    LowerLeg: { r: 0.96 },
    Neck: { r: 0.96 },
  },
};

function shapeFor(gender: "woman" | "man", bodyType: string): Shape {
  if (gender === "man" && (bodyType === "Athletic" || bodyType === "Slim")) return SHAPES[`${bodyType}-man`];
  return SHAPES[bodyType] ?? SHAPES[defaultBodyType(gender)];
}

/**
 * Maps a bone to a body region. Understands the rigs we use: Quaternius ("UpperArm.L"),
 * 3ds Max Biped from Rocketbox ("Bip01 L UpperArm") and Mixamo-style from Avaturn ("LeftArm").
 */
export function regionOf(boneName: string): RegionName | null {
  let n = boneName.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^(bip01|mixamorig)/, "");
  n = n.replace(/^(left|right)/, "").replace(/(left|right)$/, "");
  // Biped side letter ("lupperarm") and Quaternius suffix ("upperarml").
  const strip = (x: string) => x.replace(/^[lr](?=(clavicle|upperarm|forearm|hand|finger|thigh|calf|foot|toe))/, "").replace(/(?<=(shoulder|upperarm|lowerarm|upperleg|lowerleg|palm|middlehand|fingers|thumb1|thumb2|foot))[lr]$/, "");
  n = strip(n);
  if (n === "pelvis" || n === "hips") return "Hips";
  if (n === "abdomen" || n === "spine") return "Abdomen";
  if (n === "torso" || n === "spine1" || n === "spine2" || n === "spine3") return "Torso";
  if (n === "neck") return "Neck";
  if (n === "clavicle" || n === "shoulder") return "Shoulder";
  if (n === "upperarm" || n === "arm") return "UpperArm";
  if (n === "lowerarm" || n === "forearm") return "LowerArm";
  if (/^(hand|palm|middlehand|finger|fingers|thumb)/.test(n)) return "Hand";
  if (n === "upperleg" || n === "thigh" || n === "upleg") return "UpperLeg";
  if (n === "lowerleg" || n === "calf" || n === "leg") return "LowerLeg";
  return null;
}

interface BoneInfo { region: RegionName | null; pos: THREE.Vector3; axis: THREE.Vector3 }

/** The rig's rest-pose frame: body axes, height, and each bone's position and direction. */
export interface BodyFrame {
  up: THREE.Vector3;
  forward: THREE.Vector3;
  side: THREE.Vector3;
  centre: THREE.Vector3;
  height: number;
  bones: BoneInfo[];
}

export function buildBodyFrame(meshes: THREE.Mesh[]): BodyFrame | null {
  const skinned = meshes.filter((m) => (m as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh[];
  if (!skinned.length) return null;
  const skeleton = skinned[0].skeleton;
  const pos = skeleton.boneInverses.map((m) => new THREE.Vector3().setFromMatrixPosition(m.clone().invert()));
  const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^(bip01|mixamorig)/, "");
  const index = (...names: string[]) => skeleton.bones.findIndex((b) => names.includes(key(b.name)));
  const hips = index("hips", "pelvis");
  const head = index("head");
  if (hips < 0 || head < 0) return null;

  const up = pos[head].clone().sub(pos[hips]).normalize();

  // Forward: from the head bone towards the eyes, flattened against `up`.
  const eyes = skinned.find((m) => (m.material as THREE.Material).name === "Eyes");
  const forward = new THREE.Vector3(0, 0, 1);
  // Rigs without an "Eyes" material: forward is the direction the feet point (foot -> toe).
  const foot = index("lfoot", "leftfoot", "footl");
  const toe = index("ltoe0", "lefttoebase", "ltoe");
  if (!eyes && foot >= 0 && toe >= 0) forward.copy(pos[toe]).sub(pos[foot]);
  if (eyes) {
    const centroid = new THREE.Vector3();
    const p = eyes.geometry.attributes.position;
    const v = new THREE.Vector3();
    let n = 0;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(eyes.bindMatrix);
      if (v.clone().sub(pos[head]).dot(up) > 0) { centroid.add(v); n++; }
    }
    if (n) forward.copy(centroid.divideScalar(n).sub(pos[head]));
  }
  forward.addScaledVector(up, -forward.dot(up)).normalize();
  const side = new THREE.Vector3().crossVectors(up, forward).normalize();

  // Height along `up`, from all vertices.
  let lo = Infinity, hi = -Infinity;
  const v = new THREE.Vector3();
  for (const m of skinned) {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const h = v.fromBufferAttribute(p, i).applyMatrix4(m.bindMatrix).dot(up);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
  }
  const height = hi - lo;

  const bones: BoneInfo[] = skeleton.bones.map((b, i) => {
    const child = b.children.find((c) => (c as THREE.Bone).isBone);
    const ci = child ? skeleton.bones.indexOf(child as THREE.Bone) : -1;
    let axis = ci >= 0 ? pos[ci].clone().sub(pos[i]) : new THREE.Vector3();
    if (axis.length() < height * 0.01) {
      // Zero-length or leaf bone: borrow the parent's direction, or fall back to `up`.
      const pi = skeleton.bones.indexOf(b.parent as THREE.Bone);
      axis = pi >= 0 ? pos[i].clone().sub(pos[pi]) : up.clone();
      if (axis.length() < height * 0.01) axis = up.clone();
    }
    return { region: regionOf(b.name), pos: pos[i], axis: axis.normalize() };
  });

  return { up, forward, side, centre: pos[hips].clone(), height, bones };
}

/** Remembers each mesh's original vertices so shapes can be swapped without drift. */
export function prepareForShaping(meshes: THREE.Mesh[]) {
  for (const m of meshes) {
    if (!(m as THREE.SkinnedMesh).isSkinnedMesh) continue;
    m.geometry = m.geometry.clone();
    // Compressed models store positions/normals as quantised integers; reshaping needs plain floats.
    for (const name of ["position", "normal"]) {
      const attr = m.geometry.getAttribute(name);
      if (!attr || (attr.array instanceof Float32Array && !(attr as THREE.BufferAttribute).normalized)) continue;
      const floats = new Float32Array(attr.count * 3);
      for (let i = 0; i < attr.count; i++) {
        floats[i * 3] = attr.getX(i);
        floats[i * 3 + 1] = attr.getY(i);
        floats[i * 3 + 2] = attr.getZ(i);
      }
      m.geometry.setAttribute(name, new THREE.BufferAttribute(floats, 3));
    }
    m.userData.restPositions = (m.geometry.attributes.position.array as Float32Array).slice();
  }
}

export function applyBodyShape(meshes: THREE.Mesh[], frame: BodyFrame, gender: "woman" | "man", bodyType: string) {
  const shape = shapeFor(gender, bodyType);
  const v = new THREE.Vector3();
  const rel = new THREE.Vector3();
  const perp = new THREE.Vector3();
  const d = new THREE.Vector3();
  const total = new THREE.Vector3();

  for (const m of meshes as THREE.SkinnedMesh[]) {
    const rest = m.userData.restPositions as Float32Array | undefined;
    if (!m.isSkinnedMesh || !rest) continue;
    const position = m.geometry.attributes.position;
    const skinIndex = m.geometry.attributes.skinIndex;
    const skinWeight = m.geometry.attributes.skinWeight;
    const out = position.array as Float32Array;
    // Computed fresh: a cloned mesh's cached bindMatrixInverse can be stale.
    const bindInverse = m.bindMatrix.clone().invert();

    for (let i = 0; i < position.count; i++) {
      v.set(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]).applyMatrix4(m.bindMatrix);
      total.set(0, 0, 0);
      const sideSign = Math.sign(rel.copy(v).sub(frame.centre).dot(frame.side)) || 1;

      for (let k = 0; k < 4; k++) {
        const w = skinWeight.getComponent(i, k);
        if (w <= 0) continue;
        const bone = frame.bones[skinIndex.getComponent(i, k)];
        const region = bone?.region ? shape[bone.region] : undefined;
        if (!region) continue;

        rel.copy(v).sub(bone.pos);
        perp.copy(rel).addScaledVector(bone.axis, -rel.dot(bone.axis));
        const s = perp.dot(frame.side);
        const f = perp.dot(frame.forward);
        const depth = (region.sz ?? 1) * (f > 0 ? region.front ?? 1 : region.back ?? 1);

        d.copy(perp).multiplyScalar((region.r ?? 1) - 1);
        d.addScaledVector(frame.side, s * ((region.sx ?? 1) - 1));
        d.addScaledVector(frame.forward, f * (depth - 1));
        if (region.spread) d.addScaledVector(frame.side, sideSign * region.spread * frame.height);
        total.addScaledVector(d, w);
      }

      v.add(total).applyMatrix4(bindInverse);
      out[i * 3] = v.x;
      out[i * 3 + 1] = v.y;
      out[i * 3 + 2] = v.z;
    }
    position.needsUpdate = true;
    m.geometry.computeVertexNormals();
    m.geometry.computeBoundingSphere();
    m.geometry.computeBoundingBox();
  }
}
