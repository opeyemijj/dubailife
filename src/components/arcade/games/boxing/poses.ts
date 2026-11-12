// Boxing arm poses for the avatar's live arm rig (ArmRig in CitizenAvatar): where each arm's upper arm and
// forearm point, as [up, forward, right] in the boxer's own frame, given for the right arm (the left is
// mirrored). The scene blends between them as punches extend and retract.

import type { ArmRig, BodyDir } from "@/components/avatar/CitizenAvatar";

export type ArmPose = { upper: BodyDir; fore: BodyDir };

export const POSE = {
  /** Hands up by the chin, elbows tucked. */
  guard: { upper: [-0.6, 0.5, 0.32], fore: [0.78, 0.42, -0.42] },
  /** Gloves together in front of the face. */
  block: { upper: [-0.25, 0.75, 0.22], fore: [0.92, 0.22, -0.3] },
  /** Straight punches at full extension. */
  extend: { upper: [0.08, 1, -0.06], fore: [0.08, 1, -0.06] },
  /** A body shot: driven low and forward into the ribs. */
  body: { upper: [-0.42, 0.9, -0.02], fore: [-0.22, 0.97, -0.08] },
  /** A hook at the moment it lands: elbow out, forearm sweeping across. */
  hook: { upper: [0.08, 0.4, 0.92], fore: [0.02, 0.75, -0.66] },
  /** An uppercut at the top: driving up and through. */
  upper: { upper: [-0.25, 0.85, 0.12], fore: [0.95, 0.3, -0.05] },
  /** Winding up a hook (the tell): drawn back and out. */
  windHook: { upper: [-0.45, -0.25, 0.85], fore: [0.35, 0.55, -0.25] },
  /** Winding up an uppercut: dropped low. */
  windUpper: { upper: [-0.95, 0.15, 0.25], fore: [-0.2, 0.9, -0.1] },
  /** Cocking a jab. */
  windJab: { upper: [-0.55, 0.15, 0.4], fore: [0.65, 0.65, -0.25] },
  /** Down and hurt: arms hanging. */
  limp: { upper: [-1, 0.05, 0.18], fore: [-0.95, 0.25, 0.05] },
  /** Arms raised in victory. */
  victory: { upper: [0.95, 0.15, 0.3], fore: [0.98, 0.05, 0.1] },
} satisfies Record<string, ArmPose>;

const lerp3 = (a: BodyDir, b: BodyDir, k: number): BodyDir => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const blend = (a: ArmPose, b: ArmPose, k: number): ArmPose => ({ upper: lerp3(a.upper, b.upper, k), fore: lerp3(a.fore, b.fore, k) });

/** How far out a punch is, 0..1..0, over its time: snaps out, holds a beat, comes back. */
export function punchCurve(p: number) {
  if (p < 0.4) { const k = p / 0.4; return 1 - (1 - k) * (1 - k); }
  if (p < 0.58) return 1;
  const k = (p - 0.58) / 0.42;
  return 1 - k * k;
}

/** Writes both arms into a rig (weight 1). */
export function setRig(rig: ArmRig, R: ArmPose, L: ArmPose) {
  rig.weight = 1;
  rig.R.upper = R.upper; rig.R.fore = R.fore;
  rig.L.upper = L.upper; rig.L.fore = L.fore;
}

export const newRig = (): ArmRig => ({ weight: 1, R: { ...POSE.guard }, L: { ...POSE.guard } });

// ---------------------------------------------------------------- legs: the stance, footwork and punching from the legs

/** What the legs are doing this frame (each 0..1 unless said): from the fight, the footwork and the punch. */
export interface LegDrive {
  /** Both knees bent: the stance's sit, deeper for an uppercut's dip, a body shot or a duck. */
  bend: number;
  /** The front (left) knee bending into a jab or hook; weight loaded onto one leg in a slip. */
  frontBend: number; loadL: number; loadR: number;
  /** The rear (right) leg driving a straight or a right hook: the knee turns in, the leg straightens. */
  rearDrive: number;
  /** Footwork: the step cycle (radians), how big the steps are, and which way (body frame: forward, right). */
  step: number; stepAmp: number; moveF: number; moveR: number;
}

/**
 * Where each thigh and shin point (body frame [up, forward, right], each leg's sideways outward; the left is
 * mirrored in the avatar): an orthodox stance, left foot forward, knees soft, the feet stepping the way the
 * boxer moves, knees lifting as each foot comes off the canvas, and the legs behind every punch.
 */
export function legPose(d: LegDrive): NonNullable<ArmRig["legs"]> {
  const leg = (front: boolean): { thigh: BodyDir; shin: BodyDir } => {
    const thigh: BodyDir = front ? [-0.94, 0.28, 0.14] : [-0.95, -0.2, 0.16];
    const shin: BodyDir = front ? [-0.98, 0.02, 0.06] : [-0.94, -0.32, 0.08];
    // Knees bending: the thigh comes forward and the shin goes back.
    const kb = d.bend + (front ? d.frontBend + d.loadL : d.loadR);
    thigh[1] += 0.32 * kb; shin[1] -= 0.4 * kb;
    // The rear leg driving through a punch: knee turned in, leg straighter.
    if (!front) { thigh[1] += 0.18 * d.rearDrive; shin[1] += 0.3 * d.rearDrive; thigh[2] -= 0.08 * d.rearDrive; }
    // Footwork: each foot swings the way they're going, the two half a step apart, the knee up as it leaves the floor.
    const sw = Math.sin(d.step + (front ? 0 : Math.PI)) * d.stepAmp;
    const lift = Math.max(0, sw);
    const sideways = front ? -d.moveR : d.moveR; // the left leg is mirrored
    thigh[1] += 0.3 * d.moveF * sw + 0.22 * lift;
    thigh[2] += 0.3 * sideways * sw;
    shin[1] -= 0.45 * lift;
    return { thigh, shin };
  };
  return { R: leg(false), L: leg(true) };
}
