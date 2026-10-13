import { OnboardingShell } from "./OnboardingShell";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OnboardingShell />
      {children}
    </>
  );
}
