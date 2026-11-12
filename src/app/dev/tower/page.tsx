// Development only: the tower lift (lobby, call, floor panel, ride, corridor) without a flat. ?floor=24.
// Production builds answer 404.

import { notFound } from "next/navigation";
import { TowerPreview } from "./TowerPreview";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  return <TowerPreview floor={Number(q.floor ?? 24)} />;
}
