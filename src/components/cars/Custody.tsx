"use client";

// In custody after an arrest: a holding cell over every page until the time is up, a lawyer takes the case
// (they get you out on bail) or you pay bail yourself. The case itself goes on in the Dubai Police app.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCitizen } from "@/lib/citizenStore";
import { payBail, useServices } from "@/lib/cityServices";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { ModalPortal } from "@/components/ui/modal-portal";
import CARS from "@/data/cars/cars.json";

export function Custody() {
  const { citizen } = useCitizen();
  const s = useServices(citizen?.id);
  const pathname = usePathname();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const held = s?.cases.find((c) => c.status === "open" && c.jailUntil && Date.parse(c.jailUntil) > now);
  // The phone stays usable (to call a lawyer); the page under it is the cell.
  if (!held || pathname.startsWith("/phone")) return null;
  const left = Date.parse(held.jailUntil!) - now;
  const h = Math.floor(left / 3_600_000), m = Math.floor((left % 3_600_000) / 60_000), sec = Math.floor((left % 60_000) / 1000);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[160] bg-slate-900 text-white flex items-center justify-center p-6">
        {/* the bars */}
        <div className="absolute inset-0 flex justify-evenly pointer-events-none opacity-60" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => <div key={i} className="w-3 h-full bg-gradient-to-r from-slate-500 via-slate-300 to-slate-600 shadow-[4px_0_12px_rgba(0,0,0,0.6)]" />)}
        </div>
        <div className="relative max-w-sm w-full bg-slate-950/90 rounded-[28px] p-6 text-center space-y-4 shadow-2xl border border-white/10">
          <div className="text-5xl">🔒</div>
          <h2 className="text-2xl font-black">You&apos;re in custody</h2>
          <p className="text-slate-300">{held.reason}. Dubai Police are holding you until a lawyer gets you out, you pay bail, or the time is up.</p>
          <p className="text-5xl font-black tabular-nums">{h}:{String(m).padStart(2, "0")}:{String(sec).padStart(2, "0")}</p>
          <p className="text-xs text-slate-400">If you&apos;re found guilty in court the fine is AED {CARS.fakeLicence.fine.toLocaleString()}.</p>
          {error && <p className="text-sm text-rose-300 font-semibold">{error}</p>}
          <button onClick={() => openPhone("court")} className="w-full h-14 rounded-full bg-emerald-600 font-black text-lg">⚖️ Call a lawyer</button>
          <button disabled={busy || (citizen?.balance ?? 0) < CARS.fakeLicence.bail} onClick={async () => { setBusy(true); const r = await payBail(held.id); setBusy(false); if (r.error) setError(r.error); }}
            className="w-full h-12 rounded-full bg-white/10 font-semibold disabled:opacity-40">Pay bail · AED {CARS.fakeLicence.bail.toLocaleString()}</button>
        </div>
      </div>
    </ModalPortal>
  );
}
