"use client";

// Babies at home (src/app/home, ApartmentRoom): a parent carries their baby cradled in both arms (round the house,
// upstairs too) and puts them down in a bed, on a chair or sofa, or on the floor. Left on the floor, a crawler
// crawls about and a toddler toddles about near where they were put down: the wandering is worked out from the
// clock and the child, so both parents' screens show the baby in the same place without sending anything.

import { useRef } from "react";
import { CitizenAvatar, type ArmRig } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";

/** Both arms in a cradle: upper arms down by the sides and a little forward, forearms across the body. */
const CRADLE: ArmRig = {
  weight: 1,
  R: { upper: [-0.82, 0.45, 0.14], fore: [0.12, 0.6, -0.79] },
  L: { upper: [-0.82, 0.45, 0.14], fore: [0.12, 0.6, -0.79] },
};
export const useCradleRig = () => useRef<ArmRig | null>(CRADLE);

/** How big a child is, as a share of a grown-up: about a third at birth, growing each day. */
export const babyScale = (days: number) => Math.min(0.75, 0.3 + days * 0.007);

export type BabyPose = "lie" | "sit" | "crawl" | "walk";

/** What a child does at this stage: a newborn lies, then sits up, crawls, and walks. */
export function poseFor(stageId: string): BabyPose {
  if (stageId === "newborn") return "lie";
  if (stageId === "sitting") return "sit";
  if (stageId === "crawling") return "crawl";
  return "walk";
}

/** The baby in a parent's arms: a newborn lying across them, an older baby sitting up on the forearm. */
export function CarriedBaby({ look, days, pose }: { look?: AvatarLookProps; days: number; pose: BabyPose }) {
  // Held, a baby is a little smaller than standing (tucked in).
  const s = Math.min(0.42, babyScale(days));
  if (pose === "lie") {
    // Lying across the forearms, face up, head in the crook of the left arm: the body laid along -x (outer
    // turn), turned on its own axis so the face points up (inner turn), and centred on the parent's chest.
    const length = 1.7 * s;
    return (
      <group position={[length / 2, 1.14, 0.3]} rotation={[0, 0, Math.PI / 2]}>
        <group rotation={[0, -Math.PI / 2, 0]} scale={s}>
          <CitizenAvatar look={look} animation="sleep" />
        </group>
      </group>
    );
  }
  // Sitting up on the right forearm, against the chest, facing out.
  return (
    <group position={[0.12, 0.99, 0.27]} scale={s}>
      <CitizenAvatar look={look} animation="sit" />
    </group>
  );
}

/**
 * Where a crawler or toddler on the floor is right now: a few steps about where they were put down, a new spot
 * every few seconds. The same on every screen (it's from the clock and the child), and close to the start, so
 * they stay in the room.
 */
export function wanderFrom(childId: number, at: [number, number], now: number, pose: BabyPose, bounds: number): [number, number] {
  if (pose !== "crawl" && pose !== "walk") return at;
  const every = pose === "crawl" ? 7000 : 5000;
  const n = Math.floor(now / every);
  const r = pose === "crawl" ? 0.9 : 1.4;
  const hash = (k: number) => { const x = Math.sin(childId * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  const a = hash(n) * Math.PI * 2, d = 0.3 + hash(n + 101) * r;
  const clamp = (v: number) => Math.max(-bounds, Math.min(bounds, v));
  return [clamp(at[0] + Math.cos(a) * d), clamp(at[1] + Math.sin(a) * d)];
}
