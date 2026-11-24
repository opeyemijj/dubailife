"use client";

// Inside a 3D scene's Canvas: lets the 📸 button photograph it. Renders one frame and copies it straight away into a
// JPEG (at most 1080 px wide), which works without keeping the drawing buffer (no cost to the scene the rest of the time).

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { registerSnap } from "@/lib/snap";

export function SnapProbe() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => registerSnap(() => new Promise((resolve) => {
    try {
      gl.render(scene, camera);
      const src = gl.domElement;
      const k = Math.min(1, 1080 / Math.max(1, src.width));
      const c = document.createElement("canvas");
      c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
      c.getContext("2d")?.drawImage(src, 0, 0, c.width, c.height);
      c.toBlob((b) => resolve(b), "image/jpeg", 0.86);
    } catch { resolve(null); }
  })), [gl, scene, camera]);
  return null;
}
