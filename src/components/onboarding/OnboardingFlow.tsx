"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, Shuffle, Check, Sparkles, Building, Briefcase, 
  Utensils, PartyPopper, Dumbbell, Smile, Moon, Sparkle, Trophy,
  Star, Heart, Shield, CheckCircle2, Home, Landmark, Camera, X
} from "lucide-react";
import { AvatarCanvas, type AvatarLookProps } from "./AvatarCanvas";
import { BODY_TYPES, defaultBodyType } from "@/components/avatar/bodyShape";
import { ROSTER, defaultPreset, presetFor, rosterFor, rosterThumb } from "@/components/avatar/roster";
import { AvaturnCreator, type CreatedAvatar } from "@/components/avatar/AvaturnCreator";
import { createProfile, useCitizen } from "@/lib/citizenStore";
import { clearSignupDraft, updateSignupDraft, useSignupDraft } from "@/lib/signupDraft";
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboardingSteps";


const DEFAULT_LOOK: AvatarLookProps = { gender: "woman", preset: defaultPreset("woman"), bodyType: "Hourglass" };
const DEFAULT_TRAITS = ["Hustler"];
const DEFAULT_DREAM = "Corporate Titan";
const DEFAULT_HOME = "Business Bay Studio";

type Updater<T> = T | ((prev: T) => T);
const resolve = <T,>(u: Updater<T>, prev: T): T => (typeof u === "function" ? (u as (p: T) => T)(prev) : u);

export function OnboardingFlow({ step }: { step: OnboardingStep }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draft = useSignupDraft();
  const { isLoggedIn, hydrated, session } = useCitizen();
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const currentStep = ONBOARDING_STEPS.indexOf(step) + 1; // 1: Look, 2: Personality, 3: Dream, 4: Birth Lottery, 5: Home
  const setCurrentStep = (n: number) => router.push(`/onboarding/${ONBOARDING_STEPS[n - 1]}`);
  // From the draft, or — if the confirmation link opened elsewhere — from the account itself.
  const meta = session?.meta as { username?: string; display_name?: string } | undefined;
  // The draft only counts if it belongs to the account that's actually signed in.
  const draftMatches = !!draft?.account?.email && draft.account.email.toLowerCase() === session?.email?.toLowerCase();
  const account = (draftMatches ? draft?.account : undefined) ?? (meta?.username ? { name: meta.display_name ?? meta.username, username: meta.username, email: session?.email } : undefined);
  const username = account?.username || "citizen";

  // Every choice is saved to the sign-up draft, so a refresh on any step keeps it.
  const look = draft?.look ?? DEFAULT_LOOK;
  const setLook = (u: Updater<AvatarLookProps>) => updateSignupDraft((d) => ({ look: resolve(u, d.look ?? DEFAULT_LOOK) }));
  const selectedTraits = draft?.traits ?? DEFAULT_TRAITS;
  const setSelectedTraits = (u: Updater<string[]>) => updateSignupDraft((d) => ({ traits: resolve(u, d.traits ?? DEFAULT_TRAITS) }));
  const selectedDream = draft?.dream ?? DEFAULT_DREAM;
  const setSelectedDream = (dream: string) => updateSignupDraft({ dream });
  const selectedHome = draft?.home ?? DEFAULT_HOME;
  const setSelectedHome = (home: string) => updateSignupDraft({ home });

  // The selfie creator has its own URL too (/onboarding/look?selfie=open).
  const selfieOpen = step === "look" && searchParams.get("selfie") === "open";
  const setSelfieOpen = (open: boolean) => router.replace(open ? "/onboarding/look?selfie=open" : "/onboarding/look", { scroll: false });

  // Onboarding needs a signed-in account without a profile yet. Finished citizens go home;
  // unconfirmed sign-ups wait for their email; skipping past an unfinished personality step goes back.
  useEffect(() => {
    if (!draft || !hydrated || finishing) return;
    if (isLoggedIn) router.replace("/home");
    else if (!session) router.replace(draft.account ? "/?signup=true&confirm=email" : "/?signup=true");
    else if (currentStep > 2 && (draft.traits ?? DEFAULT_TRAITS).length !== 2) router.replace("/onboarding/personality");
  }, [draft, hydrated, session, isLoggedIn, finishing, currentStep, router]);

  const handleSelfieCreated = useCallback((created: CreatedAvatar) => {
    updateSignupDraft((d) => ({ look: { ...(d.look ?? DEFAULT_LOOK), gender: created.gender, custom: { avatarId: created.avatarId, url: created.url } } }));
    router.replace("/onboarding/look", { scroll: false });
  }, [router]);

  const chooseGender = (gender: "woman" | "man") =>
    setLook((prev) => prev.gender === gender ? prev : { gender, preset: defaultPreset(gender), bodyType: defaultBodyType(gender) });

  // Randomize look: a random citizen and body type
  const handleRandomize = () => {
    const pick = ROSTER[Math.floor(Math.random() * ROSTER.length)];
    const types = BODY_TYPES[pick.gender];
    setLook({ gender: pick.gender, preset: pick.id, bodyType: types[Math.floor(Math.random() * types.length)] });
  };

  const handleTraitToggle = (trait: string) => {
    if (selectedTraits.includes(trait)) {
      setSelectedTraits(prev => prev.filter(t => t !== trait));
    } else {
      if (selectedTraits.length < 2) {
        setSelectedTraits(prev => [...prev, trait]);
      } else {
        setSelectedTraits([selectedTraits[1], trait]);
      }
    }
  };

  const handleFinishOnboarding = async () => {
    if (!account) return;
    setFinishing(true);
    setFinishError(null);
    const result = await createProfile({
      username: account.username,
      name: account.name,
      balance: selectedHome.includes("Marina") ? 100000 : selectedHome.includes("Business Bay") ? 50000 : 30000,
      game: { look, traits: selectedTraits, dream: selectedDream, home: selectedHome },
    });
    if (!result.ok) {
      setFinishing(false);
      setFinishError(result.error);
      return;
    }
    clearSignupDraft();
    router.push("/home");
  };

  const stepTitles = ["Look", "Personality", "Dream", "Birth lottery", "Home"];

  return (
    <div className="fixed inset-0 z-50 bg-[#e2e8f0] flex flex-col font-sans select-none overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="h-14 sm:h-16 px-4 sm:px-8 flex items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md shrink-0">
        <button
          onClick={() => {
            if (currentStep > 1) setCurrentStep(currentStep - 1);
            else router.push("/?signup=true");
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Center: Step Name & Progress Dots */}
        <div className="flex flex-col items-center">
          <span className="text-sm font-black text-slate-900 tracking-tight">
            {stepTitles[currentStep - 1]}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all duration-300 ${
                  s === currentStep
                    ? "w-6 bg-emerald-500"
                    : s < currentStep
                    ? "w-3 bg-emerald-400"
                    : "w-3 bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right Action: Randomizer & Next Button */}
        <div className="flex items-center gap-2">
          {currentStep === 1 && (
            <button
              onClick={handleRandomize}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 active:scale-95"
              title="Randomize look"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              if (currentStep < 5) setCurrentStep(currentStep + 1);
              else void handleFinishOnboarding();
            }}
            disabled={currentStep === 2 && selectedTraits.length !== 2}
            className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95"
          >
            {currentStep === 5 ? "Move in" : "Next"}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left: 3D Avatar Preview with pedestal */}
        <div className="w-full md:w-1/2 h-[42vh] md:h-full relative bg-gradient-to-b from-blue-50/50 via-slate-100 to-slate-200 flex items-center justify-center">
          <AvatarCanvas look={look} />
        </div>

        {/* Right: Step Customization Panel */}
        <div className="w-full md:w-1/2 flex-1 md:h-full bg-white p-4 sm:p-6 overflow-y-auto shadow-2xl md:shadow-none border-t md:border-t-0 md:border-l border-slate-200">
          <div className="max-w-md mx-auto space-y-6 pb-24 md:pb-8">

            {/* STEP 1: LOOK */}
            {currentStep === 1 && (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900">@{username}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">your Citizen&apos;s name</span>
                </div>

                {/* Body Gender */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Body</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                    {(["woman", "man"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => chooseGender(g)}
                        className={`py-2 text-xs font-black rounded-xl transition-all ${
                          look.gender === g ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {g === "woman" ? "Woman" : "Man"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selfie avatar */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Look like you</label>
                  {look.custom ? (
                    <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50/60">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Camera className="w-4 h-4" /></span>
                        <div>
                          <div className="font-black text-sm text-slate-900">Your selfie avatar</div>
                          <div className="text-[11px] text-slate-500">Made from your photos. Tap Redo to change your outfit.</div>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => setSelfieOpen(true)} className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">Redo</button>
                        <button onClick={() => setLook((prev) => ({ ...prev, custom: undefined }))} className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center" aria-label="Remove selfie avatar"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelfieOpen(true)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-colors"
                    >
                      <span className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0"><Camera className="w-4 h-4" /></span>
                      <div>
                        <div className="font-black text-sm text-slate-900">Create from a selfie or photo</div>
                        <div className="text-[11px] text-slate-500">Take a selfie or upload pictures for a realistic avatar that looks like you. Free.</div>
                        <div className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] font-semibold text-amber-800">
                          👗 Choose your outfit, hair, shoes and glasses inside the creator. That&apos;s the only place you can customise them.
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {/* Ready-made citizens */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    {look.custom ? "Or pick a ready-made citizen" : "Or pick a citizen"}
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">Ready-made citizens come dressed as shown; their outfits can&apos;t be changed.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {rosterFor(look.gender).map((r) => {
                      const active = !look.custom && presetFor(look) === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => setLook((prev) => ({ ...prev, preset: r.id, custom: undefined }))}
                          className={`relative rounded-2xl overflow-hidden border-2 bg-slate-800 transition-all ${active ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-transparent hover:border-slate-300"}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={rosterThumb(r.id)} alt={r.label} className="w-full aspect-[3/4] object-cover object-[50%_20%] scale-[1.6] origin-top" loading="lazy" />
                          <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent text-white text-[10px] font-bold px-1.5 pt-4 pb-1 leading-tight">{r.label}</span>
                          {active && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check className="w-3 h-3" /></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Body type (ready-made citizens only; selfie avatars keep the body from your photos) */}
                {!look.custom && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Body type</label>
                    <div className="flex flex-wrap gap-1.5">
                      {BODY_TYPES[look.gender].map(type => (
                        <button
                          key={type}
                          onClick={() => setLook(prev => ({ ...prev, bodyType: type }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            (look.bodyType ?? defaultBodyType(look.gender)) === type
                              ? "bg-slate-900 text-white shadow-sm"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-md transition-all active:scale-98"
                >
                  Continue
                </button>

                {selfieOpen && <AvaturnCreator onCreated={handleSelfieCreated} onClose={() => setSelfieOpen(false)} />}
              </>
            )}

            {/* STEP 2: PERSONALITY */}
            {currentStep === 2 && (
              <>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Choose 2 traits for @{username}.
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Selected: {selectedTraits.length} / 2
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "Hustler", icon: "💼", title: "Hustler", desc: "Sees money everywhere. Hustle skill grows faster and bosses notice." },
                    { id: "Foodie", icon: "🍲", title: "Foodie", desc: "Lives for fine dining & shawarma. Learns cooking fast and food is extra enjoyable." },
                    { id: "Luxury Spirit", icon: "🎉", title: "Luxury Spirit", desc: "Always ready to celebrate. Parties and nightlife hit different, gets bored quicker." },
                    { id: "Gym Rat", icon: "💪", title: "Gym Rat", desc: "Leg day every day. Fitness grows fast and workouts feel good." },
                    { id: "Smooth Talker", icon: "😇", title: "Smooth Talker", desc: "Mouth sweet like honey. Charisma grows fast and socials land better." },
                    { id: "Zen / Chill", icon: "😴", title: "Zen / Chill", desc: "Why rush when you can relax? Energy lasts longer, stress stays low." },
                    { id: "Clean Living", icon: "🧼", title: "Clean Living", desc: "Always fresh. Hygiene drops slower than others." },
                    { id: "Night Crawler", icon: "🌙", title: "Night Crawler", desc: "Dubai never sleeps, neither do you. Loves nightlife." },
                  ].map(trait => {
                    const isSelected = selectedTraits.includes(trait.id);
                    return (
                      <button
                        key={trait.id}
                        onClick={() => handleTraitToggle(trait.id)}
                        className={`text-left p-3 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/60 shadow-md ring-2 ring-emerald-500/20"
                            : "border-slate-100 bg-slate-50 hover:bg-slate-100/80"
                        }`}
                      >
                        <div>
                          <span className="text-2xl mb-1.5 block">{trait.icon}</span>
                          <span className="font-black text-xs text-slate-900 block">{trait.title}</span>
                          <p className="text-[10px] text-slate-500 leading-snug mt-1">{trait.desc}</p>
                        </div>
                        {isSelected && (
                          <div className="self-end mt-2 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={selectedTraits.length !== 2}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 active:scale-98 text-white font-black text-sm rounded-2xl shadow-lg transition-all"
                >
                  {selectedTraits.length === 2 ? "Continue" : `Choose ${2 - selectedTraits.length} more`}
                </button>
              </>
            )}

            {/* STEP 3: DREAM */}
            {currentStep === 3 && (
              <>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    What's @{username}'s big dream?
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your ultimate life ambition in Dubai.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { id: "Corporate Titan", icon: "👔", title: "Corporate Titan", desc: "Reach the top level of any executive career." },
                    { id: "Palm Landlord", icon: "🏰", title: "Palm Landlord", desc: "Build a net worth of AED 5,000,000 in luxury real estate." },
                    { id: "Global Superstar", icon: "🎤", title: "Global Superstar", desc: "Max out Fame and Social skills (Level 10)." },
                    { id: "City Connector", icon: "🤝", title: "City Connector", desc: "Become best friends with 10 influential citizens." },
                    { id: "Tech Unicorn", icon: "🦄", title: "Tech Unicorn Founder", desc: "Get your startup funded at DIFC / Future District." },
                  ].map(dream => {
                    const isSelected = selectedDream === dream.id;
                    return (
                      <button
                        key={dream.id}
                        onClick={() => setSelectedDream(dream.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20"
                            : "border-slate-100 bg-slate-50 hover:bg-slate-100/80"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{dream.icon}</span>
                          <div>
                            <span className="font-black text-xs sm:text-sm text-slate-900 block">{dream.title}</span>
                            <span className="text-[11px] text-slate-500 mt-0.5 block">{dream.desc}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentStep(4)}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-sm rounded-2xl shadow-lg transition-all"
                >
                  Continue
                </button>
              </>
            )}

            {/* STEP 4: BIRTH LOTTERY / ARRIVAL STORY */}
            {currentStep === 4 && (
              <>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Every citizen arrives in Dubai with a story.
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    What was @{username} born into?
                  </p>
                </div>

                {/* Gold Feature Card */}
                <div className="bg-gradient-to-b from-amber-50 to-amber-100/70 border-2 border-amber-300/80 rounded-3xl p-5 shadow-xl text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center mx-auto shadow-md text-3xl">
                    🏦
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Dubai Dreamer!
                    </h3>
                    <p className="text-xs font-bold text-amber-700 mt-0.5">
                      Self-made hits different.
                    </p>
                  </div>

                  <div className="space-y-2 text-left bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-amber-200/60 shadow-sm text-xs font-bold text-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">💼</span>
                      <span>AED 50,000 starter capital grant to invest</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">💪</span>
                      <span>Hustle skill starts at Level 2</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">📈</span>
                      <span>You learn every skill 25% faster</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">🏙️</span>
                      <span>Start in Business Bay and work your way to the Palm!</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-semibold">
                    Decided once for your account. Starting a new life won't change it.
                  </p>
                </div>

                <button
                  onClick={() => setCurrentStep(5)}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-sm rounded-2xl shadow-lg transition-all"
                >
                  Choose where to live
                </button>
              </>
            )}

            {/* STEP 5: HOME (STARTER APARTMENT) */}
            {currentStep === 5 && (
              <>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Where will @{username} live?
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rent is paid every week.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      id: "Academic City Dorm",
                      icon: "🎓",
                      badge: "Student life",
                      badgeColor: "bg-blue-100 text-blue-700",
                      title: "Academic City Dorm",
                      desc: "Shared room, campus study perks, very cheap rent.",
                      startCapital: "AED 15,000",
                      rent: "AED 1,200/wk",
                    },
                    {
                      id: "Deira Studio",
                      icon: "🏢",
                      badge: "Hard start",
                      badgeColor: "bg-slate-100 text-slate-700",
                      title: "Deira Old Town Studio",
                      desc: "Lively street souks, classic vibes, budget living with big dreams.",
                      startCapital: "AED 30,000",
                      rent: "AED 2,500/wk",
                    },
                    {
                      id: "Business Bay Studio",
                      icon: "🏙️",
                      badge: "Balanced (Recommended)",
                      badgeColor: "bg-emerald-100 text-emerald-800 font-black",
                      title: "Business Bay Modern Studio",
                      desc: "Your own balcony near the canal, pool, gym, minutes from Downtown.",
                      startCapital: "AED 50,000",
                      rent: "AED 4,500/wk",
                    },
                    {
                      id: "Dubai Marina 1-Bed",
                      icon: "🏝️",
                      badge: "Big spender",
                      badgeColor: "bg-purple-100 text-purple-700",
                      title: "Dubai Marina 1-Bedroom",
                      desc: "High-floor marina view, infinity pool, vibrant waterfront luxury.",
                      startCapital: "AED 100,000",
                      rent: "AED 8,000/wk",
                    },
                  ].map(res => {
                    const isSelected = selectedHome === res.id;
                    return (
                      <button
                        key={res.id}
                        onClick={() => setSelectedHome(res.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20"
                            : "border-slate-100 bg-slate-50 hover:bg-slate-100/80"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{res.icon}</span>
                            <span className="font-black text-xs sm:text-sm text-slate-900">{res.title}</span>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${res.badgeColor}`}>
                            {res.badge}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-snug pl-7 mb-2">
                          {res.desc}
                        </p>

                        <div className="flex items-center justify-between pl-7 pt-2 border-t border-slate-200/50 text-[10px] sm:text-xs font-black">
                          <span className="text-emerald-700">Start with {res.startCapital}</span>
                          <span className="text-slate-500 font-mono">Rent: {res.rent}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {finishError && <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{finishError}</p>}
                <button
                  onClick={handleFinishOnboarding}
                  disabled={finishing}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 active:scale-98 text-white font-black text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{finishing ? "Moving in…" : "Move in"}</span>
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
