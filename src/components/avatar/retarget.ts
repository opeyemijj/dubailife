// Drives a Mixamo-style rig (Avaturn selfie avatars) from a Rocketbox Biped rig playing our clips.
// Each frame, every mapped bone copies the source bone's rotation *relative to its rest pose*,
// expressed in a shared body frame, so rigs with different bone axes still move the same way.

import * as THREE from "three";

const SIDES: Array<[string, string]> = [["L", "Left"], ["R", "Right"]];

// [source bone, target bone, source child, target child]: the child gives the bone's pointing
// direction, used to line up rest poses (Rocketbox rests in an A-pose, Avaturn in a T-pose).
const PAIRS: Array<[string, string, string?, string?]> = [
  ["Bip01_Pelvis", "Hips"],
  ["Bip01_Spine", "Spine", "Bip01_Spine1", "Spine1"],
  ["Bip01_Spine1", "Spine1", "Bip01_Spine2", "Spine2"],
  ["Bip01_Spine2", "Spine2", "Bip01_Neck", "Neck"],
  ["Bip01_Neck", "Neck", "Bip01_Head", "Head"],
  ["Bip01_Head", "Head"],
  ...SIDES.flatMap(([b, m]): Array<[string, string, string?, string?]> => [
    [`Bip01_${b}_Clavicle`, `${m}Shoulder`, `Bip01_${b}_UpperArm`, `${m}Arm`],
    [`Bip01_${b}_UpperArm`, `${m}Arm`, `Bip01_${b}_Forearm`, `${m}ForeArm`],
    [`Bip01_${b}_Forearm`, `${m}ForeArm`, `Bip01_${b}_Hand`, `${m}Hand`],
    [`Bip01_${b}_Hand`, `${m}Hand`],
    [`Bip01_${b}_Thigh`, `${m}UpLeg`, `Bip01_${b}_Calf`, `${m}Leg`],
    [`Bip01_${b}_Calf`, `${m}Leg`, `Bip01_${b}_Foot`, `${m}Foot`],
    [`Bip01_${b}_Foot`, `${m}Foot`, `Bip01_${b}_Toe0`, `${m}ToeBase`],
  ]),
];

/** Rotation of `obj` relative to `root` (ignoring the root's own placement in the world). */
function relQuat(obj: THREE.Object3D, root: THREE.Object3D, out: THREE.Quaternion) {
  const rootQ = root.getWorldQuaternion(new THREE.Quaternion());
  return obj.getWorldQuaternion(out).premultiply(rootQ.invert());
}

function relPos(obj: THREE.Object3D, root: THREE.Object3D, out: THREE.Vector3) {
  return root.worldToLocal(obj.getWorldPosition(out));
}

/** Rotation taking a rig's body axes (left, up, forward) onto the standard frame (+x, +y, +z). */
function bodyBasis(root: THREE.Object3D, hips: THREE.Object3D, head: THREE.Object3D, leftThigh: THREE.Object3D, rightThigh: THREE.Object3D) {
  const up = relPos(head, root, new THREE.Vector3()).sub(relPos(hips, root, new THREE.Vector3())).normalize();
  const left = relPos(leftThigh, root, new THREE.Vector3()).sub(relPos(rightThigh, root, new THREE.Vector3()));
  left.addScaledVector(up, -left.dot(up)).normalize();
  const fwd = new THREE.Vector3().crossVectors(left, up);
  const m = new THREE.Matrix4().makeBasis(left, up, fwd);
  return new THREE.Quaternion().setFromRotationMatrix(m).invert();
}

export interface Retargeter {
  /** Call after the source has been animated for this frame. */
  update(): void;
}

/**
 * Both rigs must be in their rest (T-)pose when this is called.
 * `sourceRoot` / `targetRoot` are the loaded GLTF scenes.
 */
export function createRetargeter(sourceRoot: THREE.Object3D, targetRoot: THREE.Object3D): Retargeter | null {
  const find = (root: THREE.Object3D, name: string) => root.getObjectByName(name) ?? null;
  const pairs = PAIRS.map(([s, t, sc, tc]) => ({
    src: find(sourceRoot, s),
    tgt: find(targetRoot, t),
    srcChild: sc ? find(sourceRoot, sc) : null,
    tgtChild: tc ? find(targetRoot, tc) : null,
  })).filter((p): p is { src: THREE.Object3D; tgt: THREE.Object3D; srcChild: THREE.Object3D | null; tgtChild: THREE.Object3D | null } => !!p.src && !!p.tgt);
  const sHips = find(sourceRoot, "Bip01_Pelvis"), tHips = find(targetRoot, "Hips");
  const sHead = find(sourceRoot, "Bip01_Head"), tHead = find(targetRoot, "Head");
  const sFoot = find(sourceRoot, "Bip01_L_Foot"), tFoot = find(targetRoot, "LeftFoot");
  const sLT = find(sourceRoot, "Bip01_L_Thigh"), tLT = find(targetRoot, "LeftUpLeg");
  const sRT = find(sourceRoot, "Bip01_R_Thigh"), tRT = find(targetRoot, "RightUpLeg");
  if (pairs.length < 10 || !sHips || !tHips || !sHead || !tHead || !sFoot || !tFoot || !sLT || !tLT || !sRT || !tRT) return null;

  sourceRoot.updateMatrixWorld(true);
  targetRoot.updateMatrixWorld(true);

  // Express both rigs in one shared body frame.
  const toStdS = bodyBasis(sourceRoot, sHips, sHead, sLT, sRT);
  const toStdT = bodyBasis(targetRoot, tHips, tHead, tLT, tRT);
  const fromStdT = toStdT.clone().invert();

  // Direction a bone points at rest, in the target's frame.
  const restDir = (bone: THREE.Object3D, child: THREE.Object3D, root: THREE.Object3D, toTarget: THREE.Quaternion) =>
    relPos(child, root, new THREE.Vector3()).sub(relPos(bone, root, new THREE.Vector3())).normalize().applyQuaternion(toTarget);
  const srcToTgt = fromStdT.clone().multiply(toStdS);

  const rest = pairs.map(({ src, tgt, srcChild, tgtChild }) => {
    const tgtRest = relQuat(tgt, targetRoot, new THREE.Quaternion());
    // Swing the target's rest so the bone points where the source's does at rest (A-pose vs T-pose).
    if (srcChild && tgtChild) {
      const from = restDir(tgt, tgtChild, targetRoot, new THREE.Quaternion());
      const to = restDir(src, srcChild, sourceRoot, srcToTgt);
      tgtRest.premultiply(new THREE.Quaternion().setFromUnitVectors(from, to));
    }
    return { src, tgt, srcRestInv: relQuat(src, sourceRoot, new THREE.Quaternion()).invert(), tgtRest };
  });

  // Hip height: scale the source's movement to the target's size.
  const sHipsRest = relPos(sHips, sourceRoot, new THREE.Vector3());
  const tHipsRest = relPos(tHips, targetRoot, new THREE.Vector3());
  const sLeg = sHipsRest.distanceTo(relPos(sFoot, sourceRoot, new THREE.Vector3()));
  const tLeg = tHipsRest.distanceTo(relPos(tFoot, targetRoot, new THREE.Vector3()));
  const legScale = tLeg / (sLeg || 1);
  const tHipsRestLocal = tHips.position.clone();

  const q = new THREE.Quaternion();
  const parentQ = new THREE.Quaternion();
  const v = new THREE.Vector3();

  return {
    update() {
      sourceRoot.updateMatrixWorld(true);
      // Parents come before children in PAIRS, so each parent is already posed.
      for (const r of rest) {
        // Source change from rest, in the shared frame, then into the target's frame.
        relQuat(r.src, sourceRoot, q).multiply(r.srcRestInv);
        q.premultiply(toStdS).multiply(toStdS.clone().invert());
        q.premultiply(fromStdT).multiply(toStdT);
        // Desired target rotation (relative to its root), converted to the parent's local space.
        q.multiply(r.tgtRest);
        relQuat(r.tgt.parent!, targetRoot, parentQ);
        r.tgt.quaternion.copy(parentQ.invert().multiply(q));
        r.tgt.updateMatrixWorld(true);
      }

      // Move the hips (e.g. down into a seat) by the same amount, scaled to leg length.
      relPos(sHips, sourceRoot, v).sub(sHipsRest).applyQuaternion(toStdS).applyQuaternion(fromStdT).multiplyScalar(legScale);
      const worldTarget = targetRoot.localToWorld(tHipsRest.clone().add(v));
      tHips.position.copy(tHipsRestLocal);
      if (tHips.parent) tHips.position.copy(tHips.parent.worldToLocal(worldTarget));
    },
  };
}
