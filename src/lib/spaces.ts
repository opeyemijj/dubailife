"use client";

// Browser WebRTC + Supabase Realtime Audio Spaces engine.
// Auto-capped at 8 mics on stage and 45 people per room, with a 60-minute room timer (like 53:49)
// so idle rooms never stay open forever. Runs as a global singleton so audio and room state persist
// across any route or screen when the Phone is closed.

import { useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { adjustBalance, getCitizenState } from "@/lib/citizenStore";
import { presetFor } from "@/components/avatar/roster";
import { broadcastCityPulse } from "@/lib/presence";
import { gameAudio } from "@/utils/gameAudio";

export const MAX_STAGE_MICS = 8; // 1 Host + Co-hosts + Speakers max
export const MAX_ROOM_CAPACITY = 45; // ~35–50 people per room cap for P2P WebRTC
export const SPACE_DURATION_MS = 60 * 60 * 1000; // 60-minute countdown timer

export type SpaceRole = "host" | "cohost" | "speaker" | "listener";
export type SpaceActivityKind = "talent" | "truth-or-dare" | "cash-drop" | "game";

export interface SpaceParticipant {
  id: string;
  username: string;
  preset: string;
  role: SpaceRole;
  muted: boolean;
  handRaised: boolean;
  speaking: boolean;
  joinedAt: number;
}

export interface SpaceComment {
  id: string;
  username: string;
  preset: string;
  text: string;
  at: number;
}

export interface SpaceReaction {
  id: string;
  username: string;
  emoji: string;
  at: number;
}

export interface SpaceActivityState {
  kind: SpaceActivityKind;
  title: string;
  subtitle: string;
  applauseCount: number;
  promptText?: string;
  dropAmount?: number;
  dropClaimedBy?: string[];
  gameId?: string;
  gameName?: string;
}

export interface SpaceRoom {
  id: string;
  title: string;
  hostId: string;
  hostUsername: string;
  hostPreset: string;
  placeId: string | null;
  startedAt: number;
  expiresAt: number;
  scheduledFor?: number; // if upcoming
  participants: SpaceParticipant[];
  activity: SpaceActivityState;
  aiSafetyCheck: boolean;
  /** A party's own Space: where the party is (so it leads there, not to the Spaces app), and whose party it is. */
  partyRoute?: string;
  partyHost?: string;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

// Plus relay (TURN) servers when the app has them (see /api/turn): without a relay, phones on mobile data often can't
// connect to each other at all, and nobody hears them. Fetched once a session and refreshed before it runs out; any
// connection made before they arrive is switched over to them.
let iceServers: RTCIceServer[] = ICE_SERVERS;
let iceFetchedAt = 0;
function loadIceServers() {
  if (typeof window === "undefined" || Date.now() - iceFetchedAt < 12 * 60 * 60 * 1000) return;
  iceFetchedAt = Date.now();
  fetch("/api/turn", { method: "POST" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { iceServers?: RTCIceServer[] | null } | null) => {
      if (!j?.iceServers?.length) return;
      iceServers = [...ICE_SERVERS, ...j.iceServers];
      peerConnections.forEach((pc) => {
        try {
          pc.setConfiguration({ iceServers });
          if (pc.connectionState !== "connected") pc.restartIce();
        } catch { /* closed */ }
      });
    })
    .catch(() => { iceFetchedAt = 0; });
}

export const TRUTH_OR_DARE_PROMPTS = [
  "TRUTH: What was your biggest AED splurge in Dubai so far?",
  "DARE: Do your best Dubai Metro station announcement voice on the mic!",
  "TRUTH: Which district Syndicate do you secretly respect the most?",
  "DARE: Sing 10 seconds of a song for the Talent Night crowd!",
  "TRUTH: Have you ever run out of Runway at the 09:00 GST tick?",
  "DARE: Pitch a crazy Dubai business venture in 15 seconds to the host!",
  "TRUTH: Who in this Space would you trust as your Co-Op Venture partner?",
  "DARE: Give a 10-second luxury real estate tour of your current apartment!",
];

interface SpacesStoreState {
  rooms: SpaceRoom[];
  activeSpaceId: string | null;
  comments: SpaceComment[];
  reactions: SpaceReaction[];
  micPermissionError: string | null;
  /** A Space you can't leave right now: your party's, while you're at the party. */
  lockedSpaceId: string | null;
  /** Everyone else's voices silenced, for you only. */
  soundOff: boolean;
}

let state: SpacesStoreState = {
  rooms: [],
  activeSpaceId: null,
  comments: [],
  reactions: [],
  micPermissionError: null,
  lockedSpaceId: null,
  soundOff: false,
};

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

// Supabase Realtime channels & WebRTC state
let lobbyChannel: RealtimeChannel | null = null;
let roomChannel: RealtimeChannel | null = null;
let localStream: MediaStream | null = null;
let audioCtx: AudioContext | null = null;
let vadInterval: ReturnType<typeof setInterval> | null = null;
let expiryInterval: ReturnType<typeof setInterval> | null = null;
const peerConnections = new Map<string, RTCPeerConnection>();
// Per-peer negotiation state (the "perfect negotiation" pattern), and candidates that beat their description here.
const peerMeta = new Map<string, { makingOffer: boolean; ignoreOffer: boolean; pendingIce: RTCIceCandidateInit[] }>();
// When each room's host was last heard from: hosts re-announce, so a room whose host has gone disappears.
const roomLastSeen = new Map<string, number>();
const HOST_BEAT_MS = 20000;
// Long enough that a host whose phone goes to the background for a bit doesn't lose their room.
const HOST_GONE_MS = 180000;
let beatInterval: ReturnType<typeof setInterval> | null = null;
let micStarting = false;
let pendingJoinId: string | null = null;
const remoteAudioElements = new Map<string, HTMLAudioElement>();
// Phones only let audio start from a tap. A voice can arrive long after your last tap (a speaker brought up later),
// so this many players are readied while you're tapping to host or join, and each voice takes one when it comes.
const audioPool: HTMLAudioElement[] = [];
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
let retryingAudio = false;

function meInfo(): { id: string; username: string; preset: string; placeId: string | null } {
  const c = getCitizenState().citizen;
  return {
    id: c?.id ?? "guest",
    username: c?.username || c?.name || "citizen",
    preset: presetFor(c?.look ?? { gender: "woman" }),
    placeId: c?.location?.placeId ?? null,
  };
}

function connectLobby() {
  loadIceServers();
  if (lobbyChannel) return;
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;

  lobbyChannel = supabase().channel("dubai-spaces-lobby");
  lobbyChannel
    .on("broadcast", { event: "space-upsert" }, ({ payload }) => {
      if (!payload || !payload.id) return;
      const incoming = payload as SpaceRoom;
      roomLastSeen.set(incoming.id, Date.now());
      const roleBefore = myRoleIn(incoming.id);
      const before = state.rooms.find((r) => r.id === incoming.id);
      const hostBefore = before?.hostId;
      const startedBefore = before?.startedAt;
      const exists = state.rooms.some((r) => r.id === incoming.id);
      const myId = meInfo().id;
      state = {
        ...state,
        rooms: exists
          ? state.rooms.map((r) => {
              if (r.id !== incoming.id) return r;
              // The host's roster wins, but I know my own seat best (it may not have reached them yet).
              // Except my role, which is the host's to give.
              const mine = incoming.id === state.activeSpaceId ? r.participants.find((p) => p.id === myId) : undefined;
              const given = incoming.participants.find((p) => p.id === myId)?.role;
              const others = incoming.participants.filter((p) => p.id !== myId);
              return { ...r, ...incoming, participants: mine ? [...others, { ...mine, role: given ?? mine.role }] : incoming.participants };
            })
          : [incoming, ...state.rooms],
      };
      emit();
      if (pendingJoinId === incoming.id) {
        pendingJoinId = null;
        joinSpace(incoming.id);
      } else if (incoming.id === state.activeSpaceId) {
        // Two people hosting the same party Space (a guest stood in while the host was away): one gives way, the
        // party's host first, then whoever's username comes first, and rejoins to listen.
        const me = meInfo();
        const mine = state.rooms.find((r) => r.id === incoming.id);
        if (incoming.partyRoute && roleBefore === "host" && incoming.hostId !== me.id && mine
            && (incoming.hostUsername === incoming.partyHost || (me.username !== incoming.partyHost && incoming.hostUsername < me.username))) {
          cleanupActiveRoom();
          state = { ...state, activeSpaceId: null, rooms: state.rooms.map((r) => (r.id === incoming.id ? { ...r, hostId: incoming.hostId, hostUsername: incoming.hostUsername, participants: incoming.participants } : r)) };
          emit();
          joinSpace(incoming.id);
          return;
        }
        // A new host, or the host started it again (they refreshed or came back): drop the old connection to them
        // and say hello again, so they reconnect to me and I'm back in as a listener.
        if (hostBefore && incoming.hostId !== me.id && (hostBefore !== incoming.hostId || startedBefore !== incoming.startedAt)) {
          dropPeer(hostBefore);
          if (hostBefore !== incoming.hostId) dropPeer(incoming.hostId);
          const mePart = state.rooms.find((r) => r.id === incoming.id)?.participants.find((p) => p.id === me.id);
          if (mePart) roomChannel?.send({ type: "broadcast", event: "participant-join", payload: mePart }).catch(() => {});
        }
        myRoleChanged(roleBefore);
        syncPeers();
      }
    })
    .on("broadcast", { event: "space-list" }, () => announceMyRoom())
    .on("broadcast", { event: "space-end" }, ({ payload }) => {
      if (!payload?.id) return;
      const endedId = payload.id as string;
      roomLastSeen.delete(endedId);
      if (state.activeSpaceId === endedId) {
        cleanupActiveRoom();
      }
      state = {
        ...state,
        rooms: state.rooms.filter((r) => r.id !== endedId),
        activeSpaceId: state.activeSpaceId === endedId ? null : state.activeSpaceId,
      };
      emit();
    })
    .subscribe((status) => {
      // Rooms aren't stored anywhere: ask the hosts who are live to say so.
      if (status === "SUBSCRIBED") {
        lobbyChannel?.send({ type: "broadcast", event: "space-list", payload: {} }).catch(() => {});
        announceMyRoom();
      }
    });

  if (!beatInterval) {
    beatInterval = setInterval(() => {
      announceMyRoom();
      const now = Date.now();
      const gone = state.rooms.filter((r) => r.hostId !== meInfo().id && now - (roomLastSeen.get(r.id) ?? now) > HOST_GONE_MS);
      if (!gone.length) return;
      if (gone.some((r) => r.id === state.activeSpaceId)) cleanupActiveRoom();
      state = {
        ...state,
        rooms: state.rooms.filter((r) => !gone.includes(r)),
        activeSpaceId: gone.some((r) => r.id === state.activeSpaceId) ? null : state.activeSpaceId,
      };
      emit();
    }, HOST_BEAT_MS);
  }
}

/** The host says their room is live, with who's in it. */
function announceMyRoom() {
  const room = state.rooms.find((r) => r.id === state.activeSpaceId);
  if (room && room.hostId === meInfo().id) broadcastRoomToLobby(room);
}

function broadcastRoomToLobby(room: SpaceRoom) {
  connectLobby();
  if (lobbyChannel) {
    lobbyChannel.send({ type: "broadcast", event: "space-upsert", payload: room }).catch(() => {});
  }
}

function stopLocalMic() {
  if (vadInterval) {
    clearInterval(vadInterval);
    vadInterval = null;
  }
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
}

/** Call from the tap that hosts or joins a Space. */
function unlockAudio() {
  if (typeof document === "undefined") return;
  while (audioPool.length + remoteAudioElements.size < MAX_STAGE_MICS) {
    const el = document.createElement("audio");
    el.setAttribute("playsinline", "true");
    el.style.display = "none";
    document.body.appendChild(el);
    el.src = SILENCE;
    el.play().catch(() => {});
    audioPool.push(el);
  }
  if (!retryingAudio) {
    retryingAudio = true;
    // iPhones only count some kinds of tap as letting sound play, so all of them.
    ["pointerdown", "touchend", "click"].forEach((t) => window.addEventListener(t, resumeVoices, { capture: true, passive: true }));
  }
}

/** Anything still silent gets another go: after a tap, and after the mic starts (phones can pause audio for that). */
function resumeVoices() {
  remoteAudioElements.forEach((el) => {
    if (el.paused) el.play().catch(() => {});
  });
}

function closeAllPeers() {
  peerConnections.forEach((pc) => {
    try {
      pc.close();
    } catch {
      /* ignore */
    }
  });
  peerConnections.clear();
  peerMeta.clear();
  remoteAudioElements.forEach((el) => {
    try {
      el.pause();
      el.srcObject = null;
      el.remove();
    } catch {
      /* ignore */
    }
  });
  remoteAudioElements.clear();
  audioPool.splice(0).forEach((el) => el.remove());
  if (retryingAudio) {
    retryingAudio = false;
    ["pointerdown", "touchend", "click"].forEach((t) => window.removeEventListener(t, resumeVoices, { capture: true }));
  }
}

function cleanupActiveRoom() {
  gameAudio.holdMusic(false);
  stopLocalMic();
  closeAllPeers();
  if (expiryInterval) {
    clearInterval(expiryInterval);
    expiryInterval = null;
  }
  if (roomChannel) {
    supabase().removeChannel(roomChannel).catch(() => {});
    roomChannel = null;
  }
}

/** Mic on or off. If it can't be on, you're shown as muted and told why, rather than talking to nobody. */
function micBlocked(text: string) {
  const spaceId = state.activeSpaceId;
  state = { ...state, micPermissionError: text };
  emit();
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("dubai:toast", { detail: `🎙️ ${text} Tap the red mic to try again.` }));
  if (!spaceId) return;
  const me = meInfo();
  updateParticipantInRoom(spaceId, me.id, { muted: true, speaking: false });
  roomChannel
    ?.send({ type: "broadcast", event: "participant-patch", payload: { userId: me.id, patch: { muted: true, speaking: false } } })
    .catch(() => {});
}

async function ensureLocalMic(unmuted: boolean) {
  if (!unmuted) {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
    }
    setMySpeaking(false);
    return;
  }

  if (localStream) {
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = true;
    });
    syncPeers();
    return;
  }

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    micBlocked("This browser can't use the microphone. You can still listen, comment and react.");
    return;
  }
  if (micStarting) return;
  micStarting = true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    // Left the Space while the permission prompt was up.
    if (!state.activeSpaceId) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    localStream = stream;
    state = { ...state, micPermissionError: null };
    emit();

    // Everyone in the room gets the voice (adding a track renegotiates by itself).
    syncPeers();
    resumeVoices();

    // Voice Activity Detection (VAD) for green pulsing speaking ring
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
      audioCtx.resume().catch(() => {});
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      vadInterval = setInterval(() => {
        if (!localStream || !localStream.getAudioTracks()[0]?.enabled) {
          setMySpeaking(false);
          return;
        }
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        setMySpeaking(avg > 16);
      }, 220);
    }
  } catch {
    micBlocked("Microphone access is blocked. Allow it for this site to speak. You can still listen, comment and react.");
  } finally {
    micStarting = false;
  }
}

function myRoleIn(spaceId: string): SpaceRole | undefined {
  const myId = meInfo().id;
  return state.rooms.find((r) => r.id === spaceId)?.participants.find((p) => p.id === myId)?.role;
}

/** Brought up on stage: your mic goes live (the host invited you to talk). Moved to the audience: it goes off. */
function myRoleChanged(before: SpaceRole | undefined) {
  const spaceId = state.activeSpaceId;
  if (!spaceId || !before) return;
  const me = meInfo();
  const now = myRoleIn(spaceId);
  if (!now || now === before) return;
  if (now === "listener") {
    ensureLocalMic(false);
  } else if (before === "listener") {
    updateParticipantInRoom(spaceId, me.id, { muted: false });
    roomChannel?.send({ type: "broadcast", event: "participant-patch", payload: { userId: me.id, patch: { muted: false } } }).catch(() => {});
    ensureLocalMic(true);
  }
}

function setMySpeaking(speaking: boolean) {
  const spaceId = state.activeSpaceId;
  if (!spaceId) return;
  const me = meInfo();
  const room = state.rooms.find((r) => r.id === spaceId);
  if (!room) return;
  const myPart = room.participants.find((p) => p.id === me.id);
  if (!myPart || myPart.speaking === speaking) return;

  updateParticipantInRoom(spaceId, me.id, { speaking });
  if (roomChannel) {
    roomChannel
      .send({
        type: "broadcast",
        event: "speaking",
        payload: { userId: me.id, speaking },
      })
      .catch(() => {});
  }
}

function updateParticipantInRoom(
  spaceId: string,
  userId: string,
  patch: Partial<SpaceParticipant>
) {
  state = {
    ...state,
    rooms: state.rooms.map((r) => {
      if (r.id !== spaceId) return r;
      return {
        ...r,
        participants: r.participants.map((p) => (p.id === userId ? { ...p, ...patch } : p)),
      };
    }),
  };
  emit();
}

function sendSignal(event: string, payload: Record<string, unknown>) {
  roomChannel?.send({ type: "broadcast", event, payload: { from: meInfo().id, ...payload } }).catch(() => {});
}

function addLocalTracks(pc: RTCPeerConnection) {
  if (!localStream) return;
  const sending = pc.getSenders().map((s) => s.track);
  localStream.getTracks().forEach((track) => {
    if (!sending.includes(track)) pc.addTrack(track, localStream!);
  });
}

/** If I have a mic going, make sure everyone in the room is connected to it. */
function syncPeers() {
  if (!localStream) return;
  const me = meInfo();
  state.rooms
    .find((r) => r.id === state.activeSpaceId)
    ?.participants.forEach((p) => {
      if (p.id !== me.id) addLocalTracks(getOrCreatePeerConnection(p.id));
    });
}

function dropPeer(peerId: string) {
  peerConnections.get(peerId)?.close();
  peerConnections.delete(peerId);
  peerMeta.delete(peerId);
  const audio = remoteAudioElements.get(peerId);
  if (audio) {
    audio.pause();
    audio.srcObject = null;
    audio.remove();
    remoteAudioElements.delete(peerId);
  }
}

function getOrCreatePeerConnection(peerId: string): RTCPeerConnection {
  const existing = peerConnections.get(peerId);
  if (existing) return existing;

  const pc = new RTCPeerConnection({ iceServers });
  peerConnections.set(peerId, pc);
  const meta = { makingOffer: false, ignoreOffer: false, pendingIce: [] as RTCIceCandidateInit[] };
  peerMeta.set(peerId, meta);

  pc.onnegotiationneeded = async () => {
    try {
      meta.makingOffer = true;
      await pc.setLocalDescription();
      sendSignal("webrtc-offer", { to: peerId, sdp: pc.localDescription?.toJSON() });
    } catch {
      /* the next change renegotiates */
    } finally {
      meta.makingOffer = false;
    }
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) sendSignal("webrtc-ice", { to: peerId, candidate: e.candidate.toJSON() });
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed") pc.restartIce();
  };

  pc.ontrack = (e) => {
    if (typeof document === "undefined") return;
    // Some browsers (older Safari) don't say which stream a voice belongs to.
    const remoteStream = e.streams[0] ?? new MediaStream([e.track]);
    let audio = remoteAudioElements.get(peerId);
    if (!audio) {
      audio = audioPool.pop() ?? document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");
      audio.style.display = "none";
      if (!audio.isConnected) document.body.appendChild(audio);
      remoteAudioElements.set(peerId, audio);
    }
    audio.removeAttribute("src");
    audio.srcObject = remoteStream;
    audio.muted = state.soundOff;
    audio.play().catch(() => {});
  };

  addLocalTracks(pc);
  return pc;
}

async function flushIce(peerId: string, pc: RTCPeerConnection) {
  const meta = peerMeta.get(peerId);
  if (!meta) return;
  for (const c of meta.pendingIce.splice(0)) await pc.addIceCandidate(c).catch(() => {});
}

function subscribeToSpaceChannel(spaceId: string, onReady?: () => void) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;

  if (roomChannel) {
    supabase().removeChannel(roomChannel).catch(() => {});
    roomChannel = null;
  }

  const me = meInfo();
  roomChannel = supabase().channel(`dubai-space:${spaceId}`, {
    config: { presence: { key: me.id } },
  });

  roomChannel
    .on("broadcast", { event: "participant-join" }, ({ payload }) => {
      const p = payload as SpaceParticipant;
      if (!p || !p.id) return;
      state = {
        ...state,
        rooms: state.rooms.map((r) => {
          if (r.id !== spaceId) return r;
          if (r.participants.length >= MAX_ROOM_CAPACITY && !r.participants.some((x) => x.id === p.id)) {
            return r;
          }
          const exists = r.participants.some((x) => x.id === p.id);
          return {
            ...r,
            participants: exists
              ? r.participants.map((x) => (x.id === p.id ? { ...x, ...p } : x))
              : [...r.participants, p],
          };
        }),
      };
      emit();

      // The host tells the lobby who's here, and anyone with a mic going connects to the newcomer.
      announceMyRoom();
      syncPeers();
    })
    .on("broadcast", { event: "participant-patch" }, ({ payload }) => {
      if (!payload?.userId) return;
      const roleBefore = myRoleIn(spaceId);
      if (payload.userId === me.id && roleBefore && roleBefore !== "listener" && payload.patch?.role && payload.patch.role !== "listener") {
        // Host changing my seat on stage: my own mute stays mine.
        updateParticipantInRoom(spaceId, me.id, { role: payload.patch.role, handRaised: false });
      } else {
        updateParticipantInRoom(spaceId, payload.userId, payload.patch);
      }
      myRoleChanged(roleBefore);
    })
    .on("broadcast", { event: "participant-leave" }, ({ payload }) => {
      if (!payload?.userId) return;
      const uid = payload.userId as string;
      dropPeer(uid);
      state = {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === spaceId ? { ...r, participants: r.participants.filter((p) => p.id !== uid) } : r
        ),
      };
      emit();
      announceMyRoom();
    })
    .on("broadcast", { event: "speaking" }, ({ payload }) => {
      if (!payload?.userId) return;
      updateParticipantInRoom(spaceId, payload.userId, { speaking: Boolean(payload.speaking) });
    })
    .on("broadcast", { event: "comment" }, ({ payload }) => {
      const c = payload as SpaceComment;
      if (!c?.id) return;
      state = { ...state, comments: [...state.comments.slice(-40), c] };
      emit();
    })
    .on("broadcast", { event: "reaction" }, ({ payload }) => {
      const rx = payload as SpaceReaction;
      if (!rx?.id) return;
      state = { ...state, reactions: [...state.reactions.slice(-20), rx] };
      emit();
    })
    .on("broadcast", { event: "activity-update" }, ({ payload }) => {
      if (!payload) return;
      state = {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === spaceId ? { ...r, activity: payload as SpaceActivityState } : r
        ),
      };
      emit();
    })
    .on("broadcast", { event: "webrtc-offer" }, async ({ payload }) => {
      if (!payload || payload.to !== me.id) return;
      try {
        const pc = getOrCreatePeerConnection(payload.from);
        const meta = peerMeta.get(payload.from)!;
        // Both sides offered at once: one politely gives way.
        const collision = meta.makingOffer || pc.signalingState !== "stable";
        meta.ignoreOffer = me.id < payload.from && collision;
        if (meta.ignoreOffer) return;
        await pc.setRemoteDescription(payload.sdp);
        await flushIce(payload.from, pc);
        await pc.setLocalDescription();
        sendSignal("webrtc-answer", { to: payload.from, sdp: pc.localDescription?.toJSON() });
      } catch {
        /* ignore */
      }
    })
    .on("broadcast", { event: "webrtc-answer" }, async ({ payload }) => {
      if (!payload || payload.to !== me.id) return;
      try {
        const pc = peerConnections.get(payload.from);
        if (pc) {
          await pc.setRemoteDescription(payload.sdp);
          await flushIce(payload.from, pc);
        }
      } catch {
        /* ignore */
      }
    })
    .on("broadcast", { event: "webrtc-ice" }, async ({ payload }) => {
      if (!payload || payload.to !== me.id || !payload.candidate) return;
      try {
        const pc = getOrCreatePeerConnection(payload.from);
        const meta = peerMeta.get(payload.from)!;
        if (!pc.remoteDescription) {
          meta.pendingIce.push(payload.candidate);
          return;
        }
        await pc.addIceCandidate(payload.candidate);
      } catch (err) {
        if (!peerMeta.get(payload.from)?.ignoreOffer) console.warn("Space ICE candidate failed", err);
      }
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") onReady?.();
    });
}

function startExpiryWatcher() {
  if (expiryInterval) clearInterval(expiryInterval);
  expiryInterval = setInterval(() => {
    const activeId = state.activeSpaceId;
    if (!activeId) return;
    const room = state.rooms.find((r) => r.id === activeId);
    if (room && Date.now() >= room.expiresAt) {
      // 60-minute timer reached 00:00 — auto-close idle room
      leaveSpace();
    }
  }, 1000);
}

/** Create & Host a new Live Audio Space (auto-capped at 60 minutes, 8 stage mics, 45 room capacity) */
export function hostNewSpace(opts: {
  title: string;
  activityKind?: SpaceActivityKind;
  dropAmount?: number;
  gameId?: string;
  gameName?: string;
  /** A fixed id, so others can find it without a link (a party's own Space). */
  id?: string;
  partyRoute?: string;
  partyHost?: string;
  /** When it ends, if not after the usual hour (a party's Space lasts the whole party). */
  endsAt?: number;
}): SpaceRoom {
  connectLobby();
  cleanupActiveRoom();

  const me = meInfo();
  const now = Date.now();
  const id = opts.id ?? `space-${now}-${Math.random().toString(36).slice(2, 7)}`;

  const activityKind = opts.activityKind ?? "talent";
  const activity: SpaceActivityState =
    activityKind === "truth-or-dare"
      ? {
          kind: "truth-or-dare",
          title: "Truth or Dare",
          subtitle: TRUTH_OR_DARE_PROMPTS[0],
          applauseCount: 0,
          promptText: TRUTH_OR_DARE_PROMPTS[0],
        }
      : activityKind === "cash-drop"
      ? {
          kind: "cash-drop",
          title: "AED Cash Drop",
          subtitle: `Host @${me.username} is dropping AED ${(opts.dropAmount ?? 1000).toLocaleString()}!`,
          applauseCount: 0,
          dropAmount: opts.dropAmount ?? 1000,
          dropClaimedBy: [],
        }
      : activityKind === "game"
      ? {
          kind: "game",
          title: `Live ${opts.gameName ?? "3D Pool"} Room`,
          subtitle: "Play together while talking on the mic",
          applauseCount: 0,
          gameId: opts.gameId ?? "pool",
          gameName: opts.gameName ?? "8-Ball Pool",
        }
      : {
          kind: "talent",
          title: "Talent Night",
          subtitle: "Hold Applause for who's on the stage",
          applauseCount: 1,
        };

  const newRoom: SpaceRoom = {
    id,
    title: opts.title.trim() || `${me.username}'s Dubai Space`,
    partyRoute: opts.partyRoute,
    partyHost: opts.partyHost,
    hostId: me.id,
    hostUsername: me.username,
    hostPreset: me.preset,
    placeId: me.placeId,
    startedAt: now,
    expiresAt: opts.endsAt && opts.endsAt > now ? opts.endsAt : now + SPACE_DURATION_MS,
    aiSafetyCheck: true,
    activity,
    participants: [
      {
        id: me.id,
        username: me.username,
        preset: me.preset,
        role: "host",
        muted: false,
        handRaised: false,
        speaking: false,
        joinedAt: now,
      },
    ],
  };

  state = {
    ...state,
    rooms: [newRoom, ...state.rooms],
    activeSpaceId: id,
    comments: [
      {
        id: `sys-${now}`,
        username: "Dubai Life",
        preset: me.preset,
        text: "🛡️ AI Safety Check active · 60-minute Space timer started.",
        at: now,
      },
    ],
    reactions: [],
  };
  emit();

  roomLastSeen.set(id, now);
  subscribeToSpaceChannel(id);
  broadcastRoomToLobby(newRoom);
  startExpiryWatcher();
  // The city music stops while you're in a Space, and your mic goes live.
  gameAudio.holdMusic(true);
  unlockAudio();
  ensureLocalMic(true);
  gameAudio.sfx("chime");

  broadcastCityPulse({
    kind: "party",
    icon: "🎙️",
    title: `Live Space: ${newRoom.title}`,
    subtitle: `@${me.username} is live on the mic right now`,
    href: `/explore?space=${id}`,
    cta: "Join Space",
    from: me.username,
  });

  return newRoom;
}

/** Join an existing Space as a Listener (or reclaim Host role if it's your room) */
export function joinSpace(spaceId: string): { ok: boolean; reason?: string } {
  connectLobby();
  const room = state.rooms.find((r) => r.id === spaceId);
  if (!room) {
    // Opened from a link before the host has announced it: join as soon as they do.
    pendingJoinId = spaceId;
    lobbyChannel?.send({ type: "broadcast", event: "space-list", payload: {} }).catch(() => {});
    return { ok: false, reason: "Space not found. It may have ended." };
  }

  const me = meInfo();
  const alreadyIn = room.participants.some((p) => p.id === me.id);
  if (!alreadyIn && room.participants.length >= MAX_ROOM_CAPACITY) {
    return {
      ok: false,
      reason: `This Space is at maximum capacity (${MAX_ROOM_CAPACITY} people).`,
    };
  }

  if (state.activeSpaceId && state.activeSpaceId !== spaceId) {
    cleanupActiveRoom();
  }

  const myRole: SpaceRole = room.hostId === me.id ? "host" : "listener";
  const myParticipant: SpaceParticipant = {
    id: me.id,
    username: me.username,
    preset: me.preset,
    role: myRole,
    muted: myRole === "listener",
    handRaised: false,
    speaking: false,
    joinedAt: Date.now(),
  };

  state = {
    ...state,
    activeSpaceId: spaceId,
    rooms: state.rooms.map((r) => {
      if (r.id !== spaceId) return r;
      const hasMe = r.participants.some((p) => p.id === me.id);
      return {
        ...r,
        participants: hasMe
          ? r.participants.map((p) => (p.id === me.id ? myParticipant : p))
          : [...r.participants, myParticipant],
      };
    }),
  };
  emit();

  // Say hello once connected (also after a dropped connection), so the host adds you and speakers connect to you.
  subscribeToSpaceChannel(spaceId, () => {
    roomChannel?.send({ type: "broadcast", event: "participant-join", payload: myParticipant }).catch(() => {});
  });
  startExpiryWatcher();
  gameAudio.holdMusic(true);
  unlockAudio();
  if (myRole !== "listener") {
    ensureLocalMic(true);
  }
  gameAudio.sfx("open");
  return { ok: true };
}

/** Leave the currently active Space (or end it if you are the Host) */
export function leaveSpace() {
  const spaceId = state.activeSpaceId;
  if (!spaceId) return;
  const me = meInfo();
  const room = state.rooms.find((r) => r.id === spaceId);

  if (roomChannel) {
    roomChannel
      .send({ type: "broadcast", event: "participant-leave", payload: { userId: me.id } })
      .catch(() => {});
  }

  if (room && room.hostId === me.id && lobbyChannel) {
    lobbyChannel
      .send({ type: "broadcast", event: "space-end", payload: { id: spaceId } })
      .catch(() => {});
  }

  cleanupActiveRoom();

  state = {
    ...state,
    activeSpaceId: null,
    rooms: state.rooms
      .map((r) => {
        if (r.id !== spaceId) return r;
        return {
          ...r,
          participants: r.participants.filter((p) => p.id !== me.id),
        };
      })
      .filter((r) => r.hostId !== me.id || r.id !== spaceId),
  };
  gameAudio.sfx("tap");
  emit();
}

/** Toggle microphone mute/unmute when on stage */
export function toggleSpaceMic() {
  const spaceId = state.activeSpaceId;
  if (!spaceId) return;
  const me = meInfo();
  const room = state.rooms.find((r) => r.id === spaceId);
  const myPart = room?.participants.find((p) => p.id === me.id);
  if (!myPart || myPart.role === "listener") return;

  const nextMuted = !myPart.muted;
  updateParticipantInRoom(spaceId, me.id, {
    muted: nextMuted,
    speaking: nextMuted ? false : myPart.speaking,
  });
  ensureLocalMic(!nextMuted);

  if (roomChannel) {
    roomChannel
      .send({
        type: "broadcast",
        event: "participant-patch",
        payload: { userId: me.id, patch: { muted: nextMuted, speaking: false } },
      })
      .catch(() => {});
  }
  gameAudio.sfx("tap");
}

/** Listener raises or lowers hand (✋) to request the mic */
export function toggleRaiseHand() {
  const spaceId = state.activeSpaceId;
  if (!spaceId) return;
  const me = meInfo();
  const room = state.rooms.find((r) => r.id === spaceId);
  const myPart = room?.participants.find((p) => p.id === me.id);
  if (!myPart) return;

  const nextHand = !myPart.handRaised;
  updateParticipantInRoom(spaceId, me.id, { handRaised: nextHand });

  if (roomChannel) {
    roomChannel
      .send({
        type: "broadcast",
        event: "participant-patch",
        payload: { userId: me.id, patch: { handRaised: nextHand } },
      })
      .catch(() => {});
  }
  gameAudio.sfx("notice");
}

/** Host or Co-host changes a participant's role (e.g. Invite to Speak, Make Co-host, Move to Audience) */
export function setParticipantRole(
  targetUserId: string,
  newRole: SpaceRole
): { ok: boolean; reason?: string } {
  const spaceId = state.activeSpaceId;
  if (!spaceId) return { ok: false, reason: "No active space." };
  const room = state.rooms.find((r) => r.id === spaceId);
  if (!room) return { ok: false, reason: "Space not found." };

  const stageCount = room.participants.filter((p) => p.role !== "listener").length;
  const target = room.participants.find((p) => p.id === targetUserId);
  if (!target) return { ok: false, reason: "User not in room." };

  if (target.role === "listener" && newRole !== "listener" && stageCount >= MAX_STAGE_MICS) {
    return {
      ok: false,
      reason: `Stage is full (maximum ${MAX_STAGE_MICS} mics on stage). Move someone to the audience first.`,
    };
  }

  const patch: Partial<SpaceParticipant> = {
    role: newRole,
    handRaised: false,
    muted: newRole === "listener" ? true : target.muted,
    speaking: newRole === "listener" ? false : target.speaking,
  };

  updateParticipantInRoom(spaceId, targetUserId, patch);

  const me = meInfo();
  if (targetUserId === me.id) {
    ensureLocalMic(newRole !== "listener" && !patch.muted);
  }

  if (roomChannel) {
    roomChannel
      .send({
        type: "broadcast",
        event: "participant-patch",
        payload: { userId: targetUserId, patch },
      })
      .catch(() => {});
  }
  gameAudio.sfx("promo");
  return { ok: true };
}

/** Send a live comment in the active Space */
export function sendSpaceComment(text: string) {
  const clean = text.trim();
  if (!clean || !state.activeSpaceId) return;
  const me = meInfo();
  const comment: SpaceComment = {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    username: me.username,
    preset: me.preset,
    text: clean.slice(0, 180),
    at: Date.now(),
  };
  state = { ...state, comments: [...state.comments.slice(-40), comment] };
  emit();

  if (roomChannel) {
    roomChannel.send({ type: "broadcast", event: "comment", payload: comment }).catch(() => {});
  }
  gameAudio.sfx("notice");
}

/** Send a floating emoji reaction (✌️, 👏, 🔥, 😂, ❤️, 💎) */
export function sendSpaceReaction(emoji: string) {
  if (!state.activeSpaceId) return;
  const me = meInfo();
  const rx: SpaceReaction = {
    id: `rx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    username: me.username,
    emoji,
    at: Date.now(),
  };
  state = { ...state, reactions: [...state.reactions.slice(-20), rx] };
  emit();

  if (roomChannel) {
    roomChannel.send({ type: "broadcast", event: "reaction", payload: rx }).catch(() => {});
  }
  gameAudio.sfx("clap");
}

/** Trigger stage activity action: Applause (Talent Night), Spin Truth/Dare, or Claim AED Cash Drop */
export function triggerStageActivity() {
  const spaceId = state.activeSpaceId;
  if (!spaceId) return;
  const room = state.rooms.find((r) => r.id === spaceId);
  if (!room) return;
  const me = meInfo();
  const act = room.activity;

  let nextAct: SpaceActivityState = { ...act };

  if (act.kind === "talent") {
    nextAct = {
      ...act,
      applauseCount: act.applauseCount + 1,
    };
    gameAudio.sfx("applause");
    sendSpaceReaction("👏");
  } else if (act.kind === "truth-or-dare") {
    const nextPrompt =
      TRUTH_OR_DARE_PROMPTS[Math.floor(Math.random() * TRUTH_OR_DARE_PROMPTS.length)];
    nextAct = {
      ...act,
      subtitle: nextPrompt,
      promptText: nextPrompt,
      applauseCount: act.applauseCount + 1,
    };
    gameAudio.sfx("dice");
    sendSpaceReaction("🎲");
  } else if (act.kind === "cash-drop") {
    const claimed = act.dropClaimedBy ?? [];
    if (!claimed.includes(me.username)) {
      const reward = Math.max(100, Math.round((act.dropAmount ?? 1000) / 5));
      adjustBalance(reward);
      nextAct = {
        ...act,
        dropClaimedBy: [...claimed, me.username],
        subtitle: `@${me.username} claimed AED ${reward.toLocaleString()}!`,
      };
      gameAudio.sfx("cash");
      sendSpaceReaction("💸");
    }
  }

  state = {
    ...state,
    rooms: state.rooms.map((r) => (r.id === spaceId ? { ...r, activity: nextAct } : r)),
  };
  emit();

  if (roomChannel) {
    roomChannel
      .send({ type: "broadcast", event: "activity-update", payload: nextAct })
      .catch(() => {});
  }
}

/** Host or Co-host switches the active Stage Activity */
export function switchSpaceActivity(kind: SpaceActivityKind, gameId?: string, gameName?: string) {
  const spaceId = state.activeSpaceId;
  if (!spaceId) return;
  const room = state.rooms.find((r) => r.id === spaceId);
  if (!room) return;

  const nextAct: SpaceActivityState =
    kind === "truth-or-dare"
      ? {
          kind: "truth-or-dare",
          title: "Truth or Dare",
          subtitle: TRUTH_OR_DARE_PROMPTS[0],
          applauseCount: room.activity.applauseCount,
          promptText: TRUTH_OR_DARE_PROMPTS[0],
        }
      : kind === "cash-drop"
      ? {
          kind: "cash-drop",
          title: "AED Cash Drop",
          subtitle: "Tap Claim to grab your share of AED 1,000!",
          applauseCount: room.activity.applauseCount,
          dropAmount: 1000,
          dropClaimedBy: [],
        }
      : kind === "game"
      ? {
          kind: "game",
          title: `Live ${gameName ?? "8-Ball Pool"}`,
          subtitle: "Jump into the game while keeping voice chat floating on top",
          applauseCount: room.activity.applauseCount,
          gameId: gameId ?? "pool",
          gameName: gameName ?? "8-Ball Pool",
        }
      : {
          kind: "talent",
          title: "Talent Night",
          subtitle: "Hold Applause for who's on the stage",
          applauseCount: room.activity.applauseCount,
        };

  state = {
    ...state,
    rooms: state.rooms.map((r) => (r.id === spaceId ? { ...r, activity: nextAct } : r)),
  };
  emit();

  if (roomChannel) {
    roomChannel
      .send({ type: "broadcast", event: "activity-update", payload: nextAct })
      .catch(() => {});
  }
  gameAudio.sfx("chime");
}

function subscribe(cb: () => void) {
  connectLobby();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Hear the Space or not (only for you; your mic is separate). */
export function setSpaceSound(on: boolean) {
  state = { ...state, soundOff: !on };
  remoteAudioElements.forEach((el) => { el.muted = !on; });
  emit();
}

/** At a party its Space is part of it: no leaving while you're there. */
export function lockSpace(id: string | null) {
  if (state.lockedSpaceId === id) return;
  state = { ...state, lockedSpaceId: id };
  emit();
}

/** Someone has announced this Space (it's live). */
export const spaceExists = (id: string) => state.rooms.some((r) => r.id === id);

/** The Space you're in right now, if any. */
export const activeSpaceId = () => state.activeSpaceId;

export function useSpacesStore(): SpacesStoreState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
}

/** Formats remaining milliseconds as MM:SS (e.g. 53:49) */
export function formatSpaceTimer(expiresAt: number, now: number): {
  label: string;
  progress: number;
} {
  const remaining = Math.max(0, expiresAt - now);
  const totalSec = Math.floor(remaining / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const label = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const progress = Math.max(0, Math.min(100, (remaining / SPACE_DURATION_MS) * 100));
  return { label, progress };
}

