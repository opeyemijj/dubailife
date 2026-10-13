"use client";

import React, { Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { SmallLoader } from "@/components/GameLoadingScreen";
import { LandingOverlay } from "@/components/landing/LandingOverlay";
import { ModalPortal } from "@/components/ui/modal-portal";
import { placeForEntity } from "@/lib/city/places";
import { useCitizen, signOut } from "@/lib/citizenStore";

const InteractiveMap = dynamic(
  () => import("@/components/map/InteractiveMap").then((mod) => mod.InteractiveMap),
  { ssr: false, loading: () => <SmallLoader label="Loading Dubai" /> }
);

function HomeContent() {
  const router = useRouter();
  const { isLoggedIn, citizen } = useCitizen();

  // Guests look around freely; tapping a place invites them to join to go inside.
  const [guestPlace, setGuestPlace] = React.useState<{ name: string; icon: string; billboard?: boolean } | null>(null);
  const handleAttemptInteract = (loc?: { id: string; type: string; name?: string }) => {
    if (isLoggedIn) return;
    if (!loc) { router.push("/?signup=true", { scroll: false }); return; }
    const billboard = /billboard/.test(loc.type);
    const place = billboard ? null : placeForEntity(loc);
    setGuestPlace({
      billboard,
      name: billboard ? "this billboard" : place?.name ?? loc.name ?? "this place",
      icon: billboard ? "📣" : place?.kind === "club" ? "🪩" : place?.kind === "hotel" ? "🏨" : place?.kind === "mall" ? "🛍️" : place?.kind === "residential" ? "🏙️" : place?.kind === "park" ? "🌴" : "📍",
    });
  };

  return (
    <main className="fixed inset-0 h-[100dvh] w-screen bg-[#d6bc8a] overflow-hidden select-none touch-none overscroll-none font-sans">
      {/* 2D Isometric City Map in Background: Interaction locked until user signs in */}
      <InteractiveMap
        hideTopHUD={true}
        interactionDisabled={!isLoggedIn}
        onAttemptInteract={handleAttemptInteract}
      />

      {guestPlace && !isLoggedIn && (
        <ModalPortal>
          <div className="fixed inset-0 z-[160] flex items-end justify-center" role="dialog" aria-modal="true">
            <div className="absolute inset-0" onClick={() => setGuestPlace(null)} aria-hidden />
            <div className="relative w-full max-w-lg bg-white text-slate-900 rounded-t-3xl shadow-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 animate-in slide-in-from-bottom-8 duration-300">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-1" />
              <div className="flex items-center gap-3">
                <span className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-3xl">{guestPlace.icon}</span>
                <h2 className="text-xl font-black leading-tight">{guestPlace.billboard ? "Advertise here" : `Go to ${guestPlace.name}`}</h2>
              </div>
              <p className="text-slate-600">{guestPlace.billboard
                ? "Create your Dubai Life to advertise on this billboard and reach real players exploring the city."
                : `Create your Dubai Life to hang out at ${guestPlace.name}, meet real players and chat.`}</p>
              <button onClick={() => { setGuestPlace(null); router.push("/?signup=true", { scroll: false }); }} className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg shadow-lg shadow-emerald-500/25">Create your Dubai Life · free</button>
              <button onClick={() => { setGuestPlace(null); router.push("/?login=true", { scroll: false }); }} className="w-full h-12 rounded-2xl border border-slate-200 font-bold">I have an account · Log in</button>
            </div>
          </div>
        </ModalPortal>
      )}

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
    <Suspense fallback={<SmallLoader label="Loading Dubai" />}>
      <HomeContent />
    </Suspense>
  );
}
