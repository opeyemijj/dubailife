"use client";

import { useState } from "react";
import { TowerArrival } from "@/components/property/TowerArrival";

export function TowerPreview({ floor }: { floor: number }) {
  const [done, setDone] = useState(false);
  if (done) return <main className="fixed inset-0 grid place-items-center bg-emerald-900 text-white font-black" data-arrived="1">At the door</main>;
  return <TowerArrival floor={floor} unit={`Apt ${floor}04`} tower="Marina Heights" look={{ gender: "woman" }} onDone={() => setDone(true)} />;
}
