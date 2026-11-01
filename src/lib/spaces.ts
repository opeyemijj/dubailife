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
  isSimulated?: boolean;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

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

// Seed rooms so the Spaces tab has vibrant live and upcoming rooms out of the box,
// alongside any real player-hosted rooms broadcast over Supabase Realtime.
function createSeedRooms(): SpaceRoom[] {
  const now = Date.now();
  return [
    {
      id: "seed-talent-night",
      title: "AED 50k Talent Night & Vibes 🎤🌴",
      hostId: "seed-host-1",
      hostUsername: "nikkypela",
      hostPreset: "Female_Party_02",
      placeId: "dubai-mall",
      startedAt: now - (6 * 60 + 11) * 1000, // ~53:49 remaining!
      expiresAt: now + (53 * 60 + 49) * 1000,
      aiSafetyCheck: true,
      isSimulated: true,
      activity: {
        kind: "talent",
        title: "Talent Night",
        subtitle: "Hold Applause for who's on the stage",
        applauseCount: 142,
      },
      participants: [
        {
          id: "seed-host-1",
          username: "nikkypela",
          preset: "Female_Party_02",
          role: "host",
          muted: false,
          handRaised: false,
          speaking: true,
          joinedAt: now - 360000,
        },
        {
          id: "seed-co-1",
          username: "Holl_ba",
          preset: "Male_Adult_08",
          role: "cohost",
          muted: false,
          handRaised: false,
          speaking: false,
          joinedAt: now - 340000,
        },
        {
          id: "seed-sp-1",
          username: "Engineer_DXB",
          preset: "Male_Adult_12",
          role: "speaker",
          muted: true,
          handRaised: false,
          speaking: false,
          joinedAt: now - 300000,
        },
        ...Array.from({ length: 24 }, (_, i) => ({
          id: `seed-list-1-${i}`,
          username: `citizen_${i + 10}`,
          preset: i % 2 === 0 ? "Female_Adult_05" : "Male_Adult_04",
          role: "listener" as SpaceRole,
          muted: true,
          handRaised: i === 0,
          speaking: false,
          joinedAt: now - i * 10000,
        })),
      ],
    },
    {
      id: "seed-truth-dare",
      title: "TRUTH OR DARE 💀😏 Marina Afterhours",
      hostId: "seed-host-2",
      hostUsername: "Agent1",
      hostPreset: "Male_Adult_04",
      placeId: "marina-walk",
      startedAt: now - 14 * 60 * 1000,
      expiresAt: now + 46 * 60 * 1000,
      aiSafetyCheck: true,
      isSimulated: true,
      activity: {
        kind: "truth-or-dare",
        title: "Truth or Dare",
        subtitle: "TRUTH: What was your biggest AED splurge in Dubai so far?",
        applauseCount: 89,
        promptText: "TRUTH: What was your biggest AED splurge in Dubai so far?",
      },
      participants: [
        {
          id: "seed-host-2",
          username: "Agent1",
          preset: "Male_Adult_04",
          role: "host",
          muted: false,
          handRaised: false,
          speaking: true,
          joinedAt: now - 800000,
        },
        {
          id: "seed-co-2",
          username: "layla_dxb",
          preset: "Female_Adult_06",
          role: "cohost",
          muted: false,
          handRaised: false,
          speaking: false,
          joinedAt: now - 750000,
        },
        {
          id: "seed-sp-2",
          username: "karim_gold",
          preset: "Male_Adult_21",
          role: "speaker",
          muted: false,
          handRaised: false,
          speaking: false,
          joinedAt: now - 700000,
        },
        ...Array.from({ length: 19 }, (_, i) => ({
          id: `seed-list-2-${i}`,
          username: `marina_vip_${i + 1}`,
          preset: i % 2 === 0 ? "Female_Adult_11" : "Male_Adult_08",
          role: "listener" as SpaceRole,
          muted: true,
          handRaised: false,
          speaking: false,
          joinedAt: now - i * 12000,
        })),
      ],
    },
    {
      id: "seed-pool-party",
      title: "Golden Visa Hustlers & 3D Pool Tourney 🎱🏆",
      hostId: "seed-host-3",
      hostUsername: "yimizy45",
      hostPreset: "Female_Adult_11",
      placeId: "palm-jumeirah",
      startedAt: now - 22 * 60 * 1000,
      expiresAt: now + 38 * 60 * 1000,
      aiSafetyCheck: true,
      isSimulated: true,
      activity: {
        kind: "game",
        title: "3D 8-Ball Pool Match",
        subtitle: "Play Pool with the Space while chatting live",
        applauseCount: 64,
        gameId: "pool",
        gameName: "8-Ball Pool",
      },
      participants: [
        {
          id: "seed-host-3",
          username: "yimizy45",
          preset: "Female_Adult_11",
          role: "host",
          muted: false,
          handRaised: false,
          speaking: true,
          joinedAt: now - 1200000,
        },
        {
          id: "seed-co-3",
          username: "tariq_difc",
          preset: "Male_Adult_12",
          role: "cohost",
          muted: true,
          handRaised: false,
          speaking: false,
          joinedAt: now - 1100000,
        },
        ...Array.from({ length: 14 }, (_, i) => ({
          id: `seed-list-3-${i}`,
          username: `palm_guest_${i + 1}`,
          preset: i % 2 === 0 ? "Female_Adult_05" : "Male_Adult_21",
          role: "listener" as SpaceRole,
          muted: true,
          handRaised: false,
          speaking: false,
          joinedAt: now - i * 15000,
        })),
      ],
    },
    {
      id: "seed-upcoming-1",
      title: "Dubai Syndicate Wars Strategy & Cash Drop 💎",
      hostId: "seed-host-4",
      hostUsername: "difc_whale",
      hostPreset: "Male_Adult_21",
      placeId: "difc",
      startedAt: now + 45 * 60 * 1000,
      expiresAt: now + 105 * 60 * 1000,
      scheduledFor: now + 45 * 60 * 1000,
      aiSafetyCheck: true,
      isSimulated: true,
      activity: {
        kind: "cash-drop",
        title: "AED Cash Drop",
        subtitle: "First 20 listeners get AED 1,500",
        applauseCount: 0,
        dropAmount: 1500,
        dropClaimedBy: [],
      },
      participants: [],
    },
  ];
}

interface SpacesStoreState {
  rooms: SpaceRoom[];
  activeSpaceId: string | null;
  comments: SpaceComment[];
  reactions: SpaceReaction[];
  micPermissionError: string | null;
}

let state: SpacesStoreState = {
  rooms: createSeedRooms(),
  activeSpaceId: null,
  comments: [],
  reactions: [],
  micPermissionError: null,
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
const remoteAudioElements = new Map<string, HTMLAudioElement>();

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
  if (lobbyChannel) return;
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;

  lobbyChannel = supabase().channel("dubai-spaces-lobby");
  lobbyChannel
    .on("broadcast", { event: "space-upsert" }, ({ payload }) => {
      if (!payload || !payload.id) return;
      const incoming = payload as SpaceRoom;
      const exists = state.rooms.some((r) => r.id === incoming.id);
      state = {
        ...state,
        rooms: exists
          ? state.rooms.map((r) => (r.id === incoming.id ? { ...r, ...incoming } : r))
          : [incoming, ...state.rooms],
      };
      emit();
    })
    .on("broadcast", { event: "space-end" }, ({ payload }) => {
      if (!payload?.id) return;
      const endedId = payload.id as string;
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
    .subscribe();
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

function closeAllPeers() {
  peerConnections.forEach((pc) => {
    try {
      pc.close();
    } catch {
      /* ignore */
    }
  });
  peerConnections.clear();
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
}

function cleanupActiveRoom() {
  stopLocalMic();
  closeAllPeers();
  if (expiryInterval) {
    clearInterval(expiryInterval);
    expiryInterval = null;
  }
  if (roomChannel) {
    roomChannel.unsubscribe().catch(() => {});
    roomChannel = null;
  }
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
    return;
  }

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    localStream = stream;
    state = { ...state, micPermissionError: null };
    emit();

    // Attach track to any existing peer connections
    peerConnections.forEach((pc) => {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    });

    // Voice Activity Detection (VAD) for green pulsing speaking ring
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
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
    state = {
      ...state,
      micPermissionError: "Microphone access was blocked — you can still listen, comment, and react.",
    };
    emit();
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

function getOrCreatePeerConnection(peerId: string): RTCPeerConnection {
  const existing = peerConnections.get(peerId);
  if (existing) return existing;

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  peerConnections.set(peerId, pc);

  if (localStream) {
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream!);
    });
  }

  pc.onicecandidate = (e) => {
    if (e.candidate && roomChannel) {
      const me = meInfo();
      roomChannel
        .send({
          type: "broadcast",
          event: "webrtc-ice",
          payload: { from: me.id, to: peerId, candidate: e.candidate.toJSON() },
        })
        .catch(() => {});
    }
  };

  pc.ontrack = (e) => {
    const [remoteStream] = e.streams;
    if (!remoteStream || typeof document === "undefined") return;
    let audio = remoteAudioElements.get(peerId);
    if (!audio) {
      audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");
      audio.style.display = "none";
      document.body.appendChild(audio);
      remoteAudioElements.set(peerId, audio);
    }
    audio.srcObject = remoteStream;
    audio.play().catch(() => {});
  };

  return pc;
}

function subscribeToSpaceChannel(spaceId: string) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;

  if (roomChannel) {
    roomChannel.unsubscribe().catch(() => {});
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

      // Initiate WebRTC offer if I am an unmuted speaker on stage
      const myRoom = state.rooms.find((r) => r.id === spaceId);
      const mePart = myRoom?.participants.find((x) => x.id === me.id);
      if (mePart && mePart.role !== "listener" && p.id !== me.id) {
        const pc = getOrCreatePeerConnection(p.id);
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer).then(() => offer))
          .then((offer) => {
            roomChannel?.send({
              type: "broadcast",
              event: "webrtc-offer",
              payload: { from: me.id, to: p.id, sdp: offer },
            });
          })
          .catch(() => {});
      }
    })
    .on("broadcast", { event: "participant-patch" }, ({ payload }) => {
      if (!payload?.userId) return;
      updateParticipantInRoom(spaceId, payload.userId, payload.patch);
    })
    .on("broadcast", { event: "participant-leave" }, ({ payload }) => {
      if (!payload?.userId) return;
      const uid = payload.userId as string;
      const pc = peerConnections.get(uid);
      if (pc) {
        pc.close();
        peerConnections.delete(uid);
      }
      const audio = remoteAudioElements.get(uid);
      if (audio) {
        audio.remove();
        remoteAudioElements.delete(uid);
      }
      state = {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === spaceId ? { ...r, participants: r.participants.filter((p) => p.id !== uid) } : r
        ),
      };
      emit();
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
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        roomChannel?.send({
          type: "broadcast",
          event: "webrtc-answer",
          payload: { from: me.id, to: payload.from, sdp: answer },
        });
      } catch {
        /* ignore */
      }
    })
    .on("broadcast", { event: "webrtc-answer" }, async ({ payload }) => {
      if (!payload || payload.to !== me.id) return;
      try {
        const pc = peerConnections.get(payload.from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      } catch {
        /* ignore */
      }
    })
    .on("broadcast", { event: "webrtc-ice" }, async ({ payload }) => {
      if (!payload || payload.to !== me.id || !payload.candidate) return;
      try {
        const pc = getOrCreatePeerConnection(payload.from);
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch {
        /* ignore */
      }
    })
    .subscribe();
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
}): SpaceRoom {
  connectLobby();
  cleanupActiveRoom();

  const me = meInfo();
  const now = Date.now();
  const id = `space-${now}-${Math.random().toString(36).slice(2, 7)}`;

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
    hostId: me.id,
    hostUsername: me.username,
    hostPreset: me.preset,
    placeId: me.placeId,
    startedAt: now,
    expiresAt: now + SPACE_DURATION_MS,
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
        speaking: true,
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

  subscribeToSpaceChannel(id);
  broadcastRoomToLobby(newRoom);
  startExpiryWatcher();
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
  if (!room) return { ok: false, reason: "Space not found." };

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

  subscribeToSpaceChannel(spaceId);
  startExpiryWatcher();
  if (myRole !== "listener") {
    ensureLocalMic(true);
  }
  if (roomChannel) {
    roomChannel
      .send({ type: "broadcast", event: "participant-join", payload: myParticipant })
      .catch(() => {});
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

  if (room && room.hostId === me.id && !room.isSimulated && lobbyChannel) {
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
      .filter((r) => r.isSimulated || r.hostId !== me.id || r.id !== spaceId),
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

