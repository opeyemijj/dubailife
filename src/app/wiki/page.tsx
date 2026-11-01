import type { Metadata } from "next";
import { WikiView } from "@/components/wiki/WikiView";

export const metadata: Metadata = {
  title: "Dubai Life Wiki · How to play",
  description:
    "The official Dubai Life guide: how to play in 5 minutes, the Visa Ladder, Sustainability Blueprint, every venue and career, 3D Metro & RTA driving, multiplayer co-op, Syndicate Wars, and scam prevention.",
};

export default function WikiHomePage() {
  return <WikiView />;
}

