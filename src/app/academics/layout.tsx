import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dubai Academic City — Courses, Skills & Certifications",
  description:
    "Learn high-income skills in real estate, marketing, AI, and business at Dubai Academic City in Dubai Life. Earn certificates and advance your career.",
  alternates: { canonical: "/academics" },
  openGraph: {
    title: "Dubai Academic City — Courses, Skills & Certifications - Dubai Life",
    description:
      "Learn high-income skills in real estate, marketing, AI, and business at Dubai Academic City in Dubai Life. Earn certificates and advance your career.",
    url: "/academics",
  },
};

export default function AcademicsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

