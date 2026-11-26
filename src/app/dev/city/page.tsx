// Development only: a city's map without signing in (?city=abu-dhabi). Production builds answer 404.
import { notFound } from "next/navigation";
import { CityPreview } from "./CityPreview";
export default async function Page({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  return <CityPreview city={q.city === "dubai" ? "dubai" : "abu-dhabi"} />;
}
