"use client";
// Development only: the racing mounts side on, against a 1 m grid, to line up riders and saddles.
import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { BikeModel, CamelModel, HorseModel, type Motion } from "@/components/racing/Mounts";

export function ModelsPreview() {
  const q = typeof window !== "undefined" ? new URLSearchParams(location.search) : null;
  const speed = Number(q?.get("v") ?? 0);
  const motion = useRef<Motion>({ speed, lean: Number(q?.get("lean") ?? 0) });
  const silks = { body: "#dc2626", trim: "#facc15" };
  const view = q?.get("view") ?? "side";
  return <div style={{ position: "fixed", inset: 0, background: "#bcd" }}>
    <Canvas camera={{ position: view === "side" ? [9, 1.4, 0] : [0, 1.6, -6], fov: 40 }} onCreated={({ camera }) => camera.lookAt(0, 1.1, 0)}>
      <hemisphereLight args={["#fff", "#886", 1]} /><directionalLight position={[5, 6, 3]} intensity={2} />
      <gridHelper args={[10, 10]} rotation={[0, 0, Math.PI / 2]} position={[-1.5, 0, 0]} />
      <gridHelper args={[10, 10]} />
      <Suspense fallback={null}>
        <group position={[0, 0, -3.2]}><HorseModel coat="#5b3018" mane="#120c08" silks={silks} number={3} motion={motion} /></group>
        <group position={[0, 0, 0.4]}><CamelModel coat="#c9a066" silks={silks} number={5} motion={motion} /></group>
        <group position={[0, 0, 3.6]}><BikeModel color="#2563eb" silks={silks} number={7} motion={motion} /></group>
      </Suspense>
    </Canvas></div>;
}
