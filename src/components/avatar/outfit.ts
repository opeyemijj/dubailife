"use client";

// Outfits: a roster citizen's face and hair on another roster citizen's body and clothes.
// Every roster model has the same skeleton (Biped) with the head and the body as separate parts,
// so the face is re-bound to the outfit's skeleton using the face's own bind pose — it then sits on
// the outfit's neck and follows every animation.

import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

const isFacePart = (m: THREE.Mesh) => {
  const name = (Array.isArray(m.material) ? m.material[0] : m.material)?.name ?? "";
  return /_head$|_opacity$/i.test(name);
};

/** A new model: `outfit`'s body and clothes with `face`'s head and hair. */
export function composeOutfit(face: THREE.Object3D, outfit: THREE.Object3D): THREE.Group {
  const result = cloneSkinned(outfit) as THREE.Group;
  const faceClone = cloneSkinned(face) as THREE.Group;

  // Take the outfit's own head and hair off.
  const body: THREE.SkinnedMesh[] = [];
  const drop: THREE.Object3D[] = [];
  result.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    if (isFacePart(m)) drop.push(m);
    else body.push(m);
  });
  drop.forEach((m) => m.removeFromParent());
  const anchor = body[0];
  if (!anchor) return result;
  const bones = new Map(anchor.skeleton.bones.map((b) => [b.name, b]));

  // Put the face's head and hair on the outfit's skeleton.
  const parts: THREE.SkinnedMesh[] = [];
  faceClone.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh && isFacePart(m)) parts.push(m);
  });
  for (const part of parts) {
    const skeleton = new THREE.Skeleton(
      part.skeleton.bones.map((b) => bones.get(b.name) ?? b),
      part.skeleton.boneInverses.map((m) => m.clone()),
    );
    const bindMatrix = part.bindMatrix.clone();
    // Same place in the hierarchy as the outfit's body (each part keeps its own transform, which
    // carries the compressed-geometry scale).
    anchor.parent!.add(part);
    part.bind(skeleton, bindMatrix);
    // Modelled for a different body: body sculpting must leave it alone.
    part.userData.borrowedFace = true;
    part.frustumCulled = false;
  }
  return result;
}
