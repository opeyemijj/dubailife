"use client";

// Inside a 3D scene's Canvas: measures it (frame times, what each frame draws, graphics memory) once a second, for
// the measuring overlay (lib/perf). Renders nothing, and does nothing at all unless measuring is turned on.

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { perfEnabled, reportScene } from "@/lib/perf";

export function PerfProbe({ scene }: { scene: string }) {
  const [on] = useState(perfEnabled);
  return on ? <Probe scene={scene} /> : null;
}

function Probe({ scene }: { scene: string }) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const accRef = useRef({ frames: 0, worst: 0, since: 0 });
  useFrame((_, dt) => {
    const acc = accRef.current;
    const now = performance.now();
    if (!acc.since) acc.since = now;
    acc.frames++;
    acc.worst = Math.max(acc.worst, dt * 1000);
    if (now - acc.since < 1000) return;
    // The renderer's counts are for the last frame drawn (they reset as each frame starts).
    const info = gl.info;
    reportScene({
      scene, fps: Math.round((acc.frames * 1000) / (now - acc.since)), worstMs: Math.round(acc.worst),
      calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures,
      dpr: Math.round(dpr * 100) / 100, width: Math.round(size.width), height: Math.round(size.height), at: Date.now(),
    });
    acc.frames = 0; acc.worst = 0; acc.since = now;
  });
  return null;
}
