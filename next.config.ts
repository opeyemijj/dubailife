import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Long-term immutable caching for 3D GLTF models, textures, animations & fonts so they never drain mobile network.
  async headers() {
    return [
      {
        source: "/:all*(glb|gltf|bin|hdr|webp|png|jpg|jpeg|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  // The app moved from cometodubai.app to mydubailife.app: old links and bookmarks redirect permanently.
  async redirects() {
    return ["cometodubai.app", "www.cometodubai.app"].map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://mydubailife.app/:path*",
      permanent: true,
    }));
  },
};

export default nextConfig;
