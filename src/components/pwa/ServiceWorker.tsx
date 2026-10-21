"use client";

import { useEffect } from "react";

/** Registers the service worker so the app can be installed, receive push notifications, and load fast. */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        // Check for updates periodically
        if (reg && "update" in reg) {
          reg.update().catch(() => {});
        }
      } catch (err) {
        // Silently catch registration errors
      }
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
