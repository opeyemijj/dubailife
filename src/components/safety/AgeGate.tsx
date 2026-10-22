"use client";

// Come To Dubai is 21+ (design spec section 4). Accounts made before the age gate are asked for a date of
// birth once; anyone under 21 sees a closed door with only a log-out button. Admin pages are left alone.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ModalPortal } from "@/components/ui/modal-portal";
import { supabase } from "@/lib/supabase/client";
import { signOut } from "@/lib/citizenStore";
import { ageFrom, dobIso, MIN_AGE } from "@/lib/age";
import { setMyDob } from "@/lib/safety";

type State = "ok" | "ask" | "underage";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function stateFor(meta: Record<string, unknown> | undefined): State {
  const dob = typeof meta?.date_of_birth === "string" ? meta.date_of_birth : null;
  if (!dob) return "ask";
  return ageFrom(dob) >= MIN_AGE ? "ok" : "underage";
}

export function AgeGate() {
  const path = usePathname();
  const [state, setState] = useState<State>("ok");
  const [day, setDay] = useState("1");
  const [month, setMonth] = useState("Jan");
  const [year, setYear] = useState("1995");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = supabase();
    const check = async () => {
      const { data: { user } } = await db.auth.getUser();
      setState(user ? stateFor(user.user_metadata) : "ok");
    };
    void check();
    const { data: sub } = db.auth.onAuthStateChange(() => { void check(); });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (state === "ok" || path?.startsWith("/admin")) return null;

  const years = Array.from({ length: 90 }, (_, i) => String(new Date().getFullYear() - 10 - i));
  const save = async () => {
    const iso = dobIso({ day, month, year });
    if (!iso) return setError("That isn't a real date — please check it.");
    setBusy(true); setError(null);
    const r = await setMyDob(iso);
    setBusy(false);
    if (r.error) return setError(r.error);
    setState(r.ok ? "ok" : "underage");
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Age check">
        <div className="w-full max-w-sm bg-white text-slate-900 rounded-[2rem] p-6 space-y-4 text-center shadow-2xl">
          {state === "underage" ? (
            <>
              <div className="text-4xl">🔞</div>
              <h2 className="text-xl font-black">Come To Dubai is 21+</h2>
              <p className="text-sm text-slate-600">Sorry, this game is only for players aged 21 and over, so this account can&apos;t be used.</p>
              <button onClick={() => void signOut().then(() => window.location.replace("/"))} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black">Log out</button>
            </>
          ) : (
            <>
              <div className="text-4xl">🗓️</div>
              <h2 className="text-xl font-black">One quick thing</h2>
              <p className="text-sm text-slate-600">Come To Dubai is now 21+. Please confirm your date of birth to keep playing. You can only set it once.</p>
              <div className="grid grid-cols-3 gap-2">
                <select value={day} onChange={(e) => setDay(e.target.value)} className="h-11 px-2 rounded-2xl bg-slate-100 border border-slate-200 font-bold text-sm">
                  {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => <option key={d}>{d}</option>)}
                </select>
                <select value={month} onChange={(e) => setMonth(e.target.value)} className="h-11 px-2 rounded-2xl bg-slate-100 border border-slate-200 font-bold text-sm">
                  {MONTHS.map((m) => <option key={m}>{m}</option>)}
                </select>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="h-11 px-2 rounded-2xl bg-slate-100 border border-slate-200 font-bold text-sm">
                  {years.map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
              {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
              <button onClick={save} disabled={busy} className="w-full h-12 rounded-2xl bg-emerald-700 text-white font-black disabled:opacity-60">{busy ? "Saving…" : "Confirm"}</button>
              <button onClick={() => void signOut().then(() => window.location.replace("/"))} className="text-xs font-bold text-slate-400">Log out instead</button>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
