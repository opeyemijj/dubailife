import type { Metadata } from "next";
import { PropertyRoute } from "@/components/property/PropertyRoute";

export async function generateMetadata({ params }: { params: Promise<{ buildingId: string; unit: string }> }): Promise<Metadata> {
  const { buildingId, unit } = await params;
  const decodedUnit = decodeURIComponent(unit);
  const buildingName = buildingId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const title = `${buildingName} Unit ${decodedUnit} — Virtual Property`;
  const description = `Tour ${buildingName} Unit ${decodedUnit} inside Dubai Life (cometodubai.app). Explore luxury apartments, meet citizens, and customize virtual homes in 3D.`;
  return {
    title,
    description,
    openGraph: { title: `${title} - Dubai Life`, description },
    twitter: { title: `${title} - Dubai Life`, description },
  };
}

export default async function PropertyPage({ params }: { params: Promise<{ buildingId: string; unit: string }> }) {
  const { buildingId, unit } = await params;
  return <PropertyRoute buildingId={buildingId} unit={decodeURIComponent(unit)} />;
}
