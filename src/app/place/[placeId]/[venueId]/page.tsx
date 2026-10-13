import { VenueRoute } from "@/components/interior/VenueRoute";

export default async function VenuePage({ params }: { params: Promise<{ placeId: string; venueId: string }> }) {
  const { placeId, venueId } = await params;
  return <VenueRoute placeId={placeId} venueId={venueId} />;
}
