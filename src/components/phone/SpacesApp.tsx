"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Hand,
  MessageCircle,
  Mic,
  MicOff,
  Plus,
  Share2,
  ShieldCheck,
  Sparkles,
  Crown,
} from "lucide-react";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { useCitizen } from "@/lib/citizenStore";
import { gameAudio } from "@/utils/gameAudio";
import {
  formatSpaceTimer,
  hostNewSpace,
  joinSpace,
  leaveSpace,
  MAX_ROOM_CAPACITY,
  MAX_STAGE_MICS,
  sendSpaceComment,
  sendSpaceReaction,
  setParticipantRole,
  switchSpaceActivity,
  toggleRaiseHand,
  toggleSpaceMic,
  triggerStageActivity,
  useSpacesStore,
  type SpaceActivityKind,
  type SpaceParticipant,
  type SpaceRoom,
} from "@/lib/spaces";

type Tab = "live" | "upcoming" | "mine" | "here";

const QUICK_EMOJIS = ["😊", "🔥", "👏", "😂", "💎", "❤️"];

export function SpacesApp({
  onBack,
  onClosePhone,
}: {
  onBack: () => void;
  onClosePhone: () => void;
}) {
  const router = useRouter();
  const { citizen } = useCitizen();
  const { rooms, activeSpaceId, comments, reactions, micPermissionError, lockedSpaceId } = useSpacesStore();

  const [view, setView] = useState<"list" | "live" | "create">(
    activeSpaceId ? "live" : "list"
  );
  const [tab, setTab] = useState<Tab>("live");
  const [now, setNow] = useState(() => Date.now());
  const [commentText, setCommentText] = useState("");
  const [emojiIdx, setEmojiIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<SpaceParticipant | null>(null);

  // Create Space form state
  const [newTitle, setNewTitle] = useState("");
  const [newActivity, setNewActivity] = useState<SpaceActivityKind>("talent");
  const [newDropAmount, setNewDropAmount] = useState(1000);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === activeSpaceId) ?? null,
    [rooms, activeSpaceId]
  );

  const myId = citizen?.id ?? "guest";
  const myUsername = citizen?.username || citizen?.name || "citizen";
  const myPlaceId = citizen?.location?.placeId ?? null;

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (tab === "upcoming") return Boolean(r.scheduledFor && r.scheduledFor > now);
      if (tab === "mine") return r.hostId === myId || r.hostUsername === myUsername;
      if (tab === "here") return Boolean(myPlaceId && r.placeId === myPlaceId);
      return !r.scheduledFor || r.scheduledFor <= now;
    });
  }, [rooms, tab, now, myId, myUsername, myPlaceId]);

  const handleOpenRoom = (room: SpaceRoom) => {
    gameAudio.playClickSound();
    if (room.scheduledFor && room.scheduledFor > now) {
      setToast("⏰ Reminder set! We'll notify you when this Space goes live.");
      return;
    }
    if (activeSpaceId !== room.id) {
      const res = joinSpace(room.id);
      if (!res.ok) {
        setToast(res.reason ?? "Could not join Space.");
        return;
      }
    }
    setView("live");
  };

  const handleCreateSpace = (e: React.FormEvent) => {
    e.preventDefault();
    const created = hostNewSpace({
      title: newTitle,
      activityKind: newActivity,
      dropAmount: newDropAmount,
    });
    setNewTitle("");
    if (created) {
      setView("live");
    }
  };

  // ============================================================================
  // VIEW 1: CREATE A NEW SPACE
  // ============================================================================
  if (view === "create") {
    return (
      <div className="absolute inset-0 bg-white text-slate-900 flex flex-col pt-12 pb-6 px-5 overflow-y-auto">
        <div className="flex items-center justify-between pb-3">
          <button
            type="button"
            onClick={() => setView("list")}
            className="flex items-center gap-1 text-sky-600 font-bold text-lg -ml-1"
          >
            <ChevronLeft className="w-6 h-6" /> Back
          </button>
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            Max {MAX_STAGE_MICS} mics · {MAX_ROOM_CAPACITY} room cap
          </span>
        </div>

        <h2 className="text-2xl font-black tracking-tight mt-1">Host a Live Space</h2>
        <p className="text-xs text-slate-500 mt-1">
          Start a 60-minute live audio room. Invite co-hosts, run stage games, and keep talking while
          walking around Dubai or playing games.
        </p>

        <form onSubmit={handleCreateSpace} className="mt-5 space-y-4 flex-1 flex flex-col">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
              Space Title
            </label>
            <input
              type="text"
              maxLength={70}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Talent Night, Truth or Dare…"
              className="w-full h-12 px-4 rounded-2xl bg-slate-100 text-slate-900 font-semibold text-sm outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
              Stage Activity
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "talent", icon: "✋", label: "Talent Night", sub: "Applause meter" },
                { id: "truth-or-dare", icon: "🎲", label: "Truth or Dare", sub: "Spin prompts" },
                { id: "cash-drop", icon: "💸", label: "AED Cash Drop", sub: "Reward listeners" },
                { id: "game", icon: "🎱", label: "3D Pool Room", sub: "Play + Voice" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setNewActivity(item.id as SpaceActivityKind)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    newActivity === item.id
                      ? "border-slate-900 bg-slate-900 text-white shadow-md"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <div className="text-lg">{item.icon}</div>
                  <div className="font-bold text-sm mt-0.5">{item.label}</div>
                  <div
                    className={`text-[11px] ${
                      newActivity === item.id ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {item.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {newActivity === "cash-drop" && (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                AED Prize Pool
              </label>
              <div className="flex gap-2">
                {[500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setNewDropAmount(amt)}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold border ${
                      newDropAmount === amt
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    AED {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> AI Safety Check &amp; Room Rules
            </div>
            <p>
              Spaces run on a 60-minute timer with up to {MAX_STAGE_MICS} speakers on stage and{" "}
              {MAX_ROOM_CAPACITY} listeners. Minimizing the phone floats your Space on top of any
              screen.
            </p>
          </div>

          <div className="mt-auto pt-3">
            <button
              type="submit"
              className="w-full h-13 rounded-full bg-[#1d2433] hover:bg-slate-800 text-white font-extrabold text-base shadow-lg active:scale-98 transition-transform"
            >
              🎙️ Go Live Now
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: LIVE SPACE ROOM (Matches Screenshot 2 1:1)
  // ============================================================================
  if (view === "live" && activeRoom) {
    const speakers = activeRoom.participants.filter((p) => p.role !== "listener");
    const listeners = activeRoom.participants.filter((p) => p.role === "listener");
    const nowSpeaking =
      speakers.find((p) => p.speaking && !p.muted) ??
      speakers.find((p) => p.role === "host") ??
      speakers[0];
    const myParticipant = activeRoom.participants.find((p) => p.id === myId);
    const isHostOrCohost =
      myParticipant?.role === "host" ||
      myParticipant?.role === "cohost" ||
      activeRoom.hostId === myId;
    const isOnStage = myParticipant && myParticipant.role !== "listener";
    const timer = formatSpaceTimer(activeRoom.expiresAt, now);

    const handleShare = () => {
      const url = `${window.location.origin}/explore?space=${activeRoom.id}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).catch(() => {});
      }
      setToast("🔗 Space invite link copied to clipboard!");
    };

    const handleCommentSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!commentText.trim()) return;
      sendSpaceComment(commentText);
      setCommentText("");
    };

    return (
      <div className="absolute inset-0 bg-white text-slate-900 flex flex-col pt-12 pb-5 px-5 overflow-hidden select-none">
        {/* Toast alert */}
        {toast && (
          <div className="absolute top-14 inset-x-4 z-30 rounded-2xl bg-slate-900/95 text-white text-xs font-bold px-4 py-2.5 shadow-xl text-center">
            {toast}
          </div>
        )}

        {/* Top Bar: < Live + Leave */}
        <div className="flex items-center justify-between pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setView("list")}
            className="flex items-center gap-1 text-slate-900 font-extrabold text-2xl -ml-1.5"
          >
            <ChevronLeft className="w-7 h-7 text-sky-600" />
            <span>Live</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClosePhone}
              className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              title="Minimize to floating bar"
            >
              Float ↗
            </button>
{lockedSpaceId !== activeRoom.id && (
            <button
              type="button"
              onClick={() => {
                leaveSpace();
                setView("list");
              }}
              className="px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-extrabold"
            >
              {activeRoom.hostId === myId ? "End" : "Leave"}
            </button>
            )}
          </div>
        </div>

        {/* Scrollable Middle Content */}
        <div className="flex-1 overflow-y-auto pr-0.5 space-y-3.5 pb-3">
          {/* Title + Share & Flag */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-[20px] font-extrabold tracking-tight leading-snug text-slate-900">
                {activeRoom.title}
              </h2>
              <div className="flex items-center gap-3 text-slate-500 shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share Space"
                  className="hover:text-slate-900"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setToast("🛡️ Space reported to Dubai Life AI Safety moderation.")
                  }
                  aria-label="Report Space"
                  className="hover:text-rose-600"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Host & Counts & AI Safety Check Pill */}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-semibold">
              <span>@{activeRoom.hostUsername}</span>
              <span>·</span>
              <span>
                🎙️ {speakers.length} · 🎧 {listeners.length}
              </span>
              {activeRoom.aiSafetyCheck && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> AI safety check
                </span>
              )}
            </div>

            {/* 60-Minute Countdown Bar (53:49) */}
            <div className="mt-2.5 flex items-center gap-2.5">
              <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${timer.progress}%` }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums text-slate-500">
                {timer.label}
              </span>
            </div>
          </div>

          {/* NOW SPEAKING Spotlight Card */}
          {nowSpeaking && (
            <div className="rounded-[26px] bg-slate-50/90 border border-slate-100 p-3.5 flex items-center gap-4">
              <div
                className={`relative w-16 h-16 rounded-full overflow-hidden bg-slate-200 shrink-0 transition-shadow ${
                  nowSpeaking.speaking && !nowSpeaking.muted
                    ? "ring-4 ring-emerald-400 shadow-[0_0_22px_rgba(16,185,129,0.55)]"
                    : "ring-2 ring-slate-200"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rosterThumb(nowSpeaking.preset)}
                  alt={nowSpeaking.username}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold tracking-widest uppercase text-emerald-700">
                  NOW SPEAKING
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-lg font-extrabold text-slate-900 truncate">
                  <span className="truncate">{nowSpeaking.username}</span>
                  {(nowSpeaking.role === "host" || nowSpeaking.role === "cohost") && (
                    <span className="text-amber-400 text-base" title="Host">
                      👑
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stage Activity Card (Purple/Indigo Gradient Banner) */}
          <div className="rounded-[26px] bg-gradient-to-r from-[#6d28d9] via-[#3b0764] to-[#0f172a] p-4 text-white shadow-md">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[15px]">{activeRoom.activity.title}</span>
                  {activeRoom.activity.applauseCount > 0 && (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold">
                      👏 {activeRoom.activity.applauseCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-100/90 mt-0.5 leading-snug">
                  {activeRoom.activity.subtitle}
                </p>
              </div>

              {activeRoom.activity.kind === "game" ? (
                <button
                  type="button"
                  onClick={() => {
                    onClosePhone();
                    router.push(`/games/${activeRoom.activity.gameId ?? "pool"}`);
                  }}
                  className="shrink-0 h-11 px-4 rounded-full bg-white text-slate-900 font-extrabold text-sm flex items-center gap-1.5 shadow active:scale-95 transition-transform"
                >
                  <span>🎱</span>
                  <span>Play</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={triggerStageActivity}
                  className="shrink-0 h-11 px-4 rounded-full bg-white text-slate-900 font-extrabold text-sm flex items-center gap-1.5 shadow active:scale-95 transition-transform"
                >
                  <span>
                    {activeRoom.activity.kind === "talent"
                      ? "✋"
                      : activeRoom.activity.kind === "truth-or-dare"
                      ? "🎲"
                      : "💸"}
                  </span>
                  <span>
                    {activeRoom.activity.kind === "talent"
                      ? "Applause"
                      : activeRoom.activity.kind === "truth-or-dare"
                      ? "Spin"
                      : "Claim"}
                  </span>
                </button>
              )}
            </div>

            {/* Host / Co-Host Quick Activity Switcher */}
            {isHostOrCohost && (
              <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
                <span className="text-purple-200 font-bold shrink-0 mr-1">Stage:</span>
                {[
                  { kind: "talent", label: "✋ Talent" },
                  { kind: "truth-or-dare", label: "🎲 Truth/Dare" },
                  { kind: "cash-drop", label: "💸 AED Drop" },
                  { kind: "game", label: "🎱 3D Pool" },
                ].map((act) => (
                  <button
                    key={act.kind}
                    type="button"
                    onClick={() => switchSpaceActivity(act.kind as SpaceActivityKind)}
                    className={`px-2.5 py-1 rounded-full font-bold shrink-0 transition-colors ${
                      activeRoom.activity.kind === act.kind
                        ? "bg-white text-slate-900"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {micPermissionError && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] font-semibold text-amber-900">
              {micPermissionError}
            </div>
          )}

          {/* Stage Speakers Avatar Grid */}
          <div className="pt-1">
            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
              {speakers.map((p) => {
                const isSpeaking = p.speaking && !p.muted;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (isHostOrCohost && p.id !== myId) {
                        setSelectedUser(p);
                      }
                    }}
                    className="flex flex-col items-center text-center group"
                  >
                    <div className="relative">
                      <div
                        className={`w-16 h-16 rounded-full overflow-hidden bg-slate-100 transition-all ${
                          isSpeaking
                            ? "ring-[3px] ring-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.45)]"
                            : "ring-1 ring-slate-200"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={rosterThumb(p.preset)}
                          alt={p.username}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>

                      {/* Top-left Crown for Host / Co-Host */}
                      {(p.role === "host" || p.role === "cohost") && (
                        <span className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-amber-400 text-white flex items-center justify-center shadow ring-2 ring-white text-xs">
                          👑
                        </span>
                      )}

                      {/* Bottom-right Mic / Muted Badge */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow ring-2 ring-white ${
                          p.muted
                            ? "bg-slate-100 text-slate-500"
                            : "bg-emerald-500 text-white"
                        }`}
                      >
                        {p.muted ? (
                          <MicOff className="w-3.5 h-3.5" />
                        ) : (
                          <Mic className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </div>

                    <span className="mt-1.5 max-w-[74px] truncate text-xs font-semibold text-slate-900">
                      {p.username}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700">
                      {p.role === "host"
                        ? "Host"
                        : p.role === "cohost"
                        ? "Co-host"
                        : "Speaker"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Listeners & Hand Raises Section */}
          {listeners.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Listening ({listeners.length})
                </span>
                {isHostOrCohost && (
                  <span className="text-[11px] font-semibold text-slate-400">
                    Tap someone to invite to mic ({speakers.length}/{MAX_STAGE_MICS})
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {listeners.slice(0, 15).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (isHostOrCohost) setSelectedUser(p);
                    }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={rosterThumb(p.preset)}
                          alt={p.username}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      {p.handRaised && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-xs flex items-center justify-center shadow ring-2 ring-white animate-bounce">
                          ✋
                        </span>
                      )}
                    </div>
                    <span className="mt-1 max-w-[60px] truncate text-[10px] font-semibold text-slate-600">
                      {p.username}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Host Co-Host / Speaker Role Modal Sheet */}
          {selectedUser && isHostOrCohost && (
            <div className="rounded-2xl bg-slate-900 text-white p-3.5 space-y-2 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold">
                  Manage @{selectedUser.username} ({selectedUser.role})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedUser.role === "listener" && (
                  <button
                    type="button"
                    onClick={() => {
                      const res = setParticipantRole(selectedUser.id, "speaker");
                      if (!res.ok && res.reason) setToast(res.reason);
                      setSelectedUser(null);
                    }}
                    className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Mic className="w-3.5 h-3.5" /> Invite to Speak
                  </button>
                )}
                {selectedUser.role !== "cohost" && selectedUser.role !== "host" && (
                  <button
                    type="button"
                    onClick={() => {
                      const res = setParticipantRole(selectedUser.id, "cohost");
                      if (!res.ok && res.reason) setToast(res.reason);
                      setSelectedUser(null);
                    }}
                    className="px-3 py-1.5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1"
                  >
                    <Crown className="w-3.5 h-3.5" /> Add Co-Host
                  </button>
                )}
                {selectedUser.role !== "listener" && selectedUser.role !== "host" && (
                  <button
                    type="button"
                    onClick={() => {
                      setParticipantRole(selectedUser.id, "listener");
                      setSelectedUser(null);
                    }}
                    className="px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-bold"
                  >
                    Move to Audience
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Live Reactions & Recent Comments Stream */}
          {(reactions.length > 0 || comments.length > 0) && (
            <div className="pt-2 space-y-1.5">
              {reactions.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {reactions.slice(-6).map((rx) => (
                    <span
                      key={rx.id}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 animate-[sheetUp_0.2s_ease-out]"
                    >
                      <span>{rx.emoji}</span>
                      <span className="text-[10px] text-slate-500">@{rx.username}</span>
                    </span>
                  ))}
                </div>
              )}
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {comments.slice(-4).map((c) => (
                  <div
                    key={c.id}
                    className="text-xs bg-slate-50 rounded-xl px-3 py-1.5 flex items-baseline gap-1.5"
                  >
                    <span className="font-bold text-slate-900 shrink-0">@{c.username}:</span>
                    <span className="text-slate-600 break-words">{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Bar (Exact Screenshot 2 Layout: ✌️ | 💬 Comment | 😊 | ✋/🎙️) */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => sendSpaceReaction("✌️")}
            aria-label="Send peace reaction"
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xl shrink-0 active:scale-90 transition-transform"
          >
            ✌️
          </button>

          <form onSubmit={handleCommentSubmit} className="flex-1 min-w-0">
            <label className="w-full h-11 rounded-full bg-slate-100 px-4 flex items-center gap-2 text-sm text-slate-500">
              <MessageCircle className="w-4 h-4 shrink-0 text-slate-500" />
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Comment"
                maxLength={140}
                className="w-full bg-transparent text-slate-900 placeholder:text-slate-500 outline-none text-sm"
              />
            </label>
          </form>

          <button
            type="button"
            onClick={() => {
              const emoji = QUICK_EMOJIS[emojiIdx % QUICK_EMOJIS.length];
              sendSpaceReaction(emoji);
              setEmojiIdx((i) => i + 1);
            }}
            aria-label="Send emoji reaction"
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xl shrink-0 active:scale-90 transition-transform"
          >
            {QUICK_EMOJIS[emojiIdx % QUICK_EMOJIS.length]}
          </button>

          {isOnStage ? (
            <button
              type="button"
              onClick={toggleSpaceMic}
              aria-label={myParticipant?.muted ? "Unmute microphone" : "Mute microphone"}
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-all ${
                myParticipant?.muted
                  ? "bg-[#1d2433] text-white"
                  : "bg-emerald-600 text-white ring-4 ring-emerald-200"
              }`}
            >
              {myParticipant?.muted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleRaiseHand}
              aria-label="Raise hand to speak"
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-all ${
                myParticipant?.handRaised
                  ? "bg-emerald-600 text-white ring-4 ring-emerald-200"
                  : "bg-[#1d2433] text-white"
              }`}
            >
              <Hand className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 3: SPACES LOBBY LIST (Matches Screenshot 1 1:1)
  // ============================================================================
  return (
    <div className="absolute inset-0 bg-white text-slate-900 flex flex-col pt-12 pb-6 px-5 overflow-y-auto select-none">
      {toast && (
        <div className="absolute top-14 inset-x-4 z-30 rounded-2xl bg-slate-900/95 text-white text-xs font-bold px-4 py-2.5 shadow-xl text-center">
          {toast}
        </div>
      )}

      {/* Top Bar: < Spaces + Host Button */}
      <div className="flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-slate-900 font-extrabold text-2xl -ml-1.5"
        >
          <ChevronLeft className="w-7 h-7 text-sky-600" />
          <span>Spaces</span>
        </button>

        <button
          type="button"
          onClick={() => setView("create")}
          className="h-9 px-3.5 rounded-full bg-[#1d2433] text-white text-xs font-extrabold flex items-center gap-1 shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Host</span>
        </button>
      </div>

      {/* "You're in" Banner when activeRoom exists (Matches Screenshot 1) */}
      {activeRoom && (
        <button
          type="button"
          onClick={() => setView("live")}
          className="mb-3.5 w-full rounded-[24px] bg-[#1d2433] px-5 py-4 text-left text-white flex items-center justify-between shadow-md active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-300">You&apos;re in</div>
              <div className="text-[16px] font-bold truncate">{activeRoom.title}</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
        </button>
      )}

      {/* Filter Tabs: Live | Upcoming | Mine | Here */}
      <div className="grid grid-cols-4 rounded-full bg-slate-100 p-1 text-sm font-semibold text-slate-600 mb-4 shrink-0">
        {(
          [
            { id: "live", label: "Live" },
            { id: "upcoming", label: "Upcoming" },
            { id: "mine", label: "Mine" },
            { id: "here", label: "Here" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`py-2 rounded-full transition-all ${
              tab === t.id
                ? "bg-[#1d2433] text-white font-bold shadow-sm"
                : "hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Space Cards List */}
      <div className="space-y-3 flex-1">
        {filteredRooms.map((room) => {
          const speakers = room.participants.filter((p) => p.role !== "listener");
          const listeners = room.participants.filter((p) => p.role === "listener");
          const previewAvatars = room.participants.slice(0, 3);
          const isUpcoming = Boolean(room.scheduledFor && room.scheduledFor > now);

          return (
            <div
              key={room.id}
              onClick={() => handleOpenRoom(room)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleOpenRoom(room);
              }}
              className="w-full rounded-[26px] border border-slate-200/90 bg-white p-4 text-left shadow-sm hover:border-slate-300 active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                {isUpcoming ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-600 uppercase tracking-wide">
                    <span>⏰ UPCOMING · IN 45M</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-500 uppercase tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>LIVE</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setToast("🛡️ Space reported to Dubai Life moderation.");
                  }}
                  aria-label="Report Space"
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>

              <h3 className="mt-1.5 text-[17px] font-extrabold text-slate-900 leading-snug">
                {room.title}
              </h3>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex -space-x-2 shrink-0">
                    {(previewAvatars.length > 0
                      ? previewAvatars
                      : [
                          {
                            id: room.hostId,
                            username: room.hostUsername,
                            preset: room.hostPreset || presetFor({ gender: "woman" }),
                          },
                        ]
                    ).map((p) => (
                      <span
                        key={p.id}
                        className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 ring-2 ring-white inline-block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={rosterThumb(p.preset)}
                          alt={p.username}
                          className="w-full h-full object-cover object-top"
                        />
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-slate-500 truncate">@{room.hostUsername}</span>
                </div>

                <div className="text-sm font-semibold text-slate-700 shrink-0">
                  🎙️ {Math.max(1, speakers.length)} · 🎧 {listeners.length}
                </div>
              </div>
            </div>
          );
        })}

        {filteredRooms.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-2xl">
              🎙️
            </div>
            <div className="font-extrabold text-slate-900">No Spaces in this tab yet</div>
            <p className="text-xs text-slate-500">
              Start your own live audio room, invite co-hosts, and run Talent Night or Truth or
              Dare!
            </p>
            <button
              type="button"
              onClick={() => setView("create")}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#1d2433] text-white text-xs font-extrabold shadow"
            >
              <Sparkles className="w-4 h-4" /> Host a Space
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

