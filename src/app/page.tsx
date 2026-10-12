"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { LandingOverlay } from "@/components/landing/LandingOverlay";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

const InteractiveMap = dynamic(
  () => import("@/components/map/InteractiveMap").then((mod) => mod.InteractiveMap),
  { ssr: false }
);

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [citizen, setCitizen] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    try {
      const logged = localStorage.getItem("dubai_logged_in") === "true";
      const citizenRaw = localStorage.getItem("dubai_citizen");
      if (logged && citizenRaw) {
        setIsLoggedIn(true);
        setCitizen(JSON.parse(citizenRaw));
      } else {
        setIsLoggedIn(false);
      }
    } catch {}

    // Auto-open signup modal if requested by query param (?signup=true or ?auth=true)
    if (searchParams.get("signup") === "true" || searchParams.get("auth") === "true") {
      setAuthModalOpen(true);
    }
  }, [searchParams]);

  const handleStartOnboarding = (userData: any) => {
    setPendingUserData(userData);
    setIsOnboarding(true);
  };

  const handleAttemptInteract = () => {
    if (!isLoggedIn) {
      setAuthModalOpen(true);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("dubai_logged_in");
    } catch {}
    setIsLoggedIn(false);
    setCitizen(null);
  };

  return (
    <main className="relative h-screen w-screen bg-[#d6bc8a] overflow-hidden select-none touch-none overscroll-none font-sans">
      {/* 2D Isometric City Map in Background: Interaction locked until user signs in */}
      <InteractiveMap 
        hideTopHUD={true}
        interactionDisabled={!isLoggedIn}
        onAttemptInteract={handleAttemptInteract}
      />

      {/* Onboarding Wizard (Look, Personality, Dream, Birth Lottery, Home) */}
      {isOnboarding ? (
        <OnboardingFlow 
          initialUserData={pendingUserData} 
          onComplete={() => router.push("/home")} 
        />
      ) : (
        /* First Visit Landing Overlay: Top bar, pills, bottom floating box, sign up & age confirmation modals */
        <LandingOverlay 
          isLoggedIn={isLoggedIn}
          citizen={citizen}
          onLogout={handleLogout}
          forceOpenAuth={authModalOpen}
          onCloseAuth={() => setAuthModalOpen(false)}
          onStartOnboarding={handleStartOnboarding} 
        />
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#d6bc8a]" />}>
      <HomeContent />
    </Suspense>
  );
}
