"use client";

// The measuring overlay: each 3D scene's frame rate, slowest frame, draw calls, triangles and graphics memory, plus
// this device's strength score and graphics chip. Shown only when measuring is on (?perf=1; ?perf=0 hides it).

import { useState } from "react";
import { perfEnabled, usePerfScenes } from "@/lib/perf";
import { deviceScore, gpuName } from "@/lib/device";

export function PerfHud() {
  const [on] = useState(perfEnabled);
  return on ? <Hud /> : null;
}

function Hud() {
  const scenes = usePerfScenes();
  const [device] = useState(() => ({ score: deviceScore(), gpu: gpuName() }));
  const [small, setSmall] = useState(false);
  return (
    <button onClick={() => setSmall((v) => !v)} className="fixed right-1 top-[calc(env(safe-area-inset-top)+0.25rem)] z-[20000] rounded-lg bg-black/80 px-2 py-1 text-left font-mono text-[10px] leading-tight text-lime-300 pointer-events-auto">
      {small ? `${scenes[0]?.fps ?? "–"} fps` : (
        <>
          <div className="text-white/70">score {device.score} · {device.gpu.slice(0, 28) || "gpu ?"}</div>
          {scenes.length ? scenes.map((s) => (
            <div key={s.scene}>
              <span className="text-white">{s.scene}</span> {s.fps}fps worst {s.worstMs}ms · {s.calls} calls · {(s.triangles / 1000).toFixed(0)}k tris · {s.geometries}g/{s.textures}t · {s.dpr}x {s.width}×{s.height}
            </div>
          )) : <div>no 3D scene</div>}
        </>
      )}
    </button>
  );
}
