import type { MetadataRoute } from "next";
import { PLACES } from "@/lib/city/places";
import { GAMES } from "@/lib/games/registry";
import { SITE } from "@/lib/site";
import { WIKI_HUBS } from "@/components/wiki/WikiData";
import { ACADEMIC_CAMPUSES, ACADEMIC_COURSES } from "@/lib/city/academic";

// Every indexable public page: city landmarks, venues, wiki guides, arcade games, courses, and driving academy.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE.url}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${SITE.url}/wiki`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE.url}/wiki/places`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE.url}/guide`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE.url}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/feedback`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/marathon`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE.url}/driving`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE.url}/tournament`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE.url}/tournament/rules`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/academics`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE.url}/business`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/scam-check`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.url}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  // Official Dubai Life Wiki Guides (/wiki/[slug])
  for (const hub of WIKI_HUBS) {
    pages.push({
      url: `${SITE.url}/wiki/${hub.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }

  // Games in Game City (high-intent SEO landing pages)
  for (const game of GAMES) {
    pages.push({
      url: `${SITE.url}/games/${game.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }

  // Academic Campuses & Universities
  for (const campus of Object.values(ACADEMIC_CAMPUSES)) {
    pages.push({
      url: `${SITE.url}/academics/${campus.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Academic Courses & Degrees
  for (const course of ACADEMIC_COURSES) {
    pages.push({
      url: `${SITE.url}/academics/course/${course.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
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
