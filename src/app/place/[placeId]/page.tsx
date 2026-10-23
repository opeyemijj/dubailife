import type { Metadata } from "next";
import { VenueRoute } from "@/components/interior/VenueRoute";
import { getPlace } from "@/lib/city/places";
import { SITE } from "@/lib/site";

type Params = { params: Promise<{ placeId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { placeId } = await params;
  const place = getPlace(placeId);
  if (!place) return { title: "Place not found", robots: { index: false } };
  const title = `${place.name} — Virtual Dubai 3D Experience`;
  const description = `${place.blurb} Explore ${place.name}${place.venues.length > 1 ? `, with ${place.venues.length} places inside,` : ""} in 3D on Dubai Life (cometodubai.app), the free virtual Dubai simulator in your browser.`.slice(0, 300);
  const url = `/place/${placeId}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} - Dubai Life`, description, url },
    twitter: { title: `${title} - Dubai Life`, description },
  };
}

export default async function PlacePage({ params }: Params) {
  const { placeId } = await params;
  const place = getPlace(placeId);
  return (
    <>
      {place && (
        <section className="sr-only">
          <h1>{place.name}</h1>
          <p>{place.blurb}</p>
          {place.venues.length > 1 && <ul>{place.venues.map((v) => <li key={v.id}>{v.name} — {v.category}</li>)}</ul>}
        </section>
      )}
      <VenueRoute placeId={placeId} />
    </>
  );
}
