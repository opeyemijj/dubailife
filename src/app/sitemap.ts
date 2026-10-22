import type { MetadataRoute } from "next";
import { PLACES } from "@/lib/city/places";
import { GAMES } from "@/lib/games/registry";
import { SITE } from "@/lib/site";

// Every indexable public page: city landmarks, venues, arcade games, courses and businesses.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE.url}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${SITE.url}/business`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/academics`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/scam-check`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/tournament/rules`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  // Games in Game City (high-intent SEO landing pages)
  for (const game of GAMES) {
    pages.push({
      url: `${SITE.url}/games/${game.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }

  // City Landmarks & Venues
  for (const place of PLACES) {
    if (place.kind === "residential" || place.kind === "home") continue;
    pages.push({
      url: `${SITE.url}/place/${place.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
    if (place.venues.length > 1) {
      for (const v of place.venues) {
        if (v.comingSoon) continue;
        pages.push({
          url: `${SITE.url}/place/${place.id}/${v.id}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  }

  return pages;
}
