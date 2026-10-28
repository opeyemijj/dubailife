"use client";

import dynamic from "next/dynamic";
import { useRequireCitizen } from "@/lib/citizenStore";
import { shopOf } from "@/lib/cars";
import { SmallLoader } from "@/components/GameLoadingScreen";

// The 3D showroom loads in the browser only.
const Showroom = dynamic(() => import("./Showroom").then((m) => m.Showroom), { ssr: false, loading: () => <SmallLoader label="Opening the showroom" /> });

export function CarShop({ id }: { id: string }) {
  const { citizen } = useRequireCitizen();
  const shop = shopOf(id);
  if (!citizen || !shop) return <SmallLoader label="Opening the showroom" />;
  return <Showroom shop={shop} />;
}
