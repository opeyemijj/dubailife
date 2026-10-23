import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
