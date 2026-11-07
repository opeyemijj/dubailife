"use client";

// Incoming messages, gifts, invites, and interactive party/combat events from people in the same room.

import { useEffect, useState } from "react";
import { broadcastRoomEvent, type Received } from "@/lib/room";
import { adjustBalance, boostNeed, useCitizen } from "@/lib/citizenStore";
import { CelebrityBoxingModal, type BoxingOpponent } from "@/components/games/CelebrityBoxingModal";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { gameAudio } from "@/utils/gameAudio";

const LIFE_MS = 9000;
const INVITE_MS = 16000;

function describe(e: Received): { icon: string; text: string } {
  const who = `@${e.from.username}`;
  switch (e.type) {
    case "chat":
      return { icon: "💬", text: `${who}: ${e.text}` };
    case "wave":
      return { icon: "👋", text: `${who} waved at you` };
    case "money":
      return { icon: "💸", text: `${who} sent you AED ${e.amount.toLocaleString()}` };
    case "gift":
      return { icon: e.gift.icon, text: `${who} bought you a ${e.gift.name.toLowerCase()}` };
    case "invite":
      return {
        icon: e.kind === "dance" ? "💃" : e.kind === "table" ? "🪑" : "🙌",
        text:
          e.kind === "dance"
            ? `${who} wants to dance with you`
            : e.kind === "table"
            ? `${who} invited you to their table`
            : `${who} invited you to join them`,
      };
    case "accept":
      return {
        icon: "✅",
        text: `${who} accepted — ${
          e.kind === "dance"
            ? "time to dance!"
            : e.kind === "table"
            ? "they're coming to your table"
            : "they're on their way"
        }`,
      };
    case "served":
      return { icon: "🍽️", text: `${who} ordered` };
    case "friend":
      return { icon: "🤝", text: `${who} sent you a friend request` };
    case "party":
      return {
        icon: "🎉",
        text:
          e.action === "dance"
            ? `${who} got everyone dancing`
            : e.action === "drinks"
            ? `${who} ordered drinks`
            : `${who} turned the lights ${e.on ? "out" : "on"}`,
      };
    case "typing":
      return { icon: "✍️", text: `${who} is typing…` };
    case "bottle":
      return { icon: "🍾", text: `${who} ordered bottle service!` };
    case "consumption":
      return {
        icon: e.action === "drink" ? "🍸" : "🍴",
        text: `${who} is having a ${e.action === "drink" ? "drink" : "bite"}`,
      };
    case "home":
      return { icon: "🛋️", text: `${who} changed something in the home` };
    case "rock":
      return {
        icon: "🍑",
        text: `${who} is rocking on the beat with @${e.targetUsername}!`,
      };
    case "slap":
      return {
        icon: "👋⚡",
        text: `${who} swung a slap at @${e.targetUsername}!`,
      };
    case "brawl":
      return {
        icon: "🥊💥",
        text: `BRAWL! ${who} and @${e.targetUsername} are fighting!`,
      };
    case "separate":
      return {
        icon: "🕊️",
        text: `${who} separated @${e.fighterA} & @${e.fighterB} and restored peace!`,
      };
    case "gang_beat":
      return {
        icon: "👊🔥",
        text: `GANG JUMP! ${who} (${e.allies.length} allies) vs @${e.targetUsername}!`,
      };
    case "boxing":
      return {
        icon: "🥊",
        text: `${who} challenged @${e.targetUsername} to Celebrity Boxing (AED ${e.purse.toLocaleString()})!`,
      };
    case "spray_money":
      return {
        icon: "💸",
        text: `${who} sprayed AED ${e.amount.toLocaleString()} cash in the air${
          e.targetUsername ? ` on @${e.targetUsername}` : ""
        }!`,
      };
    case "boxing_challenge":
      return {
        icon: "🥊",
        text: `${who} challenged @${e.targetUsername} to Celebrity Boxing (AED ${e.purse.toLocaleString()})!`,
      };
    case "boxing_accept":
      return {
        icon: "🥊🔔",
        text: `@${e.opponentUsername ?? who} accepted the boxing bout! Let's get ready to rumble!`,
      };
    case "boxing_decline":
      return {
        icon: "🥊❌",
        text: `@${e.opponentUsername ?? who} declined the boxing challenge.`,
      };
    default:
      return { icon: "✨", text: `${who} shared an update` };
  }
}

export function SocialFeed({
  events,
  onAccept,
  onFriend,
  onReply,
  readingWith,
}: {
  events: Received[];
  onAccept: (e: Received & { type: "invite" }) => void;
  onFriend: (e: Received) => void;
  /** Opens the conversation with whoever sent a message. */
  onReply: (e: Received) => void;
  /** The conversation on screen; its messages don't need a card. */
  readingWith?: string | null;
}) {
  const { citizen } = useCitizen();
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState<Set<string>>(new Set());
  const [peacemakerTarget, setPeacemakerTarget] = useState<{ a: string; b: string; progress: number } | null>(null);
  const [boxingModalOpp, setBoxingModalOpp] = useState<{ opp: BoxingOpponent; purse: number } | null>(null);
  const [bannerToast, setBannerToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Listen for boxing match acceptance when this user is the challenger
  useEffect(() => {
    const onRoomAction = (rawEv: Event) => {
      const detail = (rawEv as CustomEvent<{
        event?: {
          type?: string;
          challengerId?: string;
          challengerUsername?: string;
          opponentId?: string;
          opponentUsername?: string;
          opponentLook?: AvatarLookProps;
          purse?: number;
        };
      }>).detail;
      const roomEv = detail?.event;
      if (!roomEv?.type) return;
      if (roomEv.type === "boxing_accept") {
        const isMyChallenge =
          roomEv.challengerId === (citizen?.id ?? "me") ||
          roomEv.challengerUsername === citizen?.username;
        if (isMyChallenge && !boxingModalOpp) {
          gameAudio.playConfirmSound();
          setBoxingModalOpp({
            opp: {
              userId: roomEv.opponentId,
              username: roomEv.opponentUsername ?? "Opponent",
              name: roomEv.opponentUsername ?? "Opponent",
              look: roomEv.opponentLook,
            },
            purse: roomEv.purse ?? 2500,
          });
        }
      }
    };
    window.addEventListener("cometodubai:room-action", onRoomAction);
    return () => window.removeEventListener("cometodubai:room-action", onRoomAction);
  }, [citizen?.id, citizen?.username, boxingModalOpp]);

  const flashToast = (msg: string) => {
    setBannerToast(msg);
    setTimeout(() => setBannerToast(null), 3200);
  };

  const visible = events
    .filter(
      (e) =>
        !done.has(e.id) &&
        !(e.type === "chat" && e.from.userId === readingWith) &&
        e.type !== "money" &&
        e.type !== "bottle" &&
        e.type !== "served" &&
        e.type !== "consumption" &&
        e.type !== "accept" &&
        now - e.at <
          (e.type === "invite" ||
          e.type === "friend" ||
          e.type === "brawl" ||
          e.type === "gang_beat" ||
          e.type === "boxing" ||
          e.type === "boxing_challenge"
            ? INVITE_MS
            : LIFE_MS)
    )
    .slice(-3);

  const dismiss = (id: string) => setDone((d) => new Set(d).add(id));

  if (visible.length === 0 && !peacemakerTarget && !boxingModalOpp && !bannerToast) return null;

  return (
    <>
      <div className="absolute left-1/2 -translate-x-1/2 top-28 z-40 w-[min(390px,calc(100vw-24px))] space-y-2 pointer-events-none">
        {bannerToast && (
          <div className="pointer-events-auto bg-emerald-600/95 text-white text-xs font-black px-3.5 py-2 rounded-2xl shadow-xl text-center">
            {bannerToast}
          </div>
        )}

        {peacemakerTarget && (
          <div className="pointer-events-auto bg-slate-950/95 border border-emerald-400/50 rounded-2xl p-3 text-white shadow-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-black">
              <span>🕊️ Peacemaker Tug-of-War: Pull @{peacemakerTarget.a} & @{peacemakerTarget.b} Apart!</span>
              <span className="text-emerald-400">{peacemakerTarget.progress}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all"
                style={{ width: `${peacemakerTarget.progress}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                gameAudio.playClickSound();
                const next = Math.min(100, peacemakerTarget.progress + 34);
                if (next >= 100) {
                  adjustBalance(150);
                  boostNeed("social", 20);
                  gameAudio.playCoinSound();
                  broadcastRoomEvent({
                    type: "separate",
                    fighterA: peacemakerTarget.a,
                    fighterB: peacemakerTarget.b,
                  });
                  setPeacemakerTarget(null);
                  flashToast("🕊️ Peace Restored! You earned +AED 150 Peacemaker Bonus!");
                } else {
                  setPeacemakerTarget({ ...peacemakerTarget, progress: next });
                }
              }}
              className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs active:scale-95 transition"
            >
              🕊️ TAP TO PULL BRAWLERS APART (+AED 150)
            </button>
          </div>
        )}

        {visible.map((e) => {
          const { icon, text } = describe(e);
          return (
            <div
              key={e.id}
              className={`pointer-events-auto flex flex-wrap items-center gap-2 bg-slate-950/90 backdrop-blur-md text-white rounded-2xl px-3 py-2 shadow-2xl border ${
                e.type === "chat"
                  ? "border-sky-400 ring-2 ring-sky-400/60 animate-[pulse_1s_ease-in-out_3]"
                  : e.type === "slap" || e.type === "brawl" || e.type === "gang_beat"
                  ? "border-rose-500/60 ring-1 ring-rose-500/40"
                  : "border-white/10"
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span className="flex-1 min-w-0 text-xs font-bold break-words">{text}</span>

              {e.type === "invite" && (
                <button
                  onClick={() => {
                    onAccept(e);
                    dismiss(e.id);
                  }}
                  className="h-7 px-2.5 rounded-full bg-emerald-500 text-[11px] font-black"
                >
                  Accept
                </button>
              )}
              {e.type === "chat" && (
                <button
                  onClick={() => {
                    onReply(e);
                    dismiss(e.id);
                  }}
                  className="h-7 px-2.5 rounded-full bg-sky-500 text-[11px] font-black"
                >
                  Reply
                </button>
              )}
              {e.type === "friend" && (
                <button
                  onClick={() => {
                    onFriend(e);
                    dismiss(e.id);
                  }}
                  className="h-7 px-2.5 rounded-full bg-emerald-500 text-[11px] font-black"
                >
                  Add back
                </button>
              )}

              {/* #2 Slap: 1.2s Reflex Dodge or Fight Back */}
              {e.type === "slap" && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playCoinSound();
                      boostNeed("fun", 15);
                      flashToast(`💨 Clean Dodge! You slipped @${e.from.username}'s slap!`);
                      dismiss(e.id);
                    }}
                    className="h-7 px-2.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black"
                  >
                    ⚡ Dodge!
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playClickSound();
                      broadcastRoomEvent({
                        type: "brawl",
                        targetId: e.from.userId,
                        targetUsername: e.from.username,
                      });
                      dismiss(e.id);
                    }}
                    className="h-7 px-2.5 rounded-full bg-rose-600 text-white text-[11px] font-black"
                  >
                    🥊 Fight Back
                  </button>
                </div>
              )}

              {/* #2 Brawl: Peacemaker Separation for Bystanders */}
              {e.type === "brawl" && (
                <button
                  type="button"
                  onClick={() => {
                    setPeacemakerTarget({
                      a: e.from.username,
                      b: e.targetUsername,
                      progress: 34,
                    });
                    dismiss(e.id);
                  }}
                  className="h-7 px-2.5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black"
                >
                  🕊️ Separate Fight
                </button>
              )}

              {/* #3 Gang Beat: Join Squad Jump or Turtle Block */}
              {e.type === "gang_beat" && (
                <div className="flex gap-1">
                  {e.targetUsername === citizen?.username ? (
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playClickSound();
                        flashToast("🛡️ High Turtle Guard activated! Reduced gang jump damage by 70%!");
                        dismiss(e.id);
                      }}
                      className="h-7 px-2.5 rounded-full bg-sky-500 text-white text-[11px] font-black"
                    >
                      🛡️ Turtle Block
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playCoinSound();
                        adjustBalance(100);
                        const nextAllies = Array.from(
                          new Set([...e.allies, citizen?.username ?? "ally"])
                        );
                        broadcastRoomEvent({
                          type: "gang_beat",
                          targetId: e.targetId,
                          targetUsername: e.targetUsername,
                          allies: nextAllies,
                        });
                        flashToast(
                          `👊🔥 Joined Gang Jump (${nextAllies.length} allies)! +AED 100 Street Cred!`
                        );
                        dismiss(e.id);
                      }}
                      className="h-7 px-2.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black"
                    >
                      👊 Join ({e.allies.length}/2+)
                    </button>
                  )}
                </div>
              )}

              {/* #4 Celebrity Boxing Challenge with Accept and Deny buttons */}
              {(e.type === "boxing_challenge" || e.type === "boxing") && (
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playConfirmSound();
                      const challengerId = ("challengerId" in e && e.challengerId) || e.from.userId;
                      const challengerUsername = ("challengerUsername" in e && e.challengerUsername) || e.from.username;
                      const challengerName = ("challengerName" in e && e.challengerName) || e.from.name;
                      const challengerLook = ("challengerLook" in e && e.challengerLook) || e.from.look;
                      const purse = e.purse ?? 2500;

                      broadcastRoomEvent({
                        type: "boxing_accept",
                        challengerId,
                        challengerUsername,
                        opponentId: citizen?.id ?? citizen?.username ?? "opponent",
                        opponentUsername: citizen?.username ?? "Opponent",
                        purse,
                        opponentLook: citizen?.look,
                      });

                      setBoxingModalOpp({
                        opp: {
                          userId: challengerId,
                          username: challengerUsername,
                          name: challengerName,
                          look: challengerLook,
                        },
                        purse,
                      });
                      flashToast(`🥊 Accepted boxing match vs @${challengerUsername}! Entering the ring!`);
                      dismiss(e.id);
                    }}
                    className="h-7 px-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black active:scale-95 transition"
                  >
                    🥊 Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playClickSound();
                      const challengerId = ("challengerId" in e && e.challengerId) || e.from.userId;
                      const challengerUsername = ("challengerUsername" in e && e.challengerUsername) || e.from.username;

                      broadcastRoomEvent({
                        type: "boxing_decline",
                        challengerId,
                        challengerUsername,
                        opponentId: citizen?.id ?? citizen?.username ?? "opponent",
                        opponentUsername: citizen?.username ?? "Opponent",
                      });
                      flashToast(`❌ Declined boxing challenge from @${challengerUsername}.`);
                      dismiss(e.id);
                    }}
                    className="h-7 px-2 rounded-full bg-white/20 hover:bg-rose-600/80 text-white text-[11px] font-black active:scale-95 transition"
                  >
                    ✕ Deny
                  </button>
                </div>
              )}

              <button
                onClick={() => dismiss(e.id)}
                className="h-7 w-7 rounded-full bg-white/10 text-[11px] font-black"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {boxingModalOpp && (
        <CelebrityBoxingModal
          open={!!boxingModalOpp}
          onOpenChange={(o) => {
            if (!o) setBoxingModalOpp(null);
          }}
          opponent={boxingModalOpp.opp}
          initialPurse={boxingModalOpp.purse}
        />
      )}
    </>
  );
}
