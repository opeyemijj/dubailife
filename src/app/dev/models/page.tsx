// Development only: the racing mounts side by side (?sprites=1: the map sprites). Production builds answer 404.
import { notFound } from "next/navigation";
import { ModelsPreview } from "./ModelsPreview";
import { CamelTrackSprite, MeydanSprite } from "@/components/map/RacingSprites";
import { DubaiCourtsSprite, HospitalSprite } from "@/components/map/OldDubaiSprites";
export default async function Page({ searchParams }: { searchParams: Promise<{ sprites?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  if ((await searchParams).sprites) return <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 24, padding: 24, background: "#d8c49a" }}><DubaiCourtsSprite width={300} height={210} /><HospitalSprite width={200} height={200} /><MeydanSprite /><CamelTrackSprite /></div>;
  return <ModelsPreview />;
}
