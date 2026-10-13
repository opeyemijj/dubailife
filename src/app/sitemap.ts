import type { MetadataRoute } from "next";
import { PLACES } from "@/lib/city/places";
import { SITE } from "@/lib/site";

// Every public page: the city, each building and every venue inside.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/business`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
  for (const place of PLACES) {
    if (place.kind === "residential" || place.kind === "home") continue;
    pages.push({ url: `${SITE.url}/place/${place.id}`, lastModified: now, changeFrequency: "weekly", priority: 0.8 });
    if (place.venues.length > 1) {
      for (const v of place.venues) {
        if (v.comingSoon) continue;
        pages.push({ url: `${SITE.url}/place/${place.id}/${v.id}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 });
      }
    }
  }
  return pages;
}
