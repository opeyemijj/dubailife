// Quick courses' data (src/data/academy/quick-courses.json) and the activities that open them: plain data, safe on the
// server (place pages) and the client. Enrolling and the quiz are lib/academy/quick.

import QUICK from "@/data/academy/quick-courses.json";
import type { VenueActivity } from "@/lib/city/types";
import type { SkillId } from "@/lib/life";

export interface QuickCourse {
  id: string; city: string; place: string; title: string; icon: string; minutes: number; fee: number; skill: SkillId; xp: number;
  lessons: { title: string; points: string[] }[];
  quiz: { q: string; options: string[]; answer: number }[];
}
export const QUICK_COURSES = QUICK.courses as QuickCourse[];
export const QUICK_MIN_SECONDS = QUICK.minSeconds;
export const quickCourse = (id: string) => QUICK_COURSES.find((c) => c.id === id) ?? null;

/** A campus's quick courses, as venue activities that open the course page. */
export const quickCourseActivities = (placeId: string): VenueActivity[] =>
  QUICK_COURSES.filter((c) => c.place === placeId).map((c) => ({
    id: `quick:${c.id}`, label: `Quick course: ${c.title} · ${c.minutes} min · AED ${c.fee}`, icon: c.icon, href: `/academy/quick/${c.id}`,
  }));
