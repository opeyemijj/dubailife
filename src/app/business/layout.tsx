import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dubai Life Business — 3D Billboard Advertising & Brand Sponsorships",
  description:
    "Promote your real brand inside Dubai Life Game (mydubailife.app). Place 3D virtual billboards, claim sponsored venues, and reach thousands of digital citizens exploring 3D Dubai.",
  alternates: { canonical: "/business" },
  openGraph: {
    title: "Dubai Life Business — 3D Advertising & Virtual Sponsorships",
    description:
      "Promote your real brand inside Dubai Life Game. Place 3D virtual billboards, host branded venues, and reach players.",
    url: "/business",
  },
  twitter: {
    title: "Dubai Life Business — 3D Advertising & Virtual Sponsorships",
    description:
      "Promote your real brand inside Dubai Life Game.",
  },
};

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

