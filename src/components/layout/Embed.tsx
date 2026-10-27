"use client";

// Pages opened inside the in-game phone run in a frame. There, the app's own bars, pop-ups and listeners
// stay hidden (the page around the phone already has them), and anything that leads into the 3D city
// (the map, a place, a home, a game) closes the phone and opens there instead.

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";

const noSubscribe = () => () => {};
const framed = () => window.self !== window.top;

/** True inside the in-game phone's frame. */
export const useEmbedded = () => useSyncExternalStore(noSubscribe, framed, () => false);

/** Renders its children only in the main window, not inside the phone. */
export function OutsidePhone({ children }: { children: React.ReactNode }) {
  return useEmbedded() ? null : <>{children}</>;
}

/** Routes that can't live in the phone: they open full screen behind it. */
const OUTSIDE = /^\/($|explore|place|property|games|driving|home|onboarding|\?)/;
export const NAVIGATE = "dubai:navigate";

function leave(href: string) {
  window.parent.postMessage({ type: NAVIGATE, href }, window.location.origin);
}

/** Inside the phone: hands city links to the main window. Mounted once in the root layout. */
export function EmbedBridge() {
  const embedded = useEmbedded();
  const pathname = usePathname();
  const router = useRouter();

  // Links: caught before they navigate the frame.
  useEffect(() => {
    if (!embedded) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest("a");
      const href = a?.getAttribute("href");
      if (!a || !href || !href.startsWith("/") || a.target === "_blank") return;
      if (!OUTSIDE.test(href)) return;
      e.preventDefault();
      e.stopPropagation();
      leave(href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [embedded]);

  // Navigation done in code (router.push) lands here: send it out and step back.
  useEffect(() => {
    if (!embedded || !OUTSIDE.test(pathname)) return;
    leave(pathname + window.location.search);
    router.back();
  }, [embedded, pathname, router]);

  return null;
}
