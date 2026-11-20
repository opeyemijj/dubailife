"use client";

// One race at Dubai Autodrome (components/racing/RaceRoom: any sport's race works here too).

import { use } from "react";
import { RaceRoom } from "@/components/racing/RaceRoom";

export default function RacePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <RaceRoom code={code} />;
}
