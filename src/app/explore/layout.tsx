import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Downtown Dubai & 3D Interactive City Map",
  description:
    "Explore the 3D virtual city of Dubai. Walk through Downtown, visit Burj Khalifa, Dubai Mall, DIFC, beaches, and Game City in your browser on Dubai Life.",
  alternates: { canonical: "/explore" },
  openGraph: {
    title: "Explore Downtown Dubai & 3D Interactive City Map - Dubai Life",
    description:
      "Explore the 3D virtual city of Dubai. Walk through Downtown, visit Burj Khalifa, Dubai Mall, DIFC, and beaches in your browser on Dubai Life.",
    url: "/explore",
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

