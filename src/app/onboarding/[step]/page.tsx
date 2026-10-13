import { ONBOARDING_STEPS } from "@/lib/onboardingSteps";

// One URL per onboarding step (/onboarding/look … /onboarding/home); anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return ONBOARDING_STEPS.map((step) => ({ step }));
}

// The flow itself is rendered by the layout so it persists across steps.
export default function OnboardingStepPage() {
  return null;
}
