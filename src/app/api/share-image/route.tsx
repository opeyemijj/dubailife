import { ImageResponse } from "next/og";
import { isMoment, momentText } from "@/lib/share/moments";

// The picture behind a share link (/s/<moment>?u=…): built from a fixed template, so links can't carry
// arbitrary text.

export async function GET(request: Request) {
  const q = Object.fromEntries(new URL(request.url).searchParams);
  const m = isMoment(q.m ?? "") ? q.m! as Parameters<typeof momentText>[0] : "first-day";
  const t = momentText(m, q);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: `linear-gradient(150deg, ${t.from} 0%, ${t.to} 100%)`, color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 800, opacity: 0.85 }}>Come To Dubai · cometodubai.app</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 120 }}>{t.emoji}</div>
          <div style={{ fontSize: 66, fontWeight: 900, lineHeight: 1.1, marginTop: 12 }}>{t.title}</div>
          <div style={{ fontSize: 36, marginTop: 18, opacity: 0.9 }}>{t.sub}</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: "#fde68a" }}>Start your Dubai life free →</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}
