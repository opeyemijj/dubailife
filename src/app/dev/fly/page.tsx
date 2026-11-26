// Development only: the flight journey at a step (?stage=checkin|passport|dutyfree|gate|flight&inside=1&t=30).
import { notFound } from "next/navigation";
import { FlyPreview } from "./FlyPreview";
export default async function Page({ searchParams }: { searchParams: Promise<{ stage?: string; inside?: string; t?: string; to?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  return <FlyPreview stage={q.stage ?? "checkin"} inside={q.inside === "1"} t={Number(q.t ?? 0)} to={q.to === "dubai" ? "dubai" : "abu-dhabi"} />;
}
