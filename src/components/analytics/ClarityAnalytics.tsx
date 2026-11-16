"use client";

import { useEffect, useRef } from "react";
import Clarity from "@microsoft/clarity";
import { useCitizen } from "@/lib/citizenStore";
import { useConsent } from "@/components/legal/CookieConsent";

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "z6tklcpz5o";

/** Microsoft Clarity, only once the player has accepted analytics cookies (CookieConsent). Withdrawing consent tells
    Clarity to stop, and nothing more is collected. */
export function ClarityAnalytics() {
  const initialized = useRef(false);
  const { citizen } = useCitizen();
  const consent = useConsent();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (consent === "analytics" && !initialized.current) {
      Clarity.init(CLARITY_PROJECT_ID);
      Clarity.consent(true);
      initialized.current = true;
    } else if (consent === "essential" && initialized.current) {
      try { Clarity.consent(false); } catch { /* not started */ }
    }
  }, [consent]);

  useEffect(() => {
    if (!citizen?.id || typeof window === "undefined" || consent !== "analytics") return;
    try {
      Clarity.identify(citizen.id, undefined, undefined, citizen.username || citizen.name);
    } catch {
      // Clarity may still be bootstrapping
    }
  }, [citizen?.id, citizen?.username, citizen?.name, consent]);

  return null;
}

