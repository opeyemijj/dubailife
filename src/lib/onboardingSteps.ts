/** URL slug for each onboarding step, in order: /onboarding/<slug>. Shared by server routes and the client flow. */
export const ONBOARDING_STEPS = ["look", "personality", "dream", "your-dubai", "home"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
