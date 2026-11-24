// Development only: the Royal Pearl superyacht with a party on deck (?night=1, ?view=above|inside|eye|boat|drone).
// Production builds answer 404.
import { notFound } from "next/navigation";
import { YachtPreview } from "./YachtPreview";
export default async function Page({ searchParams }: { searchParams: Promise<{ night?: string; view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  return <YachtPreview night={q.night === "1"} view={q.view ?? "boat"} />;
}
