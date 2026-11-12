import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dubai Life Academic City — University Degrees, AI & Career Courses",
  description:
    "Master high-income skills in real estate, AI engineering, finance, marketing, and business at Dubai Academic City in Dubai Life Game. Earn accredited in-game diplomas and career buffs.",
  alternates: { canonical: "/academics" },
  openGraph: {
    title: "Dubai Life Academic City — Degrees, AI & Career Courses",
    description:
      "Learn high-income skills in real estate, AI, and business at Dubai Academic City in Dubai Life Game.",
    url: "/academics",
  },
  twitter: {
    title: "Dubai Life Academic City — Degrees, AI & Career Courses",
    description: "Learn high-income skills in real estate, AI, and business at Dubai Academic City in Dubai Life Game.",
  },
};

export default function AcademicsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

