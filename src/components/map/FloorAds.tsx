import React from 'react';
import type { LiveBillboardAd } from './Icons';
import { CELL, ROWS, SECTIONS, blockedCells, houseAdsFor, mosaicBlocks, type SectionKey } from '@/lib/city/floorMosaic';

// Floor ads: flat panels laid on the ground between the roads, in the map's tilted view (the same
// slant as the floor tiles). Each shows its booked image, or an "Ad space" placeholder when free.

/**
 * Unified project ground isometry (strictly matching FloorTile):
 * - Depth slant: dx = 0.2355 * dy (skewX(-13.25deg), features lean right by 0.2355 × depth as they recede)
 * - Baseline tilt: dy = 0.01667 * dx (skewY(0.955deg), ground tilts down to the right with slope 1/60)
 * Combining both gives the exact ground affine transform matrix: matrix(1, 0.01667, -0.2355, 1, 0, 0).
 */
export const FLOOR_ISOMETRY = 'matrix(1, 0.01667, -0.2355, 1, 0, 0)';

export function FloorAdTile({ width = 90, height = 64, campaigns, name }: { width?: number; height?: number; campaigns?: Array<Pick<LiveBillboardAd, 'id' | 'title' | 'creative_url'>>; name?: string }) {
  const ad = campaigns?.[0];
  const wide = width > height * 1.4;
  return (
    <div
      style={{ width, height, transform: FLOOR_ISOMETRY, transformOrigin: 'center' }}
      className="relative rounded-md overflow-hidden border-2 border-white shadow-[0_3px_0_#64748b,0_4px_8px_rgba(0,0,0,0.35)] bg-gradient-to-br from-slate-800 to-slate-950"
      aria-label={ad ? `Sponsored: ${ad.title}` : name ?? 'Floor ad space'}
    >
      {ad ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.creative_url} alt={ad.title} className="w-full h-full object-cover" loading="lazy" draggable={false} />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-center leading-tight bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.04)_0_8px,transparent_8px_16px)]">
          <span className="text-amber-300 font-black tracking-wider" style={{ fontSize: wide ? 13 : 10 }}>AD SPACE</span>
          <span className="text-white/70 font-bold" style={{ fontSize: wide ? 9 : 7 }}>Tap · 7 days</span>
        </div>
      )}
      {ad && <span className="absolute top-0.5 left-0.5 bg-black/60 text-white font-black uppercase rounded px-1" style={{ fontSize: 6 }}>Ad</span>}
    </div>
  );
}

// ---------------------------------------------------------------- the mosaic

/**
 * One stretch of the floor-ad mosaic: faint grid lines on the sand between the roads, with ad blocks of
 * every size packed flush against each other. Booked blocks show their brand's image; free big blocks
 * show house ads for Dubai Life; free small blocks are light tiles; single cells are just the grid.
 * Each block (and each grid cell) is tappable — the map reads `data-ad-block` from the tap.
 */
export function FloorMosaic({ section, ads }: { section: SectionKey; ads?: Record<string, Array<Pick<LiveBillboardAd, 'id' | 'title' | 'creative_url'>>> }) {
  const blocks = mosaicBlocks(section);
  const cols = SECTIONS.find((s) => s.key === section)!.cols;
  const W = cols * CELL, H = ROWS * CELL;
  const tiles = ['#fefce8', '#f0f9ff', '#fdf2f8', '#f0fdf4', '#f5f3ff', '#fff7ed'];
  const house = houseAdsFor(section);
  // The grid, row by row, in runs of cells — broken wherever a billboard or the causeway stands.
  const blocked = blockedCells(section);
  const runs: Array<[number, number, number]> = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      if (blocked.has(`${c},${r}`)) continue;
      const last = runs[runs.length - 1];
      if (last && last[0] === r && last[2] === c) last[2] = c + 1; else runs.push([r, c, c + 1]);
    }
  }
  return (
    <div style={{ width: W, height: H, transform: FLOOR_ISOMETRY, transformOrigin: 'center' }} className="relative select-none" data-ad-grid={section}>
      {runs.map(([r, a, b]) => (
        <div key={`${r}-${a}`} className="absolute pointer-events-none"
          style={{ left: a * CELL, top: r * CELL, width: (b - a) * CELL, height: CELL, backgroundColor: '#7fb2d6', backgroundImage: 'linear-gradient(#cfe2f1 1.5px, transparent 1.5px), linear-gradient(90deg, #cfe2f1 1.5px, transparent 1.5px)', backgroundSize: `${CELL}px ${CELL}px` }} />
      ))}
      {blocks.map((b) => {
        const ad = ads?.[b.id]?.[0];
        if (!ad && b.w * b.h === 1) return null;
        const h = ad ? null : house.get(b.id) ?? null;
        const px = { left: b.c * CELL + 1.5, top: b.r * CELL + 1.5, width: b.w * CELL - 3, height: b.h * CELL - 3 };
        const font = Math.min(px.height * 0.2, px.width * 0.11);
        return (
          <div key={b.id} data-ad-block={b.id} className="absolute overflow-hidden rounded-[2px] cursor-pointer" style={{ ...px, background: ad ? '#0f172a' : h ? h.bg : tiles[(b.c * 7 + b.r * 3) % tiles.length] }}>
            {ad ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.creative_url} alt={ad.title} className="w-full h-full object-cover pointer-events-none" loading="lazy" draggable={false} />
            ) : h ? (
              <div className="w-full h-full flex flex-col justify-center px-[6%] pointer-events-none" style={{ color: h.fg }}>
                <div style={{ fontSize: font * 1.3, lineHeight: 1 }}>{h.icon}</div>
                <div className="font-black leading-[1.05]" style={{ fontSize: font }}>{h.title}</div>
                <div className="font-bold opacity-80 leading-tight" style={{ fontSize: font * 0.55 }}>{h.sub}</div>
                <div className="mt-[4%] h-[3px] w-1/3 rounded-full" style={{ background: h.accent }} />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center pointer-events-none text-slate-300 font-black" style={{ fontSize: Math.min(px.height, px.width) * 0.3 }}>AD</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
