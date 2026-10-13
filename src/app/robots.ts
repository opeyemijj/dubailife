import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Signed-in and private areas.
        disallow: ["/admin", "/business/edit", "/api/", "/auth/", "/onboarding", "/phone", "/wallet", "/profile", "/home", "/property/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
