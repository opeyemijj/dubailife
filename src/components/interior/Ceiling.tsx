"use client";

// The ceiling, shown in Eye view (looking up indoors shows a roof, not sky): a plain ceiling with a soft glow and a
// grid of recessed downlights. It doesn't catch taps or cast shadows.

import { useMemo } from "react";

export function Ceiling({ w, d, h, color = "#f5f5f4" }: { w: number; d: number; h: number; color?: string }) {
  const lights = useMemo(() => {
    const out: Array<[number, number]> = [];
    const nx = Math.max(1, Math.round(w / 3)), nz = Math.max(1, Math.round(d / 3));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) out.push([-w / 2 + (i + 0.5) * (w / nx), -d / 2 + (j + 0.5) * (d / nz)]);
    return out;
  }, [w, d]);
  return (
    <group position={[0, h, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={color} roughness={0.95} emissive={color} emissiveIntensity={0.08} />
      </mesh>
      {lights.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, -0.01, z]} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
          <circleGeometry args={[0.12, 16]} />
          <meshBasicMaterial color="#fffbeb" />
        </mesh>
      ))}
    </group>
  );
}
