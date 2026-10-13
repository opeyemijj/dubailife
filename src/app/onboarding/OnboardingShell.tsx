"use client";

import { Suspense } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { SmallLoader } from "@/components/GameLoadingScreen";
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboardingSteps";

/** Renders the flow for the step in the URL. Lives in the layout so the 3D avatar stays mounted between steps. */
export function OnboardingShell() {
  const segment = useSelectedLayoutSegment();
  const step = ONBOARDING_STEPS.find((s) => s === segment) as OnboardingStep | undefined;
  if (!step) return null;
  return (
    <Suspense fallback={<SmallLoader label="Creating your citizen" />}>
      <OnboardingFlow step={step} />
    </Suspense>
  );
}
