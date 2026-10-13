"use client";

import React, { Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { SmallLoader } from "@/components/GameLoadingScreen";
import { LandingOverlay } from "@/components/landing/LandingOverlay";
import { useCitizen, signOut } from "@/lib/citizenStore";

const InteractiveMap = dynamic(
  () => import("@/components/map/InteractiveMap").then((mod) => mod.InteractiveMap),
  { ssr: false, loading: () => <SmallLoader label="Loading Downtown Dubai" /> }
);

function HomeContent() {
  const router = useRouter();
  const { isLoggedIn, citizen } = useCitizen();

  const handleAttemptInteract = () => {
    if (!isLoggedIn) router.push("/?signup=true", { scroll: false });
  };

  return (
    <main className="relative h-screen w-screen bg-[#d6bc8a] overflow-hidden select-none touch-none overscroll-none font-sans">
      {/* 2D Isometric City Map in Background: Interaction locked until user signs in */}
      <InteractiveMap
        hideTopHUD={true}
        interactionDisabled={!isLoggedIn}
        onAttemptInteract={handleAttemptInteract}
      />

      {/* Top bar, pills, bottom card, and the sign-up / log-in / age modals (opened via the URL) */}
      <LandingOverlay
        isLoggedIn={isLoggedIn}
        citizen={citizen}
        onLogout={signOut}
      />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<SmallLoader label="Loading Downtown Dubai" />}>
      <HomeContent />
    </Suspense>
  );
}
