import { VenueRoute } from "@/components/interior/VenueRoute";

export default async function PlacePage({ params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = await params;
  return <VenueRoute placeId={placeId} />;
}
