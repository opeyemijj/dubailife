// Development only: a house party to measure (?tier=villa&guests=8&decor=all&perf=1). Production builds answer 404.
import { notFound } from "next/navigation";
import { PartyPreview } from "./PartyPreview";
export default async function Page({ searchParams }: { searchParams: Promise<{ tier?: string; guests?: string; decor?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  return <PartyPreview tier={q.tier ?? "villa"} guests={Number(q.guests ?? 8)} decor={q.decor ?? "all"} />;
}
