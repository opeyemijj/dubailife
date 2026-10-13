"use client";

// Renders modals at the top of the page so they always sit above the map, top bar, district bar
// and bottom navigation, whatever container opened them.

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};

export function ModalPortal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}
