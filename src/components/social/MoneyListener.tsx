"use client";

// Tells citizens when someone sends them money, wherever they are in the app. Row-level security
// only delivers transfers that involve this citizen.

import { onUserEvent } from "@/lib/userChannel";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen, useCitizen } from "@/lib/citizenStore";
import { gameAudio } from "@/utils/gameAudio";
import { MONEY_EVENT } from "@/lib/room";
import { POPUP, usePopupTurn } from "@/lib/popups";

interface Arrival { id: number; amount: number; from: string; place: string | null }

export function MoneyListener() {
  const { citizen } = useCitizen();
  const me = citizen?.id;
  const [arrivals, setArrivals] = useState<Arrival[]>([]);

  useEffect(() => {
    if (!me) return;
    // The same payment can be announced twice (live from the room, then by the database); show it once.
    const recent = new Map<string, number>();
    const show = (from: string, amount: number, place: string | null) => {
      const key = `${from}:${amount}`;
      if (Date.now() - (recent.get(key) ?? 0) < 20000) return;
      recent.set(key, Date.now());
      gameAudio.playCoinSound();
      const arrival = { id: Date.now() + Math.random(), amount, from, place };
      setArrivals((list) => [...list, arrival]);
    };
    const onLive = (e: Event) => {
      const d = (e as CustomEvent<{ from: string; amount: number }>).detail;
      show(d.from, d.amount, null);
    };
    window.addEventListener(MONEY_EVENT, onLive);
    // On my own channel: the database tells me about money sent to me.
    const stop = onUserEvent<{ id: number; from_id: string; to_id: string; amount: number; place: string | null }>(me, "transfers", async (e) => {
      const t = e.new;
      if (e.eventType !== "INSERT" || !t || t.to_id !== me) return;
      refreshCitizen();
      const { data } = await supabase().from("profiles").select("username").eq("id", t.from_id).maybeSingle();
      show(data?.username ?? "someone", Number(t.amount), t.place);
    });
    return () => {
      window.removeEventListener(MONEY_EVENT, onLive);
      stop();
    };
  }, [me]);

  // One popup at a time, in order (lib/popups): it shows when it's its turn, and each arrival's 6 seconds start
  // once it's on screen (so money that arrived while something else was open is still seen).
  const popupTurn = usePopupTurn("money", !(!arrivals.length), POPUP.live);
  const shownKey = popupTurn ? arrivals.map((a) => a.id).join(",") : "";
  useEffect(() => {
    if (!shownKey) return;
    const ids = shownKey.split(",").map(Number);
    const t = setTimeout(() => setArrivals((list) => list.filter((a) => !ids.includes(a.id))), 6000);
    return () => clearTimeout(t);
  }, [shownKey]);
  if (!arrivals.length) return null;
  if (!popupTurn) return null;
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[120] space-y-2 w-[min(340px,calc(100vw-24px))] pointer-events-none">
      {arrivals.map((a) => (
        <div key={a.id} className="flex items-center gap-2 bg-emerald-500 text-white rounded-2xl px-3 py-2 shadow-2xl">
          <span className="text-lg">💸</span>
          <span className="text-xs font-black">@{a.from} sent you AED {a.amount.toLocaleString()}{a.place ? ` · at ${a.place}` : ""}</span>
        </div>
      ))}
    </div>
  );
}
