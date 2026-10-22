import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Share-card images must stay reachable for link previews.
        allow: ["/", "/api/share-image"],
        // Signed-in and private areas.
        disallow: ["/admin", "/business/edit", "/api/", "/auth/", "/onboarding", "/phone", "/wallet", "/profile", "/home", "/property/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
