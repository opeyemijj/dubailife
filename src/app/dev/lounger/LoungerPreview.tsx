"use client";

import { useEffect, useState } from "react";
import { ApartmentRoom } from "@/components/home/ApartmentRoom";
import { HOUSING_CONFIGS } from "@/lib/furniture";

export function LoungerPreview() {
  const [call, setCall] = useState<{ n: number; what: "pool" } | undefined>(undefined);
  const [using, setUsing] = useState<string | undefined>(undefined);
  const [focus, setFocus] = useState<{ n: number; at: [number, number] } | undefined>(undefined);
  useEffect(() => { const t = setTimeout(() => { setCall({ n: 1, what: "pool" }); setFocus({ n: 1, at: [13.2, -1.4] }); }, 3000); return () => clearTimeout(t); }, []);
  return (
    <main className="fixed inset-0">
      <ApartmentRoom housingTier="villa" view="inside" homeStyle={{ ...HOUSING_CONFIGS.villa.finish, exterior: ["pool", "garden"] }}
        groundsCall={call} onUseFixture={(f) => setUsing(f.id)} using={using} activity="sunbathe" focus={focus} />
    </main>
  );
}
