// Body stats from the gym: strength, stamina and flexibility, 0 to 100. Kept on the citizen (profiles.citizen.body)
// like skills, built by gym stations (src/components/arcade/games/gym) and fading slowly after a week without
// training. Boxing reads them: stamina raises your stamina pool and recovery, strength your punch power.

import GYM from "@/data/arcade/gym.json";
import { updateCitizen, type Citizen } from "@/lib/citizenStore";

export type BodyStat = "strength" | "stamina" | "flexibility";
export interface BodyStats { strength: number; stamina: number; flexibility: number; lastTrained?: string }

const DAY = 86_400_000;
const ZERO: BodyStats = { strength: 0, stamina: 0, flexibility: 0 };

/** Stats now, after any fade for days without training. */
export function bodyOf(c: Pick<Citizen, "body"> | null | undefined, now = Date.now()): BodyStats {
  const b = { ...ZERO, ...(c?.body ?? {}) };
  if (!b.lastTrained) return b;
  const idle = Math.floor((now - Date.parse(b.lastTrained)) / DAY) - GYM.idleDays;
  if (idle <= 0) return b;
  const fade = idle * GYM.fadePerDay;
  return { ...b, strength: Math.max(0, b.strength - fade), stamina: Math.max(0, b.stamina - fade), flexibility: Math.max(0, b.flexibility - fade) };
}

/** Adds a session's gain to one stat (after applying any fade, so a comeback starts from where you are). */
export function trainBody(stat: BodyStat, gain: number): BodyStats {
  let out: BodyStats = ZERO;
  updateCitizen((c) => {
    const now = bodyOf(c);
    out = { ...now, [stat]: Math.min(100, now[stat] + gain), lastTrained: new Date().toISOString() };
    return { ...c, body: out };
  });
  return out;
}

/** What body stats do in a boxing match: up to +25% stamina and +20% punch power at 100. */
export const boxingBonus = (b: BodyStats) => ({ stamina: 1 + (b.stamina / 100) * 0.25, power: 1 + (b.strength / 100) * 0.2 });
