"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Check, Share, SquarePlus, Smartphone, X } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import {
  getNotificationPermission,
  isPushSupported,
  isStandalonePwa,
  subscribeToPush,
  testPushNotification,
} from "@/lib/push/client";
import { gameAudio } from "@/utils/gameAudio";
import { ModalPortal } from "@/components/ui/modal-portal";
import { useInstallState } from "@/lib/install";

const DISMISSED_KEY = "dl_push_prompt_dismissed_at";

export function NotificationPrompt() {
  const { citizen } = useCitizen();
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [status, setStatus] = useState<"prompt" | "success" | "denied">("prompt");
  const [iosModal, setIosModal] = useState(false);
  const installState = useInstallState();

  const isIosBrowser = typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !isStandalonePwa();

  useEffect(() => {
    if (!citizen?.id) return;

    const perm = getNotificationPermission();
    if (perm === "granted") return;

    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed) {
        const diff = Date.now() - parseInt(dismissed, 10);
        // Prompt again after 3 days if dismissed
        if (diff < 3 * 24 * 60 * 60 * 1000) return;
      }
    } catch {}

    const timer = setTimeout(() => {
      setVisible(true);
    }, 3500);

    return () => clearTimeout(timer);
  }, [citizen?.id]);

  if (!visible) return null;

  const handleEnable = async () => {
    if (isIosBrowser) {
      setIosModal(true);
      return;
    }

    setSubscribing(true);
    gameAudio.playClickSound();

    const res = await subscribeToPush(citizen?.id);
    setSubscribing(false);

    if (res.ok) {
      setStatus("success");
      gameAudio.playConfirmSound();
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
    <>
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[160] w-[min(92vw,400px)] pointer-events-auto animate-[slide-up_0.3s_ease-out]">
        <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-3xl p-4 shadow-2xl border border-white/10 ring-1 ring-black/40">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              {status === "success" ? (
                <Check className="w-5 h-5 text-emerald-400" />
              ) : status === "denied" ? (
                <Bell className="w-5 h-5 text-rose-400" />
              ) : isIosBrowser ? (
                <Smartphone className="w-5 h-5 text-sky-400 animate-pulse" />
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
                    You can enable notifications anytime in your phone system settings.
                  </p>
                </>
              ) : isIosBrowser ? (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black">Add App to Home Screen</h4>
                    <button
                      onClick={handleDismiss}
                      className="text-white/40 hover:text-white p-1 -mr-1"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Add cometodubai.app to your Home Screen to unlock push notifications for friend requests & messages!
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => setIosModal(true)}
                      className="flex-1 py-2 px-3 bg-sky-500 hover:bg-sky-400 text-white text-xs font-black rounded-xl shadow-lg active:scale-95 transition"
                    >
                      How to Install
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="py-2 px-3 text-xs text-slate-400 hover:text-white font-bold"
                    >
                      Later
                    </button>
                  </div>
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

      {/* iOS Install Guide Modal */}
      {iosModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[220] bg-slate-950/70 backdrop-blur-sm flex items-end justify-center p-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={() => setIosModal(false)}
          >
            <div
              className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/icon-192.png" alt="" className="w-12 h-12 rounded-2xl shadow-md" />
                <div className="flex-1">
                  <h3 className="font-black text-base text-slate-900 leading-tight">
                    Add to Home Screen
                  </h3>
                  <p className="text-xs text-slate-500">Unlocks push notifications on iPhone</p>
                </div>
                <button
                  onClick={() => setIosModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ol className="space-y-3 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
                  <span className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                    <Share className="w-4 h-4" />
                  </span>
                  <span>1. Tap the <b>Share</b> button in your Safari browser bar</span>
                </li>
                <li className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
                  <span className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                    <SquarePlus className="w-4 h-4" />
                  </span>
                  <span>2. Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b></span>
                </li>
                <li className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </span>
                  <span>3. Open the app from your Home Screen & tap <b>Allow Notifications</b>!</span>
                </li>
              </ol>

              <button
                onClick={() => setIosModal(false)}
                className="w-full h-11 rounded-xl bg-slate-900 text-white font-black text-xs active:scale-98 transition"
              >
                Got it
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
