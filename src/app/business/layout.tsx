import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business & 3D Advertising",
  description:
    "Grow your brand inside Come To Dubai. Place 3D virtual billboards, host branded venues, and reach thousands of digital citizens exploring Dubai.",
  alternates: { canonical: "/business" },
  openGraph: {
    title: "Business & 3D Advertising - Come To Dubai",
    description:
      "Grow your brand inside Come To Dubai. Place 3D virtual billboards, host branded venues, and reach thousands of digital citizens exploring Dubai.",
    url: "/business",
  },
};

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

