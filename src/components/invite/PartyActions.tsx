"use client";

// What you can do at a party: free food and drinks (they fill your needs; drinks come with a hostess and a sparkler),
// dance, your messages (with how many are unread),
// and for the host, lights out (the
// room goes dark and the decorations glow) and getting everyone dancing. Both reach everyone in the room at once;
// the lights are also saved, for people who arrive later. Everyone sees a bubble when you do something.

import { useState } from "react";
import { openPhone } from "@/components/layout/PhoneOverlay";
import {
  adjustBalance,
  boostNeed,
  updateCitizen,
  useCitizen,
} from "@/lib/citizenStore";
import { useUnreadTotal } from "@/lib/unread";
import { PARTIES, setPartyLights, type PartyHere } from "@/lib/invites";
import { broadcastRoomEvent } from "@/lib/room";
import { CelebrityBoxingModal } from "@/components/games/CelebrityBoxingModal";
import { gameAudio } from "@/utils/gameAudio";

const A = PARTIES.actions;
type NeedKey = Parameters<typeof boostNeed>[0];

export type PartyPose = "dance" | "sit" | "sleep" | null;

export function PartyActions({
  party,
  lightsOut,
  onLights,
  onDance,
  pose,
  onPose,
  canSleep = true,
  announce,
  broadcast,
  className = "",
  list = false,
  onPlayBoard,
}: {
  party: PartyHere;
  lightsOut: boolean;
  onLights: (out: boolean) => void;
  onDance: (seconds: number) => void;
  /** What you're doing now (sitting or asleep stay until you tap again), and changing it. */
  pose?: PartyPose;
  onPose?: (p: PartyPose) => void;
  /** Lying down suits a home, not a club. */
  canSleep?: boolean;
  /** Tell the others in the room (a bubble over you). */
  announce: (text: string) => void;
  /** Tell everyone in the room right now (lights, dancing). */
  broadcast: (action: "lights" | "dance" | "drinks", on?: boolean) => void;
  className?: string;
  /** As a vertical list inside a popover (the side bar's 🎉 Party), without Messages (the bar has the phone). */
  list?: boolean;
  /** A two-player game outside the house (Connect Four, chess, Ludo): opens the picker. Homes only. */
  onPlayBoard?: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [boxingOpen, setBoxingOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [activeGameTab, setActiveGameTab] = useState<
    "owambe" | "proposal" | "engagement" | "babyshower" | "breakup" | "dinner"
  >("owambe");
  // Interactive mini-game states
  const [balloonTaps, setBalloonTaps] = useState(0);
  const [revealedGender, setRevealedGender] = useState<"girl" | "boy" | null>(
    null,
  );
  const [pinataHits, setPinataHits] = useState(0);
  const [dinnerStage, setDinnerStage] = useState(1);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [proposalStep, setProposalStep] = useState<
    "ready" | "kneeling" | "yes"
  >("ready");
  const { citizen } = useCitizen();
  const unread = useUnreadTotal(citizen?.id);
  const treat = (id: "food" | "drinks") => {
    const a = A[id];
    boostNeed(a.need as NeedKey, a.amount);
    gameAudio.playCoinSound();
    announce(a.say);
    // Drinks come with a hostess and a sparkler, for everyone to see.
    if (id === "drinks") broadcast("drinks");
    setBusy(id);
    setTimeout(() => setBusy(null), 1500);
  };
  const dance = () => {
    boostNeed(A.dance.need as NeedKey, A.dance.amount);
    gameAudio.playClickSound();
    announce(A.dance.say);
    onDance(A.dance.seconds);
  };
  const lights = async () => {
    const out = !lightsOut;
    onLights(out);
    broadcast("lights", out);
    gameAudio.playClickSound();
    await setPartyLights(party.code, out);
  };
  const btn = list
    ? "h-11 pl-3 pr-4 rounded-full bg-white/95 text-slate-900 shadow-xl flex flex-row items-center gap-2 text-xs font-black active:scale-95 transition-transform [&>span]:text-lg"
    : "shrink-0 h-12 min-w-[4.25rem] px-2 rounded-2xl bg-white/95 text-slate-900 shadow-lg flex flex-col items-center justify-center text-[10px] font-black active:scale-95 transition-transform";
  return (
    <>
      <div
        className={
          list
            ? "flex flex-col items-end gap-2"
            : `fixed left-1/2 -translate-x-1/2 z-40 flex gap-1.5 max-w-[96vw] overflow-x-auto px-1 py-2 [scrollbar-width:none] ${className}`
        }
        role="toolbar"
        aria-label="Party actions"
      >
        <button
          onClick={() => treat("food")}
          disabled={busy === "food"}
          className={btn}
        >
          <span className="text-lg leading-none">{A.food.icon}</span>
          {busy === "food" ? "Yum!" : "Food"}
        </button>
        <button
          onClick={() => treat("drinks")}
          disabled={busy === "drinks"}
          className={btn}
        >
          <span className="text-lg leading-none">{A.drinks.icon}</span>
          {busy === "drinks" ? "Cheers!" : "Drinks"}
        </button>
        <button
          onClick={dance}
          className={`${btn} ${pose === "dance" ? "!bg-fuchsia-600 !text-white" : ""}`}
        >
          <span className="text-lg leading-none">{A.dance.icon}</span>Dance
        </button>
        <button
          onClick={() => {
            if ((citizen?.balance ?? 0) < 10000) {
              announce("⚠️ Minimum AED 10,000 required to spray money!");
              return;
            }
            adjustBalance(-10000);
            boostNeed("social", 25);
            gameAudio.playCoinSound();
            announce("💸✨ sprayed AED 10,000 cash in the air!");
            broadcastRoomEvent({
              type: "spray_money",
              amount: 10000,
            });
          }}
          className={btn}
        >
          <span className="text-lg leading-none">💸</span>Spray AED 10,000
        </button>
        {onPlayBoard && (
          <button
            onClick={() => {
              gameAudio.playClickSound();
              onPlayBoard();
            }}
            className={`${btn} !bg-fuchsia-600 !text-white`}
          >
            <span className="text-lg leading-none">🎲</span>Let&apos;s play
          </button>
        )}
        <button
          onClick={() => {
            gameAudio.playClickSound();
            setBoxingOpen(true);
          }}
          className={btn}
        >
          <span className="text-lg leading-none">🥊</span>Boxing
        </button>
        <button
          onClick={() => {
            gameAudio.playClickSound();
            setGamesOpen(true);
          }}
          className={`${btn} !bg-amber-400 !text-slate-950`}
        >
          <span className="text-lg leading-none">🎮</span>Party Games
        </button>
        {onPose && (
          <button
            onClick={() => {
              onPose(pose === "sit" ? null : "sit");
              announce(pose === "sit" ? "🙂 is up again" : "🪑 sat down");
            }}
            className={`${btn} ${pose === "sit" ? "!bg-fuchsia-600 !text-white" : ""}`}
          >
            <span className="text-lg leading-none">🪑</span>
            {pose === "sit" ? "Stand" : "Sit"}
          </button>
        )}
        {onPose && canSleep && (
          <button
            onClick={() => {
              onPose(pose === "sleep" ? null : "sleep");
              announce(pose === "sleep" ? "🥱 woke up" : "😴 dozed off");
            }}
            className={`${btn} ${pose === "sleep" ? "!bg-indigo-600 !text-white" : ""}`}
          >
            <span className="text-lg leading-none">😴</span>
            {pose === "sleep" ? "Wake up" : "Sleep"}
          </button>
        )}
        {!list && (
          <button
            onClick={() => openPhone("page:/phone")}
            className={`${btn} relative`}
            aria-label={unread ? `Messages, ${unread} unread` : "Messages"}
          >
            <span className="text-lg leading-none">💬</span>Messages
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        )}
        {party.isHost && (
          <button
            onClick={() => {
              dance();
              broadcast("dance");
            }}
            className={btn}
          >
            <span className="text-lg leading-none">🪩</span>Everyone
          </button>
        )}
        {party.isHost && (
          <button
            onClick={lights}
            className={`${btn} ${lightsOut ? "!bg-slate-900 !text-amber-300" : ""}`}
          >
            <span className="text-lg leading-none">
              {lightsOut ? "💡" : "🌙"}
            </span>
            {lightsOut ? "Lights on" : "Lights out"}
          </button>
        )}
      </div>
      {gamesOpen && (
        <div
          className="fixed inset-0 z-[220] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
          onClick={() => setGamesOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-4 space-y-3 shadow-2xl max-h-[88dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  🎮 Interactive Party Celebration Hub
                </h3>
                <p className="text-[11px] text-slate-500">
                  Play live multiplayer party mini-games with everyone in the
                  room!
                </p>
              </div>
              <button
                onClick={() => setGamesOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs"
              >
                ✕
              </button>
            </div>

            {/* 6 Celebration Game Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { id: "owambe" as const, label: "🇳🇬 Owambe & Asoebi" },
                { id: "proposal" as const, label: "💍 Proposal Kneel" },
                { id: "engagement" as const, label: "🥂 Engagement Quiz" },
                { id: "babyshower" as const, label: "🎈 Baby Shower Reveal" },
                { id: "breakup" as const, label: "🪅 Breakup Piñata" },
                { id: "dinner" as const, label: "🍽️ 4-Course Dinner" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    gameAudio.playClickSound();
                    setActiveGameTab(t.id);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap border ${
                    activeGameTab === t.id
                      ? "bg-slate-900 text-amber-300 border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* #14 Lagos Owambe Asoebi & Money Spraying */}
            {activeGameTab === "owambe" && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                <div className="font-black text-sm text-emerald-950">
                  🇳🇬 Lagos Owambe Asoebi &amp; Money Spray
                </div>
                <p className="text-xs text-emerald-800">
                  Match the host&apos;s Emerald &amp; Gold Asoebi dress code in
                  1 tap, or flick crisp AED notes onto the dancefloor!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playCoinSound();
                    const isWoman =
                      (citizen?.look?.gender ?? "woman") === "woman";
                    const outfitId = isWoman ? "ng_asoebi" : "ng_agbada";
                    updateCitizen((c) => ({
                      ...c,
                      outfit: outfitId,
                      look: {
                        ...(c.look ?? { gender: "woman" }),
                        wear: outfitId,
                        primaryColor: "#065f46",
                        secondaryColor: "#d4af37",
                        wigId: isWoman ? "gele_crown" : "fila_cap",
                      },
                    }));
                    announce("🇳🇬👗 matched the Emerald & Gold Lagos Asoebi!");
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs active:scale-95"
                >
                  👗 1-Tap Wear Emerald &amp; Gold Asoebi
                </button>
                <div className="grid grid-cols-3 gap-1.5">
                  {[10000, 25000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        if (!adjustBalance(-amt)) {
                          announce("⚠️ Not enough AED in your wallet to spray!");
                          return;
                        }
                        gameAudio.playCoinSound();
                        boostNeed("social", 25);
                        announce(
                          `💸🇳🇬 Oshey! Sprayed AED ${amt.toLocaleString()} at the Owambe!`,
                        );
                        broadcastRoomEvent({
                          type: "spray_money",
                          amount: amt,
                        });
                      }}
                      className="py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs active:scale-95"
                    >
                      💸 Spray {amt >= 1000 ? `${amt / 1000}k` : amt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* #12 Proposal Party Kneel QTE */}
            {activeGameTab === "proposal" && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5 text-center">
                <div className="font-black text-sm text-rose-950">
                  💍 Romantic Proposal Kneel QTE
                </div>
                <p className="text-xs text-rose-800">
                  Drop to one knee, open the velvet diamond ring box, and pop
                  the question in front of everyone!
                </p>
                <div className="text-4xl py-1">
                  {proposalStep === "ready"
                    ? "🧎‍♂️💎"
                    : proposalStep === "kneeling"
                      ? "💍✨"
                      : "💖🥂💖"}
                </div>
                {proposalStep === "ready" && (
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playClickSound();
                      setProposalStep("kneeling");
                      announce(
                        "🧎‍♂️💍 dropped down on one knee with a velvet ring box!",
                      );
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs active:scale-95"
                  >
                    🧎‍♂️ Step 1: Drop to One Knee
                  </button>
                )}
                {proposalStep === "kneeling" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playCoinSound();
                        setProposalStep("yes");
                        boostNeed("social", 40);
                        boostNeed("fun", 40);
                        announce(
                          "💍💖 SAID YES!! Champagne & fireworks erupt across the room!",
                        );
                        broadcast("drinks");
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs active:scale-95"
                    >
                      💍 YES! A Thousand Times Yes!
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProposalStep("ready");
                        announce("😳 asked for a little more time...");
                      }}
                      className="px-3 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-black text-xs"
                    >
                      Let&apos;s Wait
                    </button>
                  </div>
                )}
                {proposalStep === "yes" && (
                  <button
                    type="button"
                    onClick={() => setProposalStep("ready")}
                    className="w-full py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
                  >
                    🥂 Newly Engaged! Play Again
                  </button>
                )}
              </div>
            )}

            {/* #13 Engagement Party Compatibility Quiz */}
            {activeGameTab === "engagement" && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2.5">
                <div className="font-black text-sm text-amber-950">
                  🥂 Couple Compatibility Quiz &amp; Ring Toast
                </div>
                <p className="text-xs text-amber-800">
                  Test how well the couple matches on Dubai dream home,
                  honeymoon destination &amp; ring cut!
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: "💎 Emerald Cut", pts: 98 },
                    { label: "💖 Oval Solitaire", pts: 95 },
                    { label: "👑 Royal Halo", pts: 100 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        gameAudio.playCoinSound();
                        setQuizScore(opt.pts);
                        adjustBalance(200);
                        announce(
                          `🥂💎 scored ${opt.pts}% in the Engagement Compatibility Quiz (+AED 200)!`,
                        );
                      }}
                      className="py-2 px-1.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-slate-900 font-black text-[11px] active:scale-95"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {quizScore !== null && (
                  <div className="text-center text-xs font-black text-emerald-700">
                    🎉 {quizScore}% Soulmate Match! +AED 200 Engagement Toast
                    Bonus!
                  </div>
                )}
              </div>
            )}

            {/* #11 Baby Shower Giant Gender-Reveal Balloon Pop */}
            {activeGameTab === "babyshower" && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-50 via-white to-sky-50 border border-pink-200 space-y-2.5 text-center">
                <div className="font-black text-sm text-slate-900">
                  🎈 Gender Reveal Giant Balloon Pop
                </div>
                <p className="text-xs text-slate-600">
                  Tap the giant black-and-gold balloon 5 times with guests to
                  pop it and reveal the baby&apos;s gender!
                </p>
                <div className="text-4xl py-1">
                  {revealedGender === "girl"
                    ? "💗👧🌸"
                    : revealedGender === "boy"
                      ? "💙👦🚀"
                      : "🎈✨Pin"}
                </div>
                {!revealedGender ? (
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playClickSound();
                      const next = balloonTaps + 1;
                      if (next >= 5) {
                        gameAudio.playCoinSound();
                        const g = Math.random() > 0.5 ? "girl" : "boy";
                        setRevealedGender(g);
                        adjustBalance(150);
                        announce(
                          g === "girl"
                            ? "💗🎉 POPPED THE BALLOON — IT'S A BABY GIRL! Pink confetti everywhere!"
                            : "💙🎉 POPPED THE BALLOON — IT'S A BABY BOY! Blue confetti everywhere!",
                        );
                      } else {
                        setBalloonTaps(next);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-black text-xs active:scale-95"
                  >
                    📌 Tap to Inflate &amp; Pop Balloon ({balloonTaps}/5)
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div
                      className={`text-sm font-black ${revealedGender === "girl" ? "text-pink-600" : "text-sky-600"}`}
                    >
                      {revealedGender === "girl"
                        ? "💗 IT'S A GIRL! (+AED 150 Raffle Win)"
                        : "💙 IT'S A BOY! (+AED 150 Raffle Win)"}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBalloonTaps(0);
                        setRevealedGender(null);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-slate-200 text-slate-800 font-black text-xs"
                    >
                      Reset Balloon
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* #15 Breakup Piñata Smash */}
            {activeGameTab === "breakup" && (
              <div className="p-3.5 rounded-2xl bg-fuchsia-50 border border-fuchsia-200 space-y-2.5 text-center">
                <div className="font-black text-sm text-fuchsia-950">
                  🪅 Ex-Piñata Smash &amp; Glow-Up
                </div>
                <p className="text-xs text-fuchsia-800">
                  Smash the toxic Ex-Piñata 5 times to burst AED 250 cash and
                  unlock the Unbothered Glow-Up buff!
                </p>
                <div className="text-4xl py-1">
                  {pinataHits >= 5 ? "💥💸👑" : "🪅🏏"}
                </div>
                {pinataHits < 5 ? (
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playClickSound();
                      const next = pinataHits + 1;
                      setPinataHits(next);
                      if (next >= 5) {
                        gameAudio.playCoinSound();
                        adjustBalance(250);
                        boostNeed("fun", 45);
                        announce(
                          "🪅💥 SMASHED the Ex-Piñata! +AED 250 & Unbothered Glow-Up unlocked!",
                        );
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs active:scale-95"
                  >
                    🏏 Swing Bat at Ex-Piñata ({pinataHits}/5)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPinataHits(0)}
                    className="w-full py-2 rounded-xl bg-emerald-600 text-white font-black text-xs"
                  >
                    👑 +AED 250 Claimed! Hang Another Piñata
                  </button>
                )}
              </div>
            )}

            {/* #17 Luxury 4-Course Dinner Party */}
            {activeGameTab === "dinner" && (
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-amber-300">
                    🍽️ 4-Stage Luxury Dinner with Friends
                  </span>
                  <span className="text-[11px] font-bold text-white/70">
                    Course {dinnerStage}/4
                  </span>
                </div>
                <p className="text-xs text-white/80">
                  {dinnerStage === 1
                    ? "Course 1: Clink crystal glasses with everyone at the table."
                    : dinnerStage === 2
                      ? "Course 2: Garnish 24K Gold-Leaf Wagyu Tomahawk at the table."
                      : dinnerStage === 3
                        ? "Course 3: Pass the microphone and deliver the Table Toast."
                        : "Course 4: Cover the full table bill like a Dubai Big Baller or split 50/50!"}
                </p>
                {dinnerStage < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playClickSound();
                      const next = dinnerStage + 1;
                      setDinnerStage(next);
                      boostNeed("hunger", 25);
                      boostNeed("social", 20);
                      announce(
                        dinnerStage === 1
                          ? "🥂 clinked glasses for Course 1 Welcome Drinks!"
                          : dinnerStage === 2
                            ? "🥩✨ plated the 24K Gold-Leaf Wagyu main course!"
                            : "🎤🥂 stood up and gave an unforgettable Dinner Table Toast!",
                      );
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs active:scale-95"
                  >
                    {dinnerStage === 1
                      ? "🥂 Stage 1: Clink Welcome Drinks"
                      : dinnerStage === 2
                        ? "👨‍🍳 Stage 2: Plate 24K Gold Wagyu"
                        : "🎤 Stage 3: Deliver Table Toast"}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!adjustBalance(-300)) return;
                        gameAudio.playCoinSound();
                        boostNeed("social", 50);
                        setDinnerStage(1);
                        announce(
                          "💳👑 covered the ENTIRE table bill (AED 300) — Ultimate Dubai Big Baller!",
                        );
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs active:scale-95"
                    >
                      💳 Cover Full Bill (AED 300)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playCoinSound();
                        setDinnerStage(1);
                        announce(
                          "🧾🤝 split the luxury dinner bill evenly with the table!",
                        );
                      }}
                      className="px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-black text-xs"
                    >
                      Split Bill
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <CelebrityBoxingModal
        open={boxingOpen}
        onOpenChange={setBoxingOpen}
        opponent={{
          username: party.host || "PartyChampion",
          name: party.host || "Party Champion",
        }}
        onBroadcastResult={(summary) => announce(summary)}
      />
    </>
  );
}
