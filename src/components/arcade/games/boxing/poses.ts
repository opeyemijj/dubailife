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
