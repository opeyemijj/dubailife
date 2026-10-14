"use client";

// Surface textures drawn in code (no image downloads): floors, signage, menus and the skyline view.

import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();

function canvasTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  cache.set(key, t);
  return t;
}

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

export type FloorKind = "marble" | "wood" | "tiles" | "concrete" | "led" | "grass";

export function floorTexture(kind: FloorKind, base: string, size: [number, number]) {
  return canvasTexture(`floor:${kind}:${base}:${size}`, 512, 512, (ctx) => {
    const r = rng(7);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    if (kind === "marble") {
      // Large stone slabs with soft veins.
      // Light veins on light stone, faint ones on dark stone.
      const dark = parseInt(base.slice(1, 3), 16) < 90;
      ctx.strokeStyle = dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.35)";
      for (let i = 0; i < 26; i++) {
        ctx.lineWidth = 0.5 + r() * 2;
        ctx.beginPath();
        let x = r() * 512, y = r() * 512;
        ctx.moveTo(x, y);
        for (let k = 0; k < 6; k++) ctx.lineTo((x += (r() - 0.3) * 90), (y += (r() - 0.5) * 60));
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 2;
      for (let i = 0; i <= 512; i += 256) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
      }
    } else if (kind === "wood") {
      for (let row = 0; row < 8; row++) {
        let x = -r() * 200;
        while (x < 512) {
          const len = 140 + r() * 140;
          const shade = 0.85 + r() * 0.25;
          ctx.fillStyle = `rgba(${shade > 1 ? 255 : 0},${shade > 1 ? 255 : 0},${shade > 1 ? 255 : 0},${Math.abs(1 - shade) * 0.6})`;
          ctx.fillRect(x, row * 64, len, 64);
          ctx.fillStyle = "rgba(40,20,5,0.35)";
          ctx.fillRect(x, row * 64, 2, 64);
          x += len;
        }
        ctx.fillStyle = "rgba(40,20,5,0.3)";
        ctx.fillRect(0, row * 64, 512, 2);
      }
    } else if (kind === "tiles") {
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 3;
      for (let i = 0; i <= 512; i += 64) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
      }
    } else if (kind === "concrete") {
      for (let i = 0; i < 3000; i++) {
        ctx.fillStyle = `rgba(0,0,0,${r() * 0.05})`;
        ctx.fillRect(r() * 512, r() * 512, 2, 2);
      }
    } else if (kind === "grass") {
      for (let i = 0; i < 4000; i++) {
        ctx.fillStyle = `rgba(${20 + r() * 40},${90 + r() * 60},${20 + r() * 30},0.5)`;
        ctx.fillRect(r() * 512, r() * 512, 2, 4);
      }
    }
  }, size);
}

/** Store or venue name, as lettering for the back wall. */
export function signTexture(text: string, color: string, background: string | null, font = "600 92px 'Helvetica Neue', Arial, sans-serif") {
  return canvasTexture(`sign:${text}:${color}:${background}:${font}`, 1024, 192, (ctx) => {
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 1024, 192);
    }
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let size = 92;
    while (ctx.measureText(text.toUpperCase()).width > 960 && size > 30) {
      size -= 6;
      ctx.font = font.replace(/\d+px/, `${size}px`);
    }
    ctx.fillText(text.toUpperCase(), 512, 100);
  });
}

/** Chalkboard-style menu listing items and prices. */
export function menuTexture(title: string, items: Array<{ name: string; price: number }>) {
  return canvasTexture(`menu:${title}:${items.map((i) => i.name).join()}`, 512, 640, (ctx) => {
    ctx.fillStyle = "#1c1917";
    ctx.fillRect(0, 0, 512, 640);
    ctx.strokeStyle = "#a16207";
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 500, 628);
    ctx.fillStyle = "#fef3c7";
    ctx.font = "700 40px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(title.toUpperCase(), 256, 70);
    ctx.font = "26px Georgia, serif";
    items.slice(0, 9).forEach((it, i) => {
      const y = 140 + i * 54;
      ctx.textAlign = "left";
      ctx.fillText(it.name.length > 24 ? it.name.slice(0, 23) + "…" : it.name, 36, y);
      ctx.textAlign = "right";
      ctx.fillText(String(it.price), 476, y);
    });
  });
}

/** Downtown at dusk, seen through floor-to-ceiling windows. */
export function skylineTexture() {
  return canvasTexture("skyline", 1024, 512, (ctx) => {
    const r = rng(42);
    const sky = ctx.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, "#1e3a8a");
    sky.addColorStop(0.5, "#f97316");
    sky.addColorStop(0.75, "#fde68a");
    sky.addColorStop(1, "#fef3c7");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 70; i++) {
      const w = 12 + r() * 40, h = 40 + r() * 220, x = r() * 1024;
      ctx.fillStyle = `rgba(30,41,59,${0.55 + r() * 0.4})`;
      ctx.fillRect(x, 512 - h, w, h);
      ctx.fillStyle = "rgba(254,240,138,0.7)";
      for (let k = 0; k < h / 14; k++) if (r() < 0.35) ctx.fillRect(x + 3 + r() * (w - 8), 512 - h + k * 14 + 4, 3, 4);
    }
    // A slender tapering tower in the distance.
    ctx.fillStyle = "rgba(15,23,42,0.9)";
    ctx.beginPath();
    ctx.moveTo(500, 512); ctx.lineTo(560, 512); ctx.lineTo(534, 40); ctx.lineTo(530, 0); ctx.lineTo(526, 40);
    ctx.closePath();
    ctx.fill();
  });
}

export const mat = {
  chrome: () => new THREE.MeshStandardMaterial({ color: "#e5e7eb", metalness: 1, roughness: 0.18 }),
  gold: () => new THREE.MeshStandardMaterial({ color: "#d4af37", metalness: 1, roughness: 0.25 }),
  glass: () => new THREE.MeshPhysicalMaterial({ color: "#e0f2fe", metalness: 0, roughness: 0.05, transmission: 0.9, transparent: true, opacity: 0.35, thickness: 0.02 }),
  mirror: () => new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 1, roughness: 0.02 }),
};

/** In-venue digital LED wall advertisement screen */
export function wallAdScreenTexture(headline: string, sponsor: string, badge?: string) {
  return canvasTexture(`wallad:${headline}:${sponsor}:${badge}`, 1024, 576, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 1024, 576);
    grad.addColorStop(0, "#090d16");
    grad.addColorStop(0.5, "#0f172a");
    grad.addColorStop(1, "#1e1b4b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 576);

    ctx.strokeStyle = "rgba(245, 158, 11, 0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= 1024; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 576); ctx.stroke();
    }
    for (let y = 0; y <= 576; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
    }

    // Top Header Badge
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.roundRect(40, 36, 280, 44, 22);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.font = "bold 20px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⭐ " + (badge || "VENUE ADVERTISING"), 180, 58);

    // Live LED Indicator
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(960, 58, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("LIVE WALL AD", 938, 58);

    // Sponsor Name
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 28px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(sponsor.toUpperCase(), 44, 150);

    // Headline (wrapped)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px 'Helvetica Neue', Arial, sans-serif";
    const words = headline.split(" ");
    let line = "";
    let y = 220;
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      if (ctx.measureText(testLine).width > 920 && i > 0) {
        ctx.fillText(line, 44, y);
        line = words[i] + " ";
        y += 56;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 44, y);

    // Bottom interactive button callout
    ctx.fillStyle = "#eab308";
    ctx.beginPath();
    ctx.roundRect(44, 480, 400, 60, 16);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 22px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TAP SCREEN TO REDEEM ➜", 244, 510);
  });
}
