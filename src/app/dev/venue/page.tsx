// Development only: any place's venue in 3D, without signing in (?place=ad-yas-mall&venue=0). Production builds
// answer 404.
import { notFound } from "next/navigation";
import { VenuePreview } from "./VenuePreview";
export default async function Page({ searchParams }: { searchParams: Promise<{ place?: string; venue?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  return <VenuePreview place={q.place ?? "ad-yas-mall"} index={Number(q.venue ?? 0)} />;
}
