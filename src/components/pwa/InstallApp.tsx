"use client";

// Button to add Dubai Life to the home screen. Hidden once installed.

import { useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { promptInstall, useInstallState } from "@/lib/install";
import { ModalPortal } from "@/components/ui/modal-portal";

export function InstallApp({ variant = "link" }: { variant?: "link" | "row" | "light-row" }) {
  const state = useInstallState();
  const [iosHelp, setIosHelp] = useState(false);
  if (state === "installed" || state === "unavailable") return null;

  const onClick = () => (state === "prompt" ? void promptInstall() : setIosHelp(true));
  return (
    <>
      {variant !== "link" ? (
        <button onClick={onClick} className={`w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 ${variant === "light-row" ? "bg-slate-100 text-slate-800" : "border border-white/15 bg-white/5 text-white"}`}>
          <Download className="w-4 h-4" /> Install the Dubai Life app
        </button>
      ) : (
        <button onClick={onClick} className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 hover:text-emerald-800">
          <Download className="w-3.5 h-3.5" /> Install the app
        </button>
      )}
      {iosHelp && (
        <ModalPortal>
          <div className="fixed inset-0 z-[200] bg-slate-950/60 flex items-end justify-center p-3 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={() => setIosHelp(false)}>
            <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/icon-192.png" alt="" className="w-12 h-12 rounded-2xl" />
                <div className="flex-1"><h2 className="font-black text-lg leading-tight">Add Dubai Life to your Home Screen</h2><p className="text-xs text-slate-500">Opens full screen, like an app.</p></div>
                <button onClick={() => setIosHelp(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
              </div>
              <ol className="space-y-3 text-sm">
                <li className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center"><Share className="w-4 h-4" /></span> Tap the <b>Share</b> button in your browser bar</li>
                <li className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center"><SquarePlus className="w-4 h-4" /></span> Choose <b>Add to Home Screen</b>, then <b>Add</b></li>
              </ol>
              <button onClick={() => setIosHelp(false)} className="w-full h-11 rounded-xl bg-slate-900 text-white font-black">Got it</button>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
