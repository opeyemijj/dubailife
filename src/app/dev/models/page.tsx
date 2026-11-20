// Development only: the racing mounts side by side (?sprites=1: the map sprites). Production builds answer 404.
import { notFound } from "next/navigation";
import { ModelsPreview } from "./ModelsPreview";
import { Plains } from "./Plains";
import { BikeCircuitSprite, CamelTrackSprite, CarCircuitSprite, MeydanSprite } from "@/components/map/RacingSprites";
import { DubaiCourtsSprite } from "@/components/map/OldDubaiSprites";
export default async function Page({ searchParams }: { searchParams: Promise<{ sprites?: string; plains?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  if (q.plains) return <Plains />;
  if (q.sprites) return <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 24, padding: 24, background: "#d8c49a" }}><CarCircuitSprite width={400} height={220} /><MeydanSprite width={400} height={220} /><CamelTrackSprite width={400} height={220} /><BikeCircuitSprite width={400} height={220} /><DubaiCourtsSprite width={300} height={210} /></div>;
  return <ModelsPreview />;
}
