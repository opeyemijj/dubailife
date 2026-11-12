import type { Metadata } from "next";
import { WikiView } from "@/components/wiki/WikiView";

export const metadata: Metadata = {
  title: "Dubai Life Game Wiki & Player Guide · How to Play Online",
  description:
    "The official Dubai Life Game Wiki & player guide: gameplay mechanics, how to play in 5 minutes, 3D avatar customization, visas, careers, real estate, and multiplayer games at mydubailife.app.",
};

export default function WikiHomePage() {
  return <WikiView />;
}

