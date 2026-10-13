/** URL slug for each onboarding step, in order: /onboarding/<slug>. Shared by server routes and the client flow. */
export const ONBOARDING_STEPS = ["look", "personality", "dream", "birth-lottery", "home"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
