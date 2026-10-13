// Public site details shared by metadata, the manifest, the sitemap and structured data.

export const SITE = {
  name: "Dubai Life",
  shortName: "Dubai Life",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dubailife.vercel.app").replace(/\/$/, ""),
  tagline: "Live your Dubai life online",
  description:
    "Dubai Life is a free virtual Dubai you play in your browser. Create your 3D citizen, explore Burj Khalifa, The Dubai Mall and Downtown, shop, party in clubs, rent an apartment and meet real people.",
  themeColor: "#1e1b4b",
  backgroundColor: "#0f0a2e",
  keywords: [
    "Dubai Life", "virtual Dubai", "Dubai game", "Dubai life simulator", "online life simulation game", "3D avatar game",
    "browser game", "metaverse Dubai", "Burj Khalifa game", "Dubai Mall virtual tour", "Downtown Dubai", "social game",
    "meet people online", "virtual nightclub", "virtual apartment", "life simulation", "UAE game",
  ],
};
