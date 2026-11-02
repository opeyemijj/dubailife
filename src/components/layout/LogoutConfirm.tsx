"use client";

// Every log-out asks first. askLogout() opens this from anywhere; pass what to do if logging out isn't the usual one.

import { useEffect, useState } from "react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { signOut } from "@/lib/citizenStore";

type Action = () => void | Promise<unknown>;
export const askLogout = (action?: Action) => window.dispatchEvent(new CustomEvent("dubai:ask-logout", { detail: action }));

export function LogoutConfirm() {
  const [action, setAction] = useState<{ run: Action } | null>(null);
  useEffect(() => {
    const open = (e: Event) => setAction({ run: (e as CustomEvent<Action | undefined>).detail ?? signOut });
    window.addEventListener("dubai:ask-logout", open);
    return () => window.removeEventListener("dubai:ask-logout", open);
  }, []);
  if (!action) return null;
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[400] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Log out" onClick={() => setAction(null)}>
        <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-6 text-center space-y-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <p className="text-4xl">👋</p>
          <h2 className="text-xl font-black">Are you sure you want to log out?</h2>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setAction(null)} className="flex-1 h-12 rounded-2xl bg-slate-100 font-black text-slate-700">Stay</button>
            <button onClick={() => { setAction(null); void action.run(); }} className="flex-1 h-12 rounded-2xl bg-rose-600 text-white font-black">Log out</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
