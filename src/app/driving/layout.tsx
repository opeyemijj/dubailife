import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dubai Life Driving Academy — RTA License & Theory Test Simulator",
  description:
    "Pass your virtual RTA theory test, eye reflex exam, and Smart Yard parking test in Dubai Life Game. Earn your official in-game driver's license to unlock luxury supercars.",
  alternates: { canonical: "/driving" },
  openGraph: {
    title: "Dubai Life Driving Academy — RTA License & Theory Test Simulator",
    description:
      "Pass your virtual RTA theory test and Smart Yard parking test in Dubai Life Game. Earn your driver's license to unlock luxury supercars.",
    url: "/driving",
  },
  twitter: {
    title: "Dubai Life Driving Academy — RTA License & Theory Test Simulator",
    description:
      "Pass your virtual RTA theory test and Smart Yard parking test in Dubai Life Game.",
  },
};

export default function DrivingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
