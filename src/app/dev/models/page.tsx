// Development only: the racing mounts side by side (?sprites=1: the map sprites). Production builds answer 404.
import { notFound } from "next/navigation";
import { ModelsPreview } from "./ModelsPreview";
import { CamelTrackSprite, MeydanSprite } from "@/components/map/RacingSprites";
export default async function Page({ searchParams }: { searchParams: Promise<{ sprites?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  if ((await searchParams).sprites) return <div style={{ display: "flex", gap: 24, padding: 24, background: "#d8c49a" }}><MeydanSprite /><CamelTrackSprite /></div>;
  return <ModelsPreview />;
}
