"use client";

// On a phone, one finger turns the camera round the house and two fingers slide it (to the pool, the garden or a
// party game outside). People don't find that by themselves, so: a one-time animated hint the first time there's
// something outside to see, and a nudge if someone keeps turning with one finger without ever using two.

import { useEffect, useRef, useState } from "react";
import { POPUP, usePopupTurn } from "@/lib/popups";

const SEEN = "dl.hint.twoFinger";
const STRUGGLES = 3;
const WINDOW_MS = 15_000;

function read(key: string) { try { return window.localStorage.getItem(key); } catch { return null; } }
function write(key: string) { try { window.localStorage.setItem(key, "1"); } catch { /* private mode */ } }

export const isCoarsePointer = () => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
/** A phone (or a phone-sized window): touch, or narrow. */
export const isPhone = () => typeof window !== "undefined" && (isCoarsePointer() || window.innerWidth < 768);

export function TwoFingerHint({ active }: { active: boolean }) {
  const [show, setShow] = useState<"first" | "nudge" | null>(null);
  const used = useRef(false);
  const nudged = useRef(false);
  const drags = useRef<number[]>([]);

  useEffect(() => {
    if (!active || !isCoarsePointer()) return;
    // The first time: after the room has had a moment to load.
    const first = read(SEEN) ? null : setTimeout(() => setShow("first"), 2500);
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        used.current = true;
        write(SEEN);
        setShow(null);
        return;
      }
      if (used.current || nudged.current) return;
      const t = Date.now();
      drags.current = [...drags.current.filter((x) => t - x < WINDOW_MS), t];
      if (drags.current.length >= STRUGGLES) { nudged.current = true; setShow("nudge"); }
    };
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => { if (first) clearTimeout(first); window.removeEventListener("touchstart", onTouch); };
  }, [active]);

  // A tip: last in line (lib/popups), never over another popup. Its few seconds start once it's on screen.
  const popupTurn = usePopupTurn("two-finger-hint", !!show && active, POPUP.hint);
  useEffect(() => {
    if (!show || !popupTurn) return;
    const t = setTimeout(() => { setShow(null); write(SEEN); }, show === "first" ? 6000 : 4500);
    return () => clearTimeout(t);
  }, [show, popupTurn]);
  if (!show || !active || !popupTurn) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-black/65 px-6 py-5 text-white shadow-2xl backdrop-blur-sm">
        <div className="relative h-14 w-36">
          {[0, 1].map((i) => (
            <span key={i} className="absolute top-3 h-8 w-8 rounded-full border-2 border-white bg-white/40 animate-[two-finger_1.6s_ease-in-out_infinite]" style={{ left: `${30 + i * 40}px` }} />
          ))}
        </div>
        <p className="text-sm font-black text-center">✌️ Slide with two fingers</p>
        <p className="text-[11px] text-white/75 text-center max-w-[14rem]">
          {show === "nudge" ? "One finger turns the camera. Use two to slide over to the pool, the garden or the game." : "to look round the side of the house. One finger turns the view."}
        </p>
      </div>
    </div>
  );
}
