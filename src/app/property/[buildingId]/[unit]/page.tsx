import { PropertyRoute } from "@/components/property/PropertyRoute";

export default async function PropertyPage({ params }: { params: Promise<{ buildingId: string; unit: string }> }) {
  const { buildingId, unit } = await params;
  return <PropertyRoute buildingId={buildingId} unit={decodeURIComponent(unit)} />;
}
