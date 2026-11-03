"use client";

// Clean screen: a page hiding its buttons for the whole view also hides the app-wide floating bits (the live Space
// bar). It marks the page (<html data-clean>) and those hide themselves with the `dl-hide-clean` class.

import { useEffect } from "react";

export function useCleanScreen(on: boolean) {
  useEffect(() => {
    if (!on) return;
    document.documentElement.dataset.clean = "1";
    return () => { delete document.documentElement.dataset.clean; };
  }, [on]);
}
