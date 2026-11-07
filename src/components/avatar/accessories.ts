"use client";

// Wearable accessories built in code and attached to the skeleton, so they follow every animation.
// Sizes are proportional to the model's height; anchors are computed from the rest pose.

import * as THREE from "three";
import type { Accessory } from "@/lib/city/types";
import { SHOES_CATALOG, WIGS_CATALOG, outfitById, type AvatarLookProps } from "./roster";

export interface Anchor {
  bone: THREE.Object3D;
  /** Inverse of the bone's rest transform in model space. */
  restInverse: THREE.Matrix4;
  rest: THREE.Vector3;
}

export interface AccessoryRig {
  head?: Anchor;
  neck?: Anchor;
  spine?: Anchor;
  leftHand?: Anchor;
  rightHand?: Anchor;
  leftFoot?: Anchor;
  rightFoot?: Anchor;
  height: number;
  /** Model-space yaw that faces the character forward. */
  yaw: number;
  /** Model-space lowest Y (sole of feet) and highest Y (crown of head). */
  minY: number;
  maxY: number;
}

const NAMES = {
  head: ["Bip01_Head", "Head"],
  neck: ["Bip01_Neck", "Neck"],
  spine: ["Bip01_Spine", "Bip01_Pelvis", "Spine"],
  leftHand: ["Bip01_L_Hand", "LeftHand"],
  rightHand: ["Bip01_R_Hand", "RightHand"],
  leftFoot: ["Bip01_L_Foot", "LeftFoot"],
  rightFoot: ["Bip01_R_Foot", "RightFoot"],
};

/** Call with the model in its rest pose, before any animation plays. */
export function buildAccessoryRig(scene: THREE.Object3D, height: number, yaw: number): AccessoryRig {
  scene.updateMatrixWorld(true);
  const sceneInverse = scene.matrixWorld.clone().invert();
  // Measure model-space bounds so caps/wigs sit right on the skull crown and shoes sit flush on the floor sole
  const worldBox = new THREE.Box3().setFromObject(scene);
  const minCorner = worldBox.min.clone().applyMatrix4(sceneInverse);
  const maxCorner = worldBox.max.clone().applyMatrix4(sceneInverse);
  const minY = Math.min(minCorner.y, maxCorner.y);
  const maxY = Math.max(minCorner.y, maxCorner.y);
  const anchor = (names: string[]): Anchor | undefined => {
    const bone = names.map((n) => scene.getObjectByName(n)).find(Boolean);
    if (!bone) return undefined;
    const restInModel = sceneInverse.clone().multiply(bone.matrixWorld);
    return { bone, restInverse: restInModel.clone().invert(), rest: new THREE.Vector3().setFromMatrixPosition(restInModel) };
  };
  return {
    head: anchor(NAMES.head),
    neck: anchor(NAMES.neck),
    spine: anchor(NAMES.spine),
    leftHand: anchor(NAMES.leftHand),
    rightHand: anchor(NAMES.rightHand),
    leftFoot: anchor(NAMES.leftFoot),
    rightFoot: anchor(NAMES.rightFoot),
    height,
    yaw,
    minY,
    maxY,
  };
}

const black = () => new THREE.MeshStandardMaterial({ color: "#0b0b0b", roughness: 0.25, metalness: 0.4 });
const gold = () => new THREE.MeshStandardMaterial({ color: "#d4af37", roughness: 0.25, metalness: 1 });

/** Parametric curved baseball cap visor bill with realistic lateral arch curvature and forward dip. */
function createCurvedVisorGeometry(r: number, s: number): THREE.BufferGeometry {
  const uSegments = 16;
  const vSegments = 8;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= vSegments; j++) {
    const v = j / vSegments; // 0 at forehead -> 1 at front tip
    // Bill projects cleanly forward (+Z) and slightly outward from the brow rim
    const z = r * (0.84 + v * 0.65);
    const w = r * (0.88 - v * 0.12);
    // Subtle forward slope (-0.008 * s), staying well above the brows and eyes
    const ySlope = -0.008 * s * v;

    for (let i = 0; i <= uSegments; i++) {
      const uNorm = (i / uSegments) * 2 - 1; // -1 to +1
      const x = uNorm * w;
      // Parabolic arch: highest in center, curving down gracefully at edges
      const yArch = -0.014 * s * (uNorm * uNorm);
      const y = ySlope + yArch + 0.004 * s;

      positions.push(x, y, z);
      uvs.push(i / uSegments, v);
    }
  }

  for (let j = 0; j < vSegments; j++) {
    for (let i = 0; i < uSegments; i++) {
      const a = j * (uSegments + 1) + i;
      const b = a + 1;
      const c = (j + 1) * (uSegments + 1) + i;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Builds an authentic, high-end Dubai luxury couture baseball cap. */
function buildDesignerCapGroup(r: number, s: number, color: string, trimColor: string = "#d4af37"): THREE.Group {
  const g = new THREE.Group();
  const capMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: trimColor,
    roughness: 0.25,
    metalness: 0.85,
    side: THREE.DoubleSide,
  });

  // 1. Crown Dome (covers skull down to hairline with smooth 6-panel contour)
  const capDome = new THREE.Mesh(
    new THREE.SphereGeometry(r * 1.06, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.58),
    capMat
  );
  capDome.position.set(0, 0.016 * s, 0.004 * s);
  capDome.rotation.set(-0.06, 0, 0);
  capDome.scale.set(1.03, 1.05, 1.08);
  capDome.castShadow = true;
  g.add(capDome);

  // 2. Sweatband / Brow Trim (hugs hairline & upper cranium cleanly, preventing any hair clipping)
  const browRim = new THREE.Mesh(
    new THREE.TorusGeometry(r * 1.03, r * 0.038, 10, 32),
    trimMat
  );
  browRim.position.set(0, -0.002 * s, 0.008 * s);
  browRim.rotation.set(Math.PI / 2 - 0.06, 0, 0);
  browRim.castShadow = true;
  g.add(browRim);

  // 3. Curved Visor Peak (realistic curved bill)
  const visor = new THREE.Mesh(createCurvedVisorGeometry(r, s), capMat);
  visor.castShadow = true;
  g.add(visor);

  // Accent sandwich trim along the visor edge
  const visorAccent = new THREE.Mesh(createCurvedVisorGeometry(r * 0.99, s), trimMat);
  visorAccent.position.set(0, -0.0015 * s, 0.002 * s);
  g.add(visorAccent);

  // 4. Top Button (Squatchee)
  const button = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.07, 14, 10),
    trimMat
  );
  button.position.set(0, r * 1.06, -0.02 * s);
  g.add(button);

  // 5. Front Luxury Dubai Medallion / Falcon Crest
  const badgeRim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.17, r * 0.17, r * 0.02, 24), trimMat);
  badgeRim.position.set(0, r * 0.32, r * 0.96);
  badgeRim.rotation.set(Math.PI / 2 - 0.20, 0, 0);
  g.add(badgeRim);

  const badgeCore = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.138, r * 0.138, r * 0.024, 20),
    new THREE.MeshStandardMaterial({ color: "#09090b", roughness: 0.25, metalness: 0.8 })
  );
  badgeCore.position.set(0, r * 0.32, r * 0.963);
  badgeCore.rotation.set(Math.PI / 2 - 0.20, 0, 0);
  g.add(badgeCore);

  const emblemStar = new THREE.Mesh(new THREE.ConeGeometry(r * 0.065, r * 0.075, 5), trimMat);
  emblemStar.position.set(0, r * 0.32, r * 0.98);
  emblemStar.rotation.set(Math.PI / 2 - 0.20, 0, 0);
  g.add(emblemStar);

  return g;
}

type AnchorKey = "head" | "neck" | "spine" | "leftHand" | "rightHand" | "leftFoot" | "rightFoot";

/** Builds one accessory in model space (+y up, +z forward after `yaw`), centred on its anchor. */
function build(kind: Accessory, H: number): { mesh: THREE.Object3D; anchor: AnchorKey; offset: THREE.Vector3 } {
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
      const s = H / 1.74;
      const headR = 0.126 * s;
      const capGroup = buildDesignerCapGroup(headR, s, "#1e3a8a", "#d4af37");
      return { mesh: capGroup, anchor: "head", offset: new THREE.Vector3(0, 0.150 * s, 0.006 * s) };
    }
    case "sunglasses": {
      const lens = black();
      [-1, 1].forEach((s) => add(new THREE.SphereGeometry(r * 0.3, 16, 12), lens, [s * r * 0.36, 0, 0], [0, 0, 0], [1.1, 0.75, 0.25]));
      add(new THREE.BoxGeometry(r * 0.24, r * 0.05, r * 0.05), gold(), [0, r * 0.05, 0]);
      [-1, 1].forEach((s) => add(new THREE.BoxGeometry(r * 0.04, r * 0.05, r * 0.9), gold(), [s * r * 0.68, r * 0.02, -r * 0.45]));
      return { mesh: g, anchor: "head", offset: new THREE.Vector3(0, r * 0.58, r * 0.92) };
    }
    case "headphones": {
      const m = black();
      add(new THREE.TorusGeometry(r * 0.88, r * 0.065, 10, 32, Math.PI), m, [0, 0, 0]);
      [-1, 1].forEach((s) => add(new THREE.CylinderGeometry(r * 0.3, r * 0.3, r * 0.18, 20), m, [s * r * 0.88, 0, 0], [0, 0, Math.PI / 2]));
      return { mesh: g, anchor: "head", offset: new THREE.Vector3(0, r * 0.52, -r * 0.06) };
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

function mountToAnchor(rig: AccessoryRig, anchorKey: AnchorKey, mesh: THREE.Object3D, offset: THREE.Vector3, attached: THREE.Object3D[]) {
  const a = rig[anchorKey];
  if (!a) return;
  const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rig.yaw);
  const model = new THREE.Matrix4().compose(a.rest.clone().add(offset.clone().applyQuaternion(turn)), turn, new THREE.Vector3(1, 1, 1));
  const local = a.restInverse.clone().multiply(model);
  local.decompose(mesh.position, mesh.quaternion, mesh.scale);
  a.bone.add(mesh);
  attached.push(mesh);
}

/**
 * Attaches 3D Wigs/Cultural Headgear (#21, #28, #16), Acrylic Nails (#21), Designer Footwear (#21),
 * and Progressive 3D Pregnancy Baby Bump (#6) directly onto the avatar's skeleton bones.
 */
export function attachLookExtras(rig: AccessoryRig, look: AvatarLookProps): () => void {
  const attached: THREE.Object3D[] = [];
  const H = rig.height;
  const s = H / 1.74;
  const headR = 0.126 * s;
  const r = headR;
  const browY = 0.132 * s;
  const hairlineY = 0.154 * s;
  const crownY = 0.235 * s;
  const defaultSoleY = -0.098 * s;
  const wearOutfit = outfitById(look.wear);
  const rawWig = look.wigId ?? wearOutfit?.defaultWigId;
  const wigId = rawWig === "none" ? undefined : rawWig;
  const accentHex = look.secondaryColor ?? wearOutfit?.defaultSecondaryColor ?? "#d4af37";
  const primaryHex = look.primaryColor ?? wearOutfit?.defaultPrimaryColor ?? "#059669";

  // 1. 3D Wigs, Braids, Cultural Headgear, Caps & Bridal Veils
  if (wigId && rig.head) {
    const wigInfo = WIGS_CATALOG.find((w) => w.id === wigId);
    const isCulturalHeadgear =
      wigId.includes("gele") ||
      wigId.includes("fila") ||
      wigId.includes("safa") ||
      wigId.includes("cap") ||
      wigId.includes("hat") ||
      wigId.includes("tanyi") ||
      wigId.includes("okuku");
    const wigColor = look.secondaryColor && isCulturalHeadgear
      ? look.secondaryColor
      : wigInfo?.color ?? accentHex;
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: wigColor,
      roughness: isCulturalHeadgear || wigId.includes("tiara") ? 0.32 : 0.42,
      metalness: wigId.includes("gele") || wigId.includes("tiara") || wigId.includes("fila") ? 0.38 : 0.12,
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.25, metalness: 0.85 });

    if (wigId === "gele_crown") {
      // Nigerian Pleated Fan Auto-Gele — snug forehead wrap band + 3 sculpted pleated fan tiers
      const browWrap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.04, r * 0.98, r * 0.34, 28, 1, true), mat);
      browWrap.position.set(0, 0, 0);
      g.add(browWrap);
      const goldBand = new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, r * 0.045, 10, 28), trimMat);
      goldBand.rotation.set(Math.PI / 2 - 0.08, 0, 0);
      goldBand.position.set(0, -r * 0.1, r * 0.02);
      g.add(goldBand);
      const fan1 = new THREE.Mesh(new THREE.TorusGeometry(r * 1.08, r * 0.32, 14, 32, Math.PI * 1.18), mat);
      fan1.position.set(0, r * 0.16, -r * 0.04);
      fan1.rotation.set(-0.28, 0, -0.08);
      g.add(fan1);
      const fan2 = new THREE.Mesh(new THREE.TorusGeometry(r * 1.26, r * 0.22, 14, 32, Math.PI * 1.14), trimMat);
      fan2.position.set(0, r * 0.38, -r * 0.1);
      fan2.rotation.set(-0.34, 0, 0.06);
      g.add(fan2);
      const fan3 = new THREE.Mesh(new THREE.TorusGeometry(r * 1.4, r * 0.16, 12, 28, Math.PI * 1.08), mat);
      fan3.position.set(0, r * 0.54, -r * 0.14);
      fan3.rotation.set(-0.38, 0, -0.04);
      g.add(fan3);
      mountToAnchor(rig, "head", g, new THREE.Vector3(0, browY, -r * 0.03), attached);
    } else if (wigId === "edo_okuku") {
      // Edo Royal Coral Bead Okuku Crown — beaded brow circlet + tiered coral dome + royal bead finials
      const coralMat = new THREE.MeshStandardMaterial({ color: "#dc2626", roughness: 0.25, metalness: 0.3 });
      const baseBand = new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, r * 0.09, 12, 28), coralMat);
      baseBand.rotation.set(Math.PI / 2, 0, 0);
      g.add(baseBand);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.98, r * 0.72, 24), coralMat);
      crown.position.set(0, r * 0.36, -r * 0.02);
      g.add(crown);
      const goldRing = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, r * 0.05, 10, 26), gold());
      goldRing.rotation.set(Math.PI / 2, 0, 0);
      goldRing.position.set(0, r * 0.35, -r * 0.02);
      g.add(goldRing);
      for (let i = -2; i <= 2; i++) {
        const bead = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 14, 12), coralMat);
        bead.position.set(i * r * 0.34, r * 0.82, r * 0.12 - Math.abs(i) * r * 0.08);
        g.add(bead);
      }
      mountToAnchor(rig, "head", g, new THREE.Vector3(0, browY, 0), attached);
    } else if (wigId === "fila_cap") {
      // Authentic Yoruba Fìlà Abetí Ajá & Gòbì Cap
      // Sculpted Aṣọ-Òkè woven crown tilted to the side + signature folded triangular flaps ("dog ears")
      const capMat = new THREE.MeshStandardMaterial({
        color: wigColor,
        roughness: 0.42,
        metalness: 0.28,
        side: THREE.DoubleSide,
      });

      // 1. Base fitted brow band with gold embroidered stitch line
      const baseRim = new THREE.Mesh(
        new THREE.TorusGeometry(r * 1.01, r * 0.048, 10, 32),
        trimMat
      );
      baseRim.position.set(0, -0.005 * s, 0);
      baseRim.rotation.set(Math.PI / 2 - 0.08, 0, 0);
      g.add(baseRim);

      // 2. Sculpted Aṣọ-Òkè crown body with the classic Yoruba tilt to the side
      const capHeight = r * 0.62;
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.94, r * 1.02, capHeight, 28),
        capMat
      );
      cap.position.set(r * 0.08, capHeight * 0.46, -r * 0.02);
      cap.rotation.set(0, 0, -0.22);
      g.add(cap);

      // 3. Top crown closure with pleated fold
      const topDome = new THREE.Mesh(
        new THREE.SphereGeometry(r * 0.92, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.45),
        capMat
      );
      topDome.position.set(r * 0.14, capHeight * 0.86, -r * 0.02);
      topDome.rotation.set(0, 0, -0.22);
      topDome.scale.set(1, 0.38, 0.95);
      g.add(topDome);

      // 4. Signature Abetí Ajá Folded Flaps ("Dog-Ears") with gold embroidered borders
      // Right flap: folded down over the right rim
      const rightFlap = new THREE.Mesh(
        new THREE.ConeGeometry(r * 0.36, r * 0.68, 3),
        capMat
      );
      rightFlap.position.set(r * 0.92, r * 0.26, 0.01 * s);
      rightFlap.rotation.set(0.12, 0, -1.28);
      rightFlap.scale.set(1, 1, 0.22);
      g.add(rightFlap);

      const rightFlapTrim = new THREE.Mesh(
        new THREE.TorusGeometry(r * 0.24, r * 0.022, 6, 16, Math.PI * 1.2),
        trimMat
      );
      rightFlapTrim.position.set(r * 0.96, r * 0.24, 0.02 * s);
      rightFlapTrim.rotation.set(0.12, 0, -1.28);
      g.add(rightFlapTrim);

      // Left flap: angled up / back in classic Owambe celebration flair
      const leftFlap = new THREE.Mesh(
        new THREE.ConeGeometry(r * 0.34, r * 0.64, 3),
        capMat
      );
      leftFlap.position.set(-r * 0.78, r * 0.40, -r * 0.12);
      leftFlap.rotation.set(-0.22, 0.32, 0.95);
      leftFlap.scale.set(1, 1, 0.22);
      g.add(leftFlap);

      const leftFlapTrim = new THREE.Mesh(
        new THREE.TorusGeometry(r * 0.22, r * 0.022, 6, 16, Math.PI * 1.2),
        trimMat
      );
      leftFlapTrim.position.set(-r * 0.82, r * 0.42, -r * 0.14);
      leftFlapTrim.rotation.set(-0.22, 0.32, 0.95);
      g.add(leftFlapTrim);

      mountToAnchor(rig, "head", g, new THREE.Vector3(0, 0.152 * s, 0.004 * s), attached);
    } else if (wigId === "igbo_red_cap" || wigId === "kenyan_beaded_hat") {
      // Igbo Chieftaincy Cap with Eagle Feather / Kenyan Beaded Kofia
      // Snug fitted base rim around forehead + sculpted cap body + embroidered gold band
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, r * 0.075, 12, 28), trimMat);
      rim.rotation.set(Math.PI / 2, 0, 0);
      g.add(rim);
      const capHeight = wigId === "igbo_red_cap" ? r * 0.68 : r * 0.58;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 1.02, capHeight, 26), mat);
      cap.position.set(0, capHeight * 0.48, -r * 0.02);
      g.add(cap);
      // Top dome cap closure so it looks solid from every angle
      const topDome = new THREE.Mesh(new THREE.SphereGeometry(r * 0.93, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), mat);
      topDome.position.set(0, capHeight * 0.88, -r * 0.02);
      topDome.scale.set(1, 0.38, 1);
      g.add(topDome);
      if (wigId === "igbo_red_cap") {
        // Iconic White & Crimson Eagle Feather ("Ugo" Feather)
        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(r * 0.025, r * 0.035, r * 1.25, 8),
          gold(),
        );
        shaft.position.set(r * 0.92, r * 0.58, 0);
        shaft.rotation.set(0, 0, -0.38);
        g.add(shaft);
        const feather = new THREE.Mesh(
          new THREE.ConeGeometry(r * 0.18, r * 1.15, 10),
          new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.3 }),
        );
        feather.position.set(r * 0.96, r * 0.68, 0);
        feather.rotation.set(0, 0, -0.38);
        feather.scale.set(0.55, 1, 1.15);
        g.add(feather);
      } else if (wigId === "kenyan_beaded_hat") {
        const beadBand = new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, r * 0.055, 10, 26), new THREE.MeshStandardMaterial({ color: "#dc2626", roughness: 0.3 }));
        beadBand.rotation.set(Math.PI / 2, 0, 0);
        beadBand.position.set(0, r * 0.26, -r * 0.02);
        g.add(beadBand);
      }
      mountToAnchor(rig, "head", g, new THREE.Vector3(0, 0.152 * s, 0.004 * s), attached);
    } else if (wigId === "dubai_luxury_cap" || wigId === "dubai_luxury_cap_f") {
      // Dubai Luxury Couture Baseball Cap — authentic curved visor peak, snug 6-panel crown & gold crest
      const capGroup = buildDesignerCapGroup(r, s, wigColor, look.secondaryColor ?? accentHex);
      mountToAnchor(rig, "head", capGroup, new THREE.Vector3(0, 0.150 * s, 0.006 * s), attached);
    } else if (wigId === "emirati_ghutra_agal") {
      // Emirati Royal White Ghutra + Double Black/Gold Agal Cord + Flowing Side Drapes
      const whiteCloth = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.45, side: THREE.DoubleSide });
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(r * 1.08, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
        whiteCloth,
      );
      dome.position.set(0, r * 0.06, -r * 0.02);
      g.add(dome);
      // Left & right flowing shoulder drapes
      for (const s of [-1, 1] as const) {
        const drape = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.38, H * 0.22, 12), whiteCloth);
        drape.position.set(s * r * 0.82, -H * 0.095, -r * 0.15);
        drape.rotation.set(0.12, 0, -s * 0.18);
        g.add(drape);
      }
      // Back drape
      const backDrape = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r * 1.08, H * 0.22, 18), whiteCloth);
      backDrape.position.set(0, -H * 0.09, -r * 0.45);
      g.add(backDrape);
      // Double Agal cord (black woven cord + gold finial rings)
      const agalBlack = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, r * 0.075, 12, 28), black());
      agalBlack.rotation.set(Math.PI / 2 - 0.06, 0, 0);
      agalBlack.position.set(0, r * 0.18, 0);
      g.add(agalBlack);
      const agalGold = new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, r * 0.055, 12, 28), gold());
      agalGold.rotation.set(Math.PI / 2 - 0.06, 0, 0);
      agalGold.position.set(0, r * 0.29, 0);
      g.add(agalGold);
      mountToAnchor(rig, "head", g, new THREE.Vector3(0, 0.148 * s, 0), attached);
    } else if (wigId === "low_taper_waves" || wigId === "king_locs_fade") {
      // Men's 360 Waves / Short Royal Twist Locs — snugly hugs the skull crown
      const fadeTop = new THREE.Mesh(
        new THREE.SphereGeometry(r * 1.05, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
        mat,
      );
      fadeTop.position.set(0, r * 0.02, -r * 0.02);
      g.add(fadeTop);
      if (wigId === "king_locs_fade") {
        for (let i = -3; i <= 3; i++) {
          const loc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.14, r * 0.12, r * 0.85, 8), mat);
          const angle = (i / 3) * Math.PI * 0.65;
          loc.position.set(Math.sin(angle) * r * 0.88, -r * 0.15, -Math.cos(angle) * r * 0.82);
          loc.rotation.set(-0.15, 0, Math.sin(angle) * 0.22);
          g.add(loc);
        }
        const goldCuff = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, r * 0.04, 8, 24), gold());
        goldCuff.rotation.set(Math.PI / 2, 0, 0);
        goldCuff.position.set(0, r * 0.08, 0);
        g.add(goldCuff);
      }
      mountToAnchor(rig, "head", g, new THREE.Vector3(0, browY + r * 0.06, 0), attached);
    } else if (wigId === "safa_turban" || wigId === "tanyi_crown") {
      // Indian Royal Safa Turban with Kalgi Plume / Cameroonian Tanyi Feather Crown
      const turban = new THREE.Mesh(new THREE.SphereGeometry(r * 1.14, 24, 16), mat);
      turban.scale.set(1.06, 0.72, 1.12);
      turban.position.set(0, r * 0.22, -r * 0.02);
      g.add(turban);
      const wrapBand = new THREE.Mesh(new THREE.TorusGeometry(r * 1.04, r * 0.12, 12, 28), trimMat);
      wrapBand.rotation.set(Math.PI / 2 - 0.1, 0, 0.08);
      wrapBand.position.set(0, r * 0.08, 0);
      g.add(wrapBand);
      const jewel = new THREE.Mesh(new THREE.SphereGeometry(r * 0.2, 14, 12), gold());
      jewel.position.set(0, r * 0.28, r * 1.08);
      g.add(jewel);
      const plume = new THREE.Mesh(
        new THREE.ConeGeometry(r * 0.22, r * 1.05, 12),
        new THREE.MeshStandardMaterial({ color: wigId === "tanyi_crown" ? "#dc2626" : "#fffbeb", roughness: 0.35 }),
      );
      plume.position.set(0, r * 0.82, r * 0.88);
      plume.rotation.set(-0.22, 0, 0);
      g.add(plume);
      mountToAnchor(rig, "head", g, new THREE.Vector3(0, browY, 0), attached);
    } else if (wigId === "bridal_veil" || wigId === "bridal_tiara") {
      // Diamond Tiara + Flowing Cathedral Lace Veil
      const tiaraMat = new THREE.MeshStandardMaterial({ color: "#e0f2fe", metalness: 0.95, roughness: 0.08 });
      const tiara = new THREE.Mesh(
        new THREE.TorusGeometry(r * 0.96, r * 0.075, 12, 28, Math.PI),
        tiaraMat,
      );
      tiara.position.set(0, r * 0.28, r * 0.12);
      tiara.rotation.set(-0.38, 0, 0);
      g.add(tiara);
      for (let i = -2; i <= 2; i++) {
        const spire = new THREE.Mesh(new THREE.ConeGeometry(r * 0.07, r * (0.34 - Math.abs(i) * 0.05), 8), gold());
        spire.position.set(i * r * 0.26, r * (0.48 - Math.abs(i) * 0.04), r * (0.88 - Math.abs(i) * 0.12));
        g.add(spire);
      }
      if (wigId === "bridal_veil") {
        const veil = new THREE.Mesh(
          new THREE.ConeGeometry(r * 2.4, H * 0.56, 20, 1, true, Math.PI * 0.62, Math.PI * 1.76),
          new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.55, roughness: 0.25, side: THREE.DoubleSide }),
        );
        veil.position.set(0, -H * 0.22, -r * 0.65);
        g.add(veil);
      }
      mountToAnchor(rig, "head", g, new THREE.Vector3(0, browY, 0), attached);
    } else if (wigId === "fulani_beaded") {
      // Fulani Tribal Braids: authentic gold cuffs & cowrie beads along the hairline & side tresses
      for (const s of [-1, 1] as const) {
        for (let b = 0; b < 3; b++) {
          const cuff = new THREE.Mesh(new THREE.TorusGeometry(r * 0.09, r * 0.025, 8, 16), gold());
          cuff.position.set(s * r * 0.92, -r * (0.12 + b * 0.3), r * (0.22 - b * 0.04));
          cuff.rotation.set(0.12, 0, s * 0.15);
          g.add(cuff);
          const bead = new THREE.Mesh(new THREE.SphereGeometry(r * 0.065, 8, 8), gold());
          bead.position.set(s * r * 0.92, -r * (0.18 + b * 0.3), r * (0.22 - b * 0.04));
          g.add(bead);
        }
      }
      mountToAnchor(rig, "head", g, new THREE.Vector3(0, browY, 0), attached);
    } else if (wigId === "high_sleek_pony") {
      // Sleek snatched ponytail gold cuff hair accessory
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(r * 0.22, r * 0.05, 10, 20), gold());
      cuff.position.set(0, r * 0.58, -r * 0.72);
      cuff.rotation.set(0.45, 0, 0);
      g.add(cuff);
      mountToAnchor(rig, "head", g, new THREE.Vector3(0, browY, 0), attached);
    } else if (wigId === "afro_puff_crown") {
      // Royal afro puff gold hair band crown
      const goldBand = new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, r * 0.055, 10, 26), gold());
      goldBand.rotation.set(Math.PI / 2 - 0.18, 0, 0);
      goldBand.position.set(0, r * 0.08, r * 0.04);
      g.add(goldBand);
      mountToAnchor(rig, "head", g, new THREE.Vector3(0, browY, 0), attached);
    }
    // Note: For natural flowing hairstyles (Bone Straight, Body Wave, Knotless Braids, Platinum Bob, Burgundy Curls),
    // we deliberately do not spawn rigid plastic geometry here. Their authentic, multi-layered textured hair cards
    // are rendered directly by the Rocketbox character and dynamically tinted with exact salon pigments in CitizenAvatar.
  }

  // 2. Acrylic Nails & Manicure (#21 — Gamified in Wardrobe VIP Salon)
  // Nails are interactive in the Wardrobe VIP Nail Studio (5-finger canvas, 2 coats, UV LED curing lamp, CV points),
  // avoiding floating detached cones off animated hands.

  // 3. Footwear styling is modeled authentically into each Rocketbox outfit mesh.

  // 4. Progressive 3D Pregnancy Bump (#6 — Trimesters 1..3, Ladies Only)
  if (look.pregnantWeeks && look.pregnantWeeks > 0 && look.gender !== "man" && rig.spine) {
    const weeks = Math.min(3, Math.max(1, look.pregnantWeeks));
    const bumpRadius = H * (0.068 + weeks * 0.024);
    const g = new THREE.Group();
    const bumpMat = new THREE.MeshStandardMaterial({
      color: primaryHex,
      roughness: 0.55,
      metalness: 0.08,
    });
    const bump = new THREE.Mesh(new THREE.SphereGeometry(bumpRadius, 20, 16), bumpMat);
    bump.scale.set(1.08, 0.95, 1.05);
    g.add(bump);
    mountToAnchor(rig, "spine", g, new THREE.Vector3(0, -H * 0.02, H * (0.055 + weeks * 0.018)), attached);
  }

  // 5. Authentic Yoruba Grand Agbada 3-Piece Ensemble (Awosoke outer gown, shoulder wings, chest embroidery & royal coral beads)
  if ((look.wear === "ng_agbada" || look.wear === "bridal_groom_agbada") && rig.spine) {
    const isBridal = look.wear === "bridal_groom_agbada";
    const agbadaColor = look.primaryColor ?? (isBridal ? "#fffbeb" : "#1e3a8a");
    const embroColor = look.secondaryColor ?? "#d4af37";

    const agbadaMat = new THREE.MeshStandardMaterial({
      color: agbadaColor,
      roughness: 0.48,
      metalness: 0.16,
      side: THREE.DoubleSide,
    });
    const goldAariMat = new THREE.MeshStandardMaterial({
      color: embroColor,
      roughness: 0.28,
      metalness: 0.88,
      side: THREE.DoubleSide,
    });
    const coralMat = new THREE.MeshStandardMaterial({
      color: "#b91c1c",
      roughness: 0.22,
      metalness: 0.32,
    });

    const gAgbada = new THREE.Group();

    // Clean, authentic royal Yoruba chest embroidery & Nigerian coral regalia (flush to chest fabric, no bulky clipping primitives)
    // 1. Embroidered curved collar band (Orùn)
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(H * 0.076, H * 0.010, 10, 24, Math.PI * 1.1),
      goldAariMat
    );
    collar.position.set(0, H * 0.17, H * 0.065);
    collar.rotation.set(Math.PI / 2 - 0.28, 0, 0);
    gAgbada.add(collar);

    // 2. Central geometric embroidered chest plate with traditional Aari knotwork
    const bib = new THREE.Mesh(
      new THREE.BoxGeometry(H * 0.135, H * 0.20, 0.003),
      goldAariMat
    );
    bib.position.set(0, H * 0.05, H * 0.070);
    bib.rotation.set(-0.08, 0, 0);
    gAgbada.add(bib);

    // Inner embroidered diamond medallion
    const centerMedallion = new THREE.Mesh(
      new THREE.CylinderGeometry(H * 0.045, H * 0.045, 0.005, 4),
      new THREE.MeshStandardMaterial({ color: isBridal ? "#ffffff" : "#0f172a", roughness: 0.35, metalness: 0.5 })
    );
    centerMedallion.position.set(0, H * 0.065, H * 0.074);
    centerMedallion.rotation.set(Math.PI / 2 - 0.08, Math.PI / 4, 0);
    gAgbada.add(centerMedallion);

    // Gold star emblem in center of medallion
    const starFinial = new THREE.Mesh(
      new THREE.ConeGeometry(H * 0.018, H * 0.012, 6),
      goldAariMat
    );
    starFinial.position.set(0, H * 0.065, H * 0.078);
    starFinial.rotation.set(Math.PI / 2 - 0.08, 0, 0);
    gAgbada.add(starFinial);

    // Left chest pocket (Àpò) with gold embroidered trim
    const pocket = new THREE.Mesh(
      new THREE.BoxGeometry(H * 0.048, H * 0.054, 0.003),
      goldAariMat
    );
    pocket.position.set(-H * 0.072, H * 0.06, H * 0.071);
    pocket.rotation.set(-0.08, 0, 0);
    gAgbada.add(pocket);

    // 3. Royal Nigerian Coral Beads (Ìlẹ̀kẹ̀ Ìyùn)
    const coralNecklace = new THREE.Mesh(
      new THREE.TorusGeometry(H * 0.088, H * 0.009, 10, 30, Math.PI * 1.18),
      coralMat
    );
    coralNecklace.position.set(0, H * 0.155, H * 0.074);
    coralNecklace.rotation.set(Math.PI / 2 - 0.35, 0, 0);
    gAgbada.add(coralNecklace);

    // Center coral pendant
    const coralPendant = new THREE.Mesh(
      new THREE.SphereGeometry(H * 0.018, 14, 12),
      coralMat
    );
    coralPendant.position.set(0, H * 0.065, H * 0.079);
    gAgbada.add(coralPendant);

    mountToAnchor(rig, "spine", gAgbada, new THREE.Vector3(0, 0, 0), attached);

    // Royal Coral Bead Bracelets on Wrists
    for (const hand of ["leftHand", "rightHand"] as const) {
      if (rig[hand]) {
        const gCoral = new THREE.Group();
        const coralBangle = new THREE.Mesh(
          new THREE.TorusGeometry(H * 0.038, H * 0.009, 10, 20),
          coralMat
        );
        coralBangle.rotation.set(Math.PI / 2, 0, 0);
        gCoral.add(coralBangle);
        mountToAnchor(rig, hand, gCoral, new THREE.Vector3(0, 0, 0), attached);
      }
    }
  }

  // 6. Professional 3D Boxing Gloves (Red Corner / Blue Corner Prizefighter Gear)
  if (look.gloves && look.gloves !== "none") {
    const isRed = look.gloves === "boxing_red";
    const gloveHex = isRed ? "#dc2626" : "#2563eb";
    const gloveMat = new THREE.MeshStandardMaterial({
      color: gloveHex,
      roughness: 0.28,
      metalness: 0.15,
    });
    const cuffMat = new THREE.MeshStandardMaterial({
      color: "#f8fafc",
      roughness: 0.35,
      metalness: 0.05,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: "#f59e0b",
      roughness: 0.25,
      metalness: 0.85,
    });

    for (const handKey of ["leftHand", "rightHand"] as const) {
      if (!rig[handKey]) continue;
      const isLeft = handKey === "leftHand";
      const s = isLeft ? 1 : -1;
      const g = new THREE.Group();

      // Main padded knuckle cushion (rounded pro glove)
      const knuckle = new THREE.Mesh(
        new THREE.SphereGeometry(H * 0.038, 16, 14),
        gloveMat
      );
      knuckle.scale.set(1.15, 1.35, 1.05);
      knuckle.position.set(0, -H * 0.042, H * 0.008);
      g.add(knuckle);

      // Padded thumb compartment tucked along the inner palm
      const thumb = new THREE.Mesh(
        new THREE.SphereGeometry(H * 0.019, 12, 10),
        gloveMat
      );
      thumb.scale.set(0.9, 1.25, 0.95);
      thumb.position.set(s * H * 0.024, -H * 0.028, H * 0.016);
      thumb.rotation.set(0.2, 0, s * 0.35);
      g.add(thumb);

      // Laced white wrist cuff / support wrap
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(H * 0.029, H * 0.033, H * 0.034, 16),
        cuffMat
      );
      cuff.position.set(0, -H * 0.015, 0);
      g.add(cuff);

      // Gold championship patch / emblem on wrist
      const patch = new THREE.Mesh(
        new THREE.BoxGeometry(H * 0.016, H * 0.014, H * 0.004),
        goldMat
      );
      patch.position.set(0, -H * 0.014, H * 0.031);
      g.add(patch);

      mountToAnchor(rig, handKey, g, new THREE.Vector3(0, 0, 0), attached);
    }
  }

  return () =>
    attached.forEach((m) => {
      m.removeFromParent();
      m.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    });
}
