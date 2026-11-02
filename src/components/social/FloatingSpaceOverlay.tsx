"use client";

import React, { useEffect, useRef, useState } from "react";
import { Hand, Mic, MicOff, X } from "lucide-react";
import { rosterThumb } from "@/components/avatar/roster";
import { useCitizen } from "@/lib/citizenStore";
import { openPhone } from "@/components/layout/PhoneOverlay";
import {
  formatSpaceTimer,
  joinSpace,
  leaveSpace,
  toggleRaiseHand,
  toggleSpaceMic,
  triggerStageActivity,
  useSpacesStore,
} from "@/lib/spaces";

export function FloatingSpaceOverlay() {
  const { citizen } = useCitizen();
  const { rooms, activeSpaceId } = useSpacesStore();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!activeSpaceId) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activeSpaceId]);

  // Support deep-linking into a Space via ?space=<id>
  const linkedSpace = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const spaceParam = params.get("space");
    // Once only: leaving the Space must not rejoin it from the same link.
    if (spaceParam && spaceParam !== activeSpaceId && linkedSpace.current !== spaceParam) {
      linkedSpace.current = spaceParam;
      const res = joinSpace(spaceParam);
      if (res.ok) {
        openPhone("spaces");
      }
    }
  }, [activeSpaceId]);

  const activeRoom = rooms.find((r) => r.id === activeSpaceId);
  if (!activeRoom) return null;

  const myId = citizen?.id ?? "guest";
  const speakers = activeRoom.participants.filter((p) => p.role !== "listener");
  const listeners = activeRoom.participants.filter((p) => p.role === "listener");
  const nowSpeaking =
    speakers.find((p) => p.speaking && !p.muted) ??
    speakers.find((p) => p.role === "host") ??
    speakers[0];
  const myParticipant = activeRoom.participants.find((p) => p.id === myId);
  const isOnStage = Boolean(myParticipant && myParticipant.role !== "listener");
  const timer = formatSpaceTimer(activeRoom.expiresAt, now);

  return (
    <div className="fixed top-[max(4.25rem,calc(env(safe-area-inset-top)+3.5rem))] left-1/2 -translate-x-1/2 z-[155] w-[min(94vw,430px)] pointer-events-auto select-none">
      <div className="rounded-full bg-[#1d2433]/95 backdrop-blur-xl text-white border border-white/15 shadow-[0_14px_40px_rgba(0,0,0,0.45)] p-1.5 pl-2.5 pr-2 flex items-center gap-2.5">
        {/* Tap left area to re-open full Live Space inside Phone */}
        <button
          type="button"
          onClick={() => openPhone("spaces")}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left group"
        >
          <div className="relative shrink-0">
            <span
              className={`block w-10 h-10 rounded-full overflow-hidden bg-slate-800 ${
                nowSpeaking?.speaking && !nowSpeaking?.muted
                  ? "ring-2 ring-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.7)]"
                  : "ring-1 ring-white/25"
              }`}
            >
              {nowSpeaking && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={rosterThumb(nowSpeaking.preset)}
                  alt={nowSpeaking.username}
                  className="w-full h-full object-cover object-top"
                />
              )}
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-[#1d2433] animate-pulse" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 shrink-0">
                LIVE · {timer.label}
              </span>
              <span className="text-[11px] text-slate-300 truncate">
                · {nowSpeaking ? `@${nowSpeaking.username}` : activeRoom.hostUsername}
              </span>
            </div>
            <div className="text-xs font-extrabold text-white truncate group-hover:underline">
              {activeRoom.title}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold">
              🎙️ {speakers.length} · 🎧 {listeners.length} · {activeRoom.activity.title}
            </div>
          </div>
        </button>

        {/* Quick Stage Applause / Activity Trigger */}
        <button
          type="button"
          onClick={triggerStageActivity}
          title={activeRoom.activity.title}
          className="h-9 px-2.5 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center gap-1 shrink-0 active:scale-90 transition-transform"
        >
          <span>
            {activeRoom.activity.kind === "talent"
              ? "✋"
              : activeRoom.activity.kind === "truth-or-dare"
              ? "🎲"
              : "💸"}
          </span>
          <span className="hidden xs:inline text-[11px]">
            {activeRoom.activity.applauseCount > 0 ? activeRoom.activity.applauseCount : "Act"}
          </span>
        </button>

        {/* Mic Mute/Unmute (if on stage) OR Raise Hand (if listener) */}
        {isOnStage ? (
          <button
            type="button"
            onClick={toggleSpaceMic}
            aria-label={myParticipant?.muted ? "Unmute mic" : "Mute mic"}
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all ${
              myParticipant?.muted
                ? "bg-white/10 text-slate-300 hover:bg-white/20"
                : "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.6)]"
            }`}
          >
            {myParticipant?.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleRaiseHand}
            aria-label="Raise hand"
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all ${
              myParticipant?.handRaised
                ? "bg-emerald-500 text-white"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Hand className="w-4 h-4" />
          </button>
        )}

        {/* Leave Space button */}
        <button
          type="button"
          onClick={leaveSpace}
          aria-label="Leave Space"
          className="w-8 h-8 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 flex items-center justify-center shrink-0 active:scale-90"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

