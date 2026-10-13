import type { Metadata } from "next";
import { VenueRoute } from "@/components/interior/VenueRoute";
import { getPlace, getVenue } from "@/lib/city/places";
import { SITE } from "@/lib/site";

type Params = { params: Promise<{ placeId: string; venueId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { placeId, venueId } = await params;
  const place = getPlace(placeId);
  const venue = getVenue(placeId, venueId);
  if (!place || !venue) return { title: "Place not found", robots: { index: false } };
  const where = place.venues.length > 1 ? ` at ${place.name}` : "";
  const title = `${venue.name}${where} — visit in virtual Dubai`;
  const description = `Walk into ${venue.name}${where} in 3D: ${venue.blurb} Shop, meet real players and hang out in ${SITE.name}, a free virtual Dubai in your browser.`.slice(0, 300);
  const url = `/place/${placeId}/${venueId}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url }, twitter: { title, description } };
}

export default async function VenuePage({ params }: Params) {
  const { placeId, venueId } = await params;
  const place = getPlace(placeId);
  const venue = getVenue(placeId, venueId);
  return (
    <>
      {/* Readable summary for search engines and screen readers; the 3D venue renders on top. */}
      {place && venue && (
        <section className="sr-only">
          <h1>{venue.name}{place.venues.length > 1 ? ` · ${place.name}` : ""}</h1>
          <p>{venue.category}. {venue.blurb}</p>
          {venue.products.length > 0 && (
            <ul>{venue.products.slice(0, 20).map((p) => <li key={p.id}>{p.name} — {p.desc}</li>)}</ul>
          )}
        </section>
      )}
      <VenueRoute placeId={placeId} venueId={venueId} />
    </>
  );
}
