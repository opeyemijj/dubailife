import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The picture shown when a cometodubai.app link is shared (WhatsApp, X, iMessage, Facebook…).
export const alt = "Come To Dubai (cometodubai.app) — Free 3D Virtual City & Life Simulator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const icon = await readFile(join(process.cwd(), "public/brand/icon-512.png"));
  const src = `data:image/png;base64,${icon.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", padding: 80, background: "linear-gradient(160deg, #1e1b4b 0%, #7c3aed 55%, #ec4899 85%, #f59e0b 100%)", color: "white", fontFamily: "sans-serif" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={300} height={300} style={{ borderRadius: 64, boxShadow: "0 30px 60px rgba(0,0,0,0.35)" }} alt="" />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 64, maxWidth: 680 }}>
          <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 1 }}>Come To Dubai</div>
          <div style={{ fontSize: 32, marginTop: 14, color: "#38bdf8", fontWeight: 800 }}>cometodubai.app</div>
          <div style={{ fontSize: 28, marginTop: 20, opacity: 0.9, lineHeight: 1.35 }}>Explore Burj Khalifa & The Dubai Mall in 3D, party in clubs, rent an apartment and meet real players. Free in your browser.</div>
        </div>
      </div>
    ),
    size,
  );
}
