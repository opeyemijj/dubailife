"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { CitizenAvatar, StudioEnvironment } from "@/components/avatar/CitizenAvatar";
import { outfitById } from "@/components/avatar/roster";

const IDS = ["mat_wrap_dress", "mat_white_maxi", "mat_shower_gown"];

export function MaternityPreview() {
  return (
    <main className="fixed inset-0 bg-slate-200">
      <Canvas camera={{ position: [2.2, 1.1, 3.6], fov: 38 }} onCreated={({ camera }) => camera.lookAt(0, 0.95, 0)}>
        <color attach="background" args={["#e2e8f0"]} />
        <StudioEnvironment intensity={0.6} />
        <directionalLight position={[2, 4, 3]} intensity={2} />
        <Suspense fallback={null}>
          {IDS.map((id, i) => {
            const o = outfitById(id)!;
            return (
              <group key={id} position={[(i - 1) * 0.85, 0, 0]} rotation={[0, i === 1 ? -0.9 : 0.3, 0]}>
                <CitizenAvatar look={{ gender: "woman", wear: id, primaryColor: o.defaultPrimaryColor, secondaryColor: o.defaultSecondaryColor, pregnantWeeks: 3 }} animation="idle" />
              </group>
            );
          })}
        </Suspense>
      </Canvas>
    </main>
  );
}
