// Development only: babies in a home without a family (a newborn put in a bed, a crawler and a toddler on the
// floor, and me carrying one), to check the poses in a browser. ?carry=lie|sit. Production builds answer 404.

import { notFound } from "next/navigation";
import { BabiesPreview } from "./BabiesPreview";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  return <BabiesPreview carry={q.carry === "sit" ? "sit" : "lie"} tier={q.tier ?? "one_bedroom"} view={q.view === "inside" ? "inside" : q.view === "eye" ? "eye" : "above"} />;
}
