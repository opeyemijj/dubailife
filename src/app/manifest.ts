import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Lets people install Dubai Life to their home screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: SITE.backgroundColor,
    theme_color: SITE.themeColor,
    categories: ["games", "social", "entertainment", "lifestyle"],
    lang: "en",
    dir: "ltr",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/brand/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/brand/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Explore the city", short_name: "Map", url: "/explore", icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }] },
      { name: "My phone", short_name: "Phone", url: "/phone", icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }] },
      { name: "Wallet", short_name: "Wallet", url: "/wallet", icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
