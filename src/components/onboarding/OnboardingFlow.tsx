"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Shuffle, Check, Sparkles, Building, Briefcase, 
  Utensils, PartyPopper, Dumbbell, Smile, Moon, Sparkle, Trophy,
  Star, Heart, Shield, CheckCircle2, Home, Landmark
} from "lucide-react";
import { AvatarCanvas, type AvatarLookProps } from "./AvatarCanvas";

interface OnboardingFlowProps {
  initialUserData?: {
    name: string;
    username: string;
    email?: string;
    dob?: { day: string; month: string; year: string };
  };
  onComplete?: () => void;
}

export const SKIN_TONES = [
  "#fcd5b5", "#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#5c3317", "#3b2219"
];

export const HAIR_COLORS = [
  "#18181b", "#3f2b1d", "#5c4033", "#8b5a2b", "#b08d57", "#d97706", "#7c3aed"
];

export const OUTFIT_COLORS = [
  "#2563eb", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6",
  "#0f172a", "#fef3c7", "#ca8a04", "#ffffff"
];

export const BOTTOMS_COLORS = [
  "#2563eb", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6",
  "#0f172a", "#fef3c7", "#ca8a04", "#ffffff"
];

export function OnboardingFlow({ initialUserData, onComplete }: OnboardingFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: Look, 2: Personality, 3: Dream, 4: Birth Lottery, 5: Home
  const username = initialUserData?.username || "rashid_dxb";

  // Step 1: Look state
  const [look, setLook] = useState<AvatarLookProps>({
    gender: "woman",
    hairstyle: "Braids",
    outfit: "Owambe / Traditional",
    fabric: "Ankara / Silk",
    skinTone: "#8d5524",
    hairColor: "#18181b",
    outfitColor: "#f59e0b",
    bottomsColor: "#0f172a",
  });

  // Step 2: Personality Traits (pick 2)
  const [selectedTraits, setSelectedTraits] = useState<string[]>(["Hustler"]);

  // Step 3: Dream (pick 1)
  const [selectedDream, setSelectedDream] = useState<string>("Corporate Titan");

  // Step 5: Home Selection
  const [selectedHome, setSelectedHome] = useState<string>("Business Bay Studio");

  // Randomize look
  const handleRandomize = () => {
    const genders: Array<"woman" | "man"> = ["woman", "man"];
    const hairstyles = ["Braids", "Afro", "Bun", "Ponytail", "Long", "Locs", "Low cut", "Kandura & Ghutra", "Classic"];
    const outfits = ["Casual", "Office", "Owambe / Traditional", "Traditional / Kandura", "Site work", "Luxury"];
    const fabrics = ["Plain", "Ankara / Silk", "Linen", "Gold Thread"];

    setLook({
      gender: genders[Math.floor(Math.random() * genders.length)],
      hairstyle: hairstyles[Math.floor(Math.random() * hairstyles.length)],
      outfit: outfits[Math.floor(Math.random() * outfits.length)],
      fabric: fabrics[Math.floor(Math.random() * fabrics.length)],
      skinTone: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)],
      hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
      outfitColor: OUTFIT_COLORS[Math.floor(Math.random() * OUTFIT_COLORS.length)],
      bottomsColor: BOTTOMS_COLORS[Math.floor(Math.random() * BOTTOMS_COLORS.length)],
    });
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

  const handleFinishOnboarding = () => {
    const citizenProfile = {
      name: initialUserData?.name || "Rashid Al Mansoori",
      username,
      look,
      traits: selectedTraits,
      dream: selectedDream,
      home: selectedHome,
      balance: selectedHome.includes("Marina") ? 100000 : selectedHome.includes("Business Bay") ? 50000 : 30000,
      createdAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem("dubai_citizen", JSON.stringify(citizenProfile));
      localStorage.setItem("dubai_logged_in", "true");
    } catch {}

    if (onComplete) {
      onComplete();
    } else {
      router.push("/home");
    }
  };

  const stepTitles = ["Look", "Personality", "Dream", "Birth lottery", "Home"];

  return (
    <div className="fixed inset-0 z-50 bg-[#e2e8f0] flex flex-col font-sans select-none overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="h-14 sm:h-16 px-4 sm:px-8 flex items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md shrink-0">
        <button
          onClick={() => {
            if (currentStep > 1) setCurrentStep(prev => prev - 1);
            else router.push("/");
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
              if (currentStep < 5) setCurrentStep(prev => prev + 1);
              else handleFinishOnboarding();
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
                  <span className="text-[11px] font-semibold text-slate-400">your Citizen's name</span>
                </div>

                {/* Body Gender */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Body</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                    <button
                      onClick={() => setLook(prev => ({ ...prev, gender: "woman" }))}
                      className={`py-2 text-xs font-black rounded-xl transition-all ${
                        look.gender === "woman" ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Woman
                    </button>
                    <button
                      onClick={() => setLook(prev => ({ ...prev, gender: "man" }))}
                      className={`py-2 text-xs font-black rounded-xl transition-all ${
                        look.gender === "man" ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Man
                    </button>
                  </div>
                </div>

                {/* Hairstyle */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Hairstyle</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Braids", "Afro", "Bun", "Ponytail", "Long", "Locs", "Low cut", "Kandura & Ghutra", "Classic"].map(style => (
                      <button
                        key={style}
                        onClick={() => setLook(prev => ({ ...prev, hairstyle: style }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          look.hairstyle === style
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Outfit */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Outfit</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Casual", "Office", "Owambe / Traditional", "Traditional / Kandura", "Site work", "Luxury"].map(o => (
                      <button
                        key={o}
                        onClick={() => setLook(prev => ({ ...prev, outfit: o }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          look.outfit === o
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fabric */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Fabric</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Plain", "Ankara / Silk", "Linen", "Gold Thread"].map(fab => (
                      <button
                        key={fab}
                        onClick={() => setLook(prev => ({ ...prev, fabric: fab }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          look.fabric === fab
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {fab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skin Tone */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Skin tone</label>
                  <div className="flex items-center gap-2">
                    {SKIN_TONES.map(color => (
                      <button
                        key={color}
                        onClick={() => setLook(prev => ({ ...prev, skinTone: color }))}
                        style={{ backgroundColor: color }}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          look.skinTone === color ? "ring-2 ring-blue-500 ring-offset-2 scale-110" : "hover:scale-105"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Hair Color */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Hair colour</label>
                  <div className="flex items-center gap-2">
                    {HAIR_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setLook(prev => ({ ...prev, hairColor: color }))}
                        style={{ backgroundColor: color }}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          look.hairColor === color ? "ring-2 ring-blue-500 ring-offset-2 scale-110" : "hover:scale-105"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Outfit Color */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Outfit colour</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {OUTFIT_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setLook(prev => ({ ...prev, outfitColor: color }))}
                        style={{ backgroundColor: color }}
                        className={`w-7 h-7 rounded-full border border-black/10 transition-transform ${
                          look.outfitColor === color ? "ring-2 ring-blue-500 ring-offset-2 scale-110" : "hover:scale-105"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Bottoms Color */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Bottoms</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {BOTTOMS_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setLook(prev => ({ ...prev, bottomsColor: color }))}
                        style={{ backgroundColor: color }}
                        className={`w-7 h-7 rounded-full border border-black/10 transition-transform ${
                          look.bottomsColor === color ? "ring-2 ring-blue-500 ring-offset-2 scale-110" : "hover:scale-105"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-sm rounded-2xl shadow-lg transition-all"
                >
                  Continue
                </button>
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
                    { id: "Palm Landlord", icon: "🏰", title: "Palm Landlord", desc: "Build a net worth of 5,000,000 AED in luxury real estate." },
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
                      <span>50,000 AED starter capital grant to invest</span>
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
                      startCapital: "15,000 AED",
                      rent: "1,200 AED/wk",
                    },
                    {
                      id: "Deira Studio",
                      icon: "🏢",
                      badge: "Hard start",
                      badgeColor: "bg-slate-100 text-slate-700",
                      title: "Deira Old Town Studio",
                      desc: "Lively street souks, classic vibes, budget living with big dreams.",
                      startCapital: "30,000 AED",
                      rent: "2,500 AED/wk",
                    },
                    {
                      id: "Business Bay Studio",
                      icon: "🏙️",
                      badge: "Balanced (Recommended)",
                      badgeColor: "bg-emerald-100 text-emerald-800 font-black",
                      title: "Business Bay Modern Studio",
                      desc: "Your own balcony near the canal, pool, gym, minutes from Downtown.",
                      startCapital: "50,000 AED",
                      rent: "4,500 AED/wk",
                    },
                    {
                      id: "Dubai Marina 1-Bed",
                      icon: "🏝️",
                      badge: "Big spender",
                      badgeColor: "bg-purple-100 text-purple-700",
                      title: "Dubai Marina 1-Bedroom",
                      desc: "High-floor marina view, infinity pool, vibrant waterfront luxury.",
                      startCapital: "100,000 AED",
                      rent: "8,000 AED/wk",
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

                <button
                  onClick={handleFinishOnboarding}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Move in</span>
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
