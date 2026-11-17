"use client";

import dynamic from "next/dynamic";
import { shopOf } from "@/lib/cars";

const Showroom = dynamic(() => import("@/components/cars/Showroom").then((m) => m.Showroom), { ssr: false });

export function ShowroomPreview({ id }: { id: string }) {
  const shop = shopOf(id);
  return shop ? <Showroom shop={shop} /> : <p className="p-6">No dealer {id}</p>;
}
