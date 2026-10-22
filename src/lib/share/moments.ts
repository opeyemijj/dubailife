// Share-card templates (src/data/share/moments.json) and the safe parsing of a share link's query.

import MOMENTS from "@/data/share/moments.json";

export type MomentId = keyof typeof MOMENTS.moments;
export const isMoment = (m: string): m is MomentId => m in MOMENTS.moments;

/** Reads ?u=&v=&l= safely: usernames are 3–24 of a-z0-9_, values whole numbers, labels from a fixed list. */
export function momentText(moment: MomentId, q: { u?: string; v?: string; l?: string }) {
  const m = MOMENTS.moments[moment];
  const u = /^[a-z0-9_]{3,24}$/.test(q.u ?? "") ? q.u! : "someone";
  const v = /^\d{1,9}$/.test(q.v ?? "") ? Number(q.v).toLocaleString("en-US") : "";
  const labels = (MOMENTS.labels as Record<string, Record<string, string>>)[moment] ?? {};
  const label = labels[q.l ?? ""] ?? "";
  const fill = (s: string) => s.replace("{u}", u).replace("{v}", v).replace("{label}", label);
  return { ...m, title: fill(m.title), sub: fill(m.sub), user: u === "someone" ? null : u };
}
