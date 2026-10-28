"use client";

import { openPhone } from "@/components/layout/PhoneOverlay";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Keyboard, X } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";

interface ShortcutItem {
  keys: string[];
  description: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ["M"], description: "Open the map" },
  { keys: ["H"], description: "Home (or head home from a venue)" },
  { keys: ["B"], description: "Buy mode (at home)" },
  { keys: ["P"], description: "Phone" },
  { keys: ["S"], description: "Your Sim's needs & skills" },
  { keys: ["T"], description: "Things to do (at a venue)" },
  { keys: ["1–9"], description: "Pick a spot at a venue" },
  { keys: ["E"], description: "People here (at a venue)" },
  { keys: ["←", "↑", "→", "↓"], description: "Move furniture (Buy mode)" },
  { keys: ["R"], description: "Rotate furniture" },
  { keys: ["Enter"], description: "Place / confirm" },
  { keys: ["Del"], description: "Sell selected furniture" },
  { keys: ["C"], description: "Catalogue (Buy mode)" },
  { keys: ["Space"], description: "Interact / sit / talk" },
  { keys: ["Esc"], description: "Close / cancel" },
  { keys: ["?"], description: "Show these shortcuts" },
];

export function KeyboardShortcuts() {
  const router = useRouter();
  const { isLoggedIn } = useCitizen();
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Detect desktop with fine pointer / mouse (hide on touch phones/tablets)
    const checkDesktop = () => {
      const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const isWide = window.innerWidth >= 768;
      setIsDesktop(hasFinePointer && isWide);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing inside form inputs or textareas
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      // '?' or Shift+'/' opens shortcuts
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // Close modal on Escape
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }

      // If user is not logged in, any gameplay navigation or interaction key redirects directly to the login popup
      const key = e.key.toLowerCase();
      if (!isLoggedIn) {
        if (
          ["m", "h", "p", "s", "t", "e", "b", "c", "r"].includes(key) ||
          /^[1-9]$/.test(e.key) ||
          e.key === "Enter" ||
          e.key === " "
        ) {
          e.preventDefault();
          router.push("/?login=true");
          return;
        }
      }

      // Global Navigation & Actions (authenticated)
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        switch (key) {
          case "m":
            e.preventDefault();
            router.push("/explore");
            break;
          case "h":
            e.preventDefault();
            router.push("/home");
            break;
          case "p":
            e.preventDefault();
            // The phone opens over whatever page you're on.
            openPhone();
            break;
          case "s":
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("dubai:open-skills"));
            break;
          case "t":
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("dubai:open-things-to-do"));
            break;
          case "e":
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("dubai:open-people"));
            break;
          case "b":
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("dubai:toggle-buy-mode"));
            break;
          case "c":
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("dubai:open-catalogue"));
            break;
          default:
            // Hotkeys 1-9 for spots
            if (/^[1-9]$/.test(e.key)) {
              window.dispatchEvent(new CustomEvent("dubai:pick-spot", { detail: { spot: parseInt(e.key, 10) } }));
            }
            break;
        }
      }
    },
    [open, router, isLoggedIn]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isDesktop) return null;

  return (
    <>
      {/* Discrete floating web-only keyboard button in bottom right corner */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[140] hidden md:flex items-center justify-center w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 group"
        title="Keyboard shortcuts (?)"
        aria-label="Keyboard shortcuts"
      >
        <Keyboard className="w-4 h-4 text-slate-600 group-hover:text-slate-900 transition-colors" />
        <span className="sr-only">Keyboard shortcuts</span>
      </button>

      {/* Shortcuts Modal Dialog (Matching provided screenshot) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white text-slate-900 border-none shadow-2xl w-[92vw] max-w-lg max-h-[85vh] overflow-hidden rounded-[28px] p-6 sm:p-7 flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <Keyboard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                Keyboard shortcuts
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                Play Dubai Life without a mouse
              </p>
            </div>
          </div>

          {/* Shortcuts List */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-2.5 divide-y divide-slate-100">
            {SHORTCUTS.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between pt-2.5 first:pt-0 gap-4 text-xs sm:text-sm"
              >
                {/* Key badges */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.keys.map((k, kIdx) => (
                    <span
                      key={kIdx}
                      className="min-w-[28px] h-7 px-2 flex items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-bold font-mono text-xs shadow-xs"
                    >
                      {k}
                    </span>
                  ))}
                </div>

                {/* Description */}
                <span className="text-slate-600 font-medium text-right sm:text-left flex-1 pl-2">
                  {item.description}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
