"use client";

// A flashing alert when someone messages you, anywhere in the app (venues and homes show their
// own, so this stays out of the way there). Tap it to open the conversation.

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { contacts } from "@/lib/messages";
import { onNewMessage, useUnreadTotal } from "@/lib/unread";

interface Alert { id: string; from: string; username: string; text: string }

export function MessageAlerts() {
  const { citizen } = useCitizen();
  useUnreadTotal(citizen?.id); // starts listening for this citizen
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [alert, setAlert] = useState<Alert | null>(null);

  useEffect(() => onNewMessage(async (m) => {
    if (/^\/(place|property)\//.test(path)) return;
    if (path === "/phone" && params.get("chat") === m.from_id) return;
    const who = (await contacts([m.from_id])).get(m.from_id);
    try { navigator.vibrate?.([60, 40, 60]); } catch { /* not supported */ }
    setAlert({ id: m.id, from: m.from_id, username: who?.username ?? "someone", text: m.body });
    setTimeout(() => setAlert((a) => (a?.id === m.id ? null : a)), 7000);
  }), [path, params]);

  if (!alert) return null;
  return (
    <button
      onClick={() => { setAlert(null); router.push(`/phone?tab=chats&chat=${alert.from}`); }}
      className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[170] w-[min(92vw,380px)] flex items-center gap-3 bg-sky-500 text-white rounded-2xl px-3 py-2.5 shadow-2xl ring-4 ring-sky-300/60 animate-[pulse_0.9s_ease-in-out_3] text-left"
    >
      <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0"><MessageCircle className="w-5 h-5" /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-black">@{alert.username}</span>
        <span className="block text-sm truncate">{alert.text}</span>
      </span>
      <span className="text-[11px] font-black bg-white text-sky-600 rounded-full px-2.5 py-1">Reply</span>
    </button>
  );
}
