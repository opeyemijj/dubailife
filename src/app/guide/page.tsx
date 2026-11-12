import type { Metadata } from "next";
import { WikiView } from "@/components/wiki/WikiView";

export const metadata: Metadata = {
  title: "Dubai Life Starter Guide — How to Play & Virtual Dubai Manual",
  description:
    "Official beginner's manual for Dubai Life Game (mydubailife.app). Learn how to create your 3D avatar, move into luxury penthouses, earn AED, drive supercars, and explore Dubai in your browser.",
  alternates: { canonical: "/guide" },
  openGraph: {
    title: "Dubai Life Starter Guide — Official Game Manual",
    description:
      "Beginner guide and gameplay manual for Dubai Life Game. Free 3D multiplayer simulator in your browser.",
    url: "/guide",
  },
  twitter: {
    title: "Dubai Life Starter Guide — Official Game Manual",
    description: "Beginner guide and gameplay manual for Dubai Life Game.",
  },
};

export default function GuidePage() {
  return <WikiView />;
}
