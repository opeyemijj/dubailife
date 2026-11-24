"use client";
// Development only: every green plain where the map puts it (centred, y flipped as on the map), scaled to fit.
import { FloorTile } from "@/components/map/FloorTile";
import { CITY_ENTITIES } from "@/lib/city/mapEntities";
import { getBuildingSprite, IsometricDubaiVilla, VillaLite } from "@/components/map/Icons";

export function Plains({ scale = 0.16 }: { scale?: number }) {
  const tiles = CITY_ENTITIES.filter((e) => e.type === "floor-tile" && !/bur-dubai|deira/.test(e.id));
  const racing = CITY_ENTITIES.filter((e) => ["racecourse", "camel-track", "race-circuit", "bike-circuit"].includes(e.type));
  const X0 = -2200, Y0 = 1500;
  return (
    <div style={{ position: "relative", width: 9000 * scale, height: 4200 * scale, background: "#d8c49a", transform: `scale(1)`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        {tiles.map((t) => (
          <div key={t.id} style={{ position: "absolute", left: t.virtualX - X0 - t.width / 2, top: 2600 - t.virtualY - (2600 - Y0) - t.height / 2 + 1200 }}>
            <FloorTile width={t.width} height={t.height} name={t.name} color={t.color} showGrid={t.showGrid} showLabel={t.showLabel !== false} />
          </div>
        ))}
        {racing.map((t) => (
          <div key={t.id} style={{ position: "absolute", left: t.virtualX - X0 - t.width / 2, top: 2600 - t.virtualY - (2600 - Y0) - t.height * 0.9 + 1200 }}>
            {getBuildingSprite(t.id, t.type, 0, t.name, t)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The villa as drawn now beside its light version, big and at the Palm's size. */
export function VillaCompare() {
  const sig = { wallColor: "#fffbeb", accentColor: "#c08a3e", hasPalm: true, plotColor: "#fde68a" };
  const plain = { wallColor: "#f5f5f4", accentColor: "#a8a29e", hasPalm: false, plotColor: "#fde68a" };
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 30, padding: 30, background: "#38bdf8" }}>
      <IsometricDubaiVilla width={380} height={300} {...sig} /><VillaLite width={380} height={300} {...sig} />
      <IsometricDubaiVilla width={50} height={39} {...sig} /><VillaLite width={50} height={39} {...sig} />
      <IsometricDubaiVilla width={50} height={39} {...plain} /><VillaLite width={50} height={39} {...plain} />
    </div>
  );
}
