"use client";

// The bottom bar on pages that are mostly reading (the wiki, the guide, About, Credits, Privacy, Terms), so the way
// round the game is always there, with room left under the page so it covers nothing.

import { BottomNav } from "@/components/layout/BottomNav";

export function UniversalNav() {
  return (
    <>
      <div className="h-28" aria-hidden />
      <BottomNav />
    </>
  );
}
