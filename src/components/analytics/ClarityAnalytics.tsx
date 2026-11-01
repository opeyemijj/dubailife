"use client";

import { useEffect, useRef } from "react";
import Clarity from "@microsoft/clarity";
import { useCitizen } from "@/lib/citizenStore";

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "z6tklcpz5o";

export function ClarityAnalytics() {
  const initialized = useRef(false);
  const { citizen } = useCitizen();

  useEffect(() => {
    if (initialized.current || typeof window === "undefined") return;
    Clarity.init(CLARITY_PROJECT_ID);
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (!citizen?.id || typeof window === "undefined") return;
    try {
      Clarity.identify(citizen.id, undefined, undefined, citizen.username || citizen.name);
    } catch {
      // Clarity may still be bootstrapping
    }
  }, [citizen?.id, citizen?.username, citizen?.name]);

  return null;
}

