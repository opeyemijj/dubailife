import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore 3D Dubai City Map — Dubai Life Game",
  description:
    "Explore the 3D virtual city of Dubai in the official Dubai Life Game. Walk through Downtown Dubai, visit Burj Khalifa, Dubai Mall, DIFC, JBR beaches, and Game City in your browser with zero downloads.",
  alternates: { canonical: "/explore" },
  openGraph: {
    title: "Explore 3D Dubai City Map — Dubai Life Game",
    description:
      "Explore the 3D virtual city of Dubai in the official Dubai Life Game. Walk through Downtown Dubai, visit Burj Khalifa, Dubai Mall, DIFC, JBR beaches, and Game City in your browser with zero downloads.",
    url: "/explore",
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

