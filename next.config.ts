import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers & long-term immutable caching for 3D GLTF models, textures, animations & fonts
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
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
  // The app moved from cometodubai.app to mydubailife.app: old links and bookmarks redirect permanently (301).
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
