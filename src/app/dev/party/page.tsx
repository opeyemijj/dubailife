// Development only: a house party to measure (?tier=villa&guests=8&decor=all&perf=1), or a home to look round
// (?tier=mansion&guests=0&decor=none&level=1&up=1&view=inside). Production builds answer 404.
import { notFound } from "next/navigation";
import { PartyPreview } from "./PartyPreview";
export default async function Page({ searchParams }: { searchParams: Promise<{ tier?: string; guests?: string; decor?: string; level?: string; up?: string; view?: string; room?: string; dist?: string; cars?: string; anim?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  return <PartyPreview tier={q.tier ?? "villa"} guests={Number(q.guests ?? 8)} decor={q.decor ?? "all"} level={Number(q.level ?? 0)} up={q.up === "1"} view={q.view} room={q.room} dist={q.dist ? Number(q.dist) : undefined} cars={Number(q.cars ?? 0)} anim={q.anim} />;
}
