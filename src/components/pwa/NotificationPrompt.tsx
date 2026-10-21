"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Check, X } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import {
  getNotificationPermission,
  isPushSupported,
  isStandalonePwa,
  subscribeToPush,
  testPushNotification,
} from "@/lib/push/client";
import { gameAudio } from "@/utils/gameAudio";

const DISMISSED_KEY = "dl_push_prompt_dismissed_at";

export function NotificationPrompt() {
  const { citizen } = useCitizen();
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [status, setStatus] = useState<"prompt" | "success" | "denied">("prompt");

  useEffect(() => {
    if (!citizen?.id || !isPushSupported()) return;

    const perm = getNotificationPermission();
    if (perm !== "default") return;

    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed) {
        const diff = Date.now() - parseInt(dismissed, 10);
        // Don't ask again within 5 days if dismissed
        if (diff < 5 * 24 * 60 * 60 * 1000) return;
      }
    } catch {}

    // Show prompt after a short delay so the user settles in
    const timer = setTimeout(() => {
      setVisible(true);
    }, 4500);

    return () => clearTimeout(timer);
  }, [citizen?.id]);

  if (!visible) return null;

  const handleEnable = async () => {
    setSubscribing(true);
    gameAudio.playClickSound();

    const res = await subscribeToPush(citizen?.id);
    setSubscribing(false);

    if (res.ok) {
      setStatus("success");
      gameAudio.playConfirmSound();
      // Send a welcoming test notification
      void testPushNotification(citizen?.id);
      setTimeout(() => {
        setVisible(false);
      }, 3500);
    } else {
      setStatus("denied");
      setTimeout(() => {
        setVisible(false);
      }, 4000);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    } catch {}
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[160] w-[min(92vw,400px)] pointer-events-auto animate-[slide-up_0.3s_ease-out]">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-3xl p-4 shadow-2xl border border-white/10 ring-1 ring-black/40">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            {status === "success" ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : status === "denied" ? (
              <Bell className="w-5 h-5 text-rose-400" />
            ) : (
              <BellRing className="w-5 h-5 animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {status === "success" ? (
              <>
                <h4 className="text-sm font-black text-emerald-400">Push notifications enabled!</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  You&apos;ll now get instant pop-ups for friend requests and messages on your phone.
                </p>
              </>
            ) : status === "denied" ? (
              <>
                <h4 className="text-sm font-black text-rose-300">Notifications are blocked</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  You can enable notifications anytime in your browser or phone system settings.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black">Enable Push Notifications</h4>
                  <button
                    onClick={handleDismiss}
                    className="text-white/40 hover:text-white p-1 -mr-1"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Get notified when friends message you, send friend requests, or knock on your apartment door!
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleEnable}
                    disabled={subscribing}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black rounded-xl shadow-lg active:scale-95 transition disabled:opacity-50"
                  >
                    {subscribing ? "Enabling…" : "Turn on Notifications"}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="py-2 px-3 text-xs text-slate-400 hover:text-white font-bold"
                  >
                    Later
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

