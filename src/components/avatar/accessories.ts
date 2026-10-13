"use client";

// Wearable accessories built in code and attached to the skeleton, so they follow every animation.
// Sizes are proportional to the model's height; anchors are computed from the rest pose.

import * as THREE from "three";
import type { Accessory } from "@/lib/city/types";

export interface Anchor {
  bone: THREE.Object3D;
  /** Inverse of the bone's rest transform in model space. */
  restInverse: THREE.Matrix4;
  rest: THREE.Vector3;
}

export interface AccessoryRig {
  head?: Anchor;
  neck?: Anchor;
  leftHand?: Anchor;
  rightHand?: Anchor;
  height: number;
  /** Model-space yaw that faces the character forward. */
  yaw: number;
}

const NAMES = {
  head: ["Bip01_Head", "Head"],
  neck: ["Bip01_Neck", "Neck"],
  leftHand: ["Bip01_L_Hand", "LeftHand"],
  rightHand: ["Bip01_R_Hand", "RightHand"],
};

/** Call with the model in its rest pose, before any animation plays. */
export function buildAccessoryRig(scene: THREE.Object3D, height: number, yaw: number): AccessoryRig {
  scene.updateMatrixWorld(true);
  const sceneInverse = scene.matrixWorld.clone().invert();
  const anchor = (names: string[]): Anchor | undefined => {
    const bone = names.map((n) => scene.getObjectByName(n)).find(Boolean);
    if (!bone) return undefined;
    const restInModel = sceneInverse.clone().multiply(bone.matrixWorld);
    return { bone, restInverse: restInModel.clone().invert(), rest: new THREE.Vector3().setFromMatrixPosition(restInModel) };
  };
  return { head: anchor(NAMES.head), neck: anchor(NAMES.neck), leftHand: anchor(NAMES.leftHand), rightHand: anchor(NAMES.rightHand), height, yaw };
}

const black = () => new THREE.MeshStandardMaterial({ color: "#0b0b0b", roughness: 0.25, metalness: 0.4 });
const gold = () => new THREE.MeshStandardMaterial({ color: "#d4af37", roughness: 0.25, metalness: 1 });

/** Builds one accessory in model space (+y up, +z forward after `yaw`), centred on its anchor. */
function build(kind: Accessory, H: number): { mesh: THREE.Object3D; anchor: keyof Omit<AccessoryRig, "height" | "yaw">; offset: THREE.Vector3 } {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    g.add(mesh);
  };
  const r = H * 0.062; // head radius
  switch (kind) {
    case "cap": {
      const fabric = new THREE.MeshStandardMaterial({ color: "#1e3a8a", roughness: 0.85 });
      add(new THREE.SphereGeometry(r * 0.98, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), fabric, [0, 0, 0], [-0.22, 0, 0], [0.97, 1.14, 1.12]);
      add(new THREE.CylinderGeometry(r * 0.8, r * 0.8, r * 0.04, 24, 1, false, -Math.PI / 2, Math.PI), fabric, [0, -r * 0.04, r * 0.82], [0.12, 0, 0], [1, 1, 0.8]);
      return { mesh: g, anchor: "head", offset: new THREE.Vector3(0, r * 1.02, -r * 0.02) };
    }
    case "sunglasses": {
      const lens = black();
      [-1, 1].forEach((s) => add(new THREE.SphereGeometry(r * 0.3, 16, 12), lens, [s * r * 0.36, 0, 0], [0, 0, 0], [1.1, 0.75, 0.25]));
      add(new THREE.BoxGeometry(r * 0.24, r * 0.05, r * 0.05), lens, [0, r * 0.05, 0]);
      [-1, 1].forEach((s) => add(new THREE.BoxGeometry(r * 0.04, r * 0.05, r * 0.9), lens, [s * r * 0.68, r * 0.02, -r * 0.45]));
      return { mesh: g, anchor: "head", offset: new THREE.Vector3(0, r * 0.62, r * 0.92) };
    }
    case "headphones": {
      const m = black();
      add(new THREE.TorusGeometry(r * 0.84, r * 0.06, 10, 32, Math.PI), m, [0, 0, 0]);
      [-1, 1].forEach((s) => add(new THREE.CylinderGeometry(r * 0.3, r * 0.3, r * 0.18, 20), m, [s * r * 0.84, 0, 0], [0, 0, Math.PI / 2]));
      return { mesh: g, anchor: "head", offset: new THREE.Vector3(0, r * 0.5, -r * 0.08) };
    }
    case "watch": {
      add(new THREE.TorusGeometry(H * 0.022, H * 0.006, 8, 20), black(), [0, 0, 0], [0, Math.PI / 2, 0]);
      add(new THREE.BoxGeometry(H * 0.006, H * 0.022, H * 0.022), gold(), [H * 0.022, 0, 0]);
      return { mesh: g, anchor: "leftHand", offset: new THREE.Vector3(0, H * 0.02, 0) };
    }
    case "handbag": {
      const leather = new THREE.MeshStandardMaterial({ color: "#7c2d12", roughness: 0.5 });
      add(new THREE.BoxGeometry(H * 0.15, H * 0.11, H * 0.05), leather, [0, -H * 0.08, 0]);
      add(new THREE.TorusGeometry(H * 0.04, H * 0.004, 6, 16, Math.PI), gold(), [0, -H * 0.022, 0]);
      return { mesh: g, anchor: "rightHand", offset: new THREE.Vector3(0, -H * 0.03, 0) };
    }
    case "necklace": {
      add(new THREE.TorusGeometry(H * 0.045, H * 0.0035, 8, 36), gold(), [0, 0, 0], [Math.PI / 2 - 0.35, 0, 0]);
      add(new THREE.SphereGeometry(H * 0.007, 12, 10), new THREE.MeshStandardMaterial({ color: "#e0f2fe", metalness: 0.2, roughness: 0.05 }), [0, -H * 0.018, H * 0.042]);
      return { mesh: g, anchor: "neck", offset: new THREE.Vector3(0, -H * 0.012, H * 0.012) };
    }
  }
}

/** Attaches the given accessories; returns a function that removes them. */
export function attachAccessories(rig: AccessoryRig, kinds: Accessory[]): () => void {
  const attached: THREE.Object3D[] = [];
  const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rig.yaw);
  for (const kind of kinds) {
    const { mesh, anchor, offset } = build(kind, rig.height);
    const a = rig[anchor];
    if (!a) continue;
    // Desired transform in model space: at the anchor's rest position plus a forward-facing offset.
    const model = new THREE.Matrix4().compose(a.rest.clone().add(offset.clone().applyQuaternion(turn)), turn, new THREE.Vector3(1, 1, 1));
    const local = a.restInverse.clone().multiply(model);
    local.decompose(mesh.position, mesh.quaternion, mesh.scale);
    a.bone.add(mesh);
    attached.push(mesh);
  }
  return () => attached.forEach((m) => {
    m.removeFromParent();
    m.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  });
}
