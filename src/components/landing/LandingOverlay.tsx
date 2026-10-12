"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Crown, Users, Eye, EyeOff, X, Calendar as CalendarIcon, 
  Check, ShieldCheck, ChevronDown
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface LandingOverlayProps {
  onStartOnboarding: (userData: {
    name: string;
    username: string;
    email?: string;
    dob?: { day: string; month: string; year: string };
  }) => void;
  isLoggedIn?: boolean;
  citizen?: any;
  onLogout?: () => void;
  forceOpenAuth?: boolean;
  onCloseAuth?: () => void;
}

export function LandingOverlay({
  onStartOnboarding,
  isLoggedIn = false,
  citizen,
  onLogout,
  forceOpenAuth = false,
  onCloseAuth,
}: LandingOverlayProps) {
  const router = useRouter();

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"signup" | "login">("signup");
  const [ageModalOpen, setAgeModalOpen] = useState(false);

  // Sync external forceOpenAuth trigger
  React.useEffect(() => {
    if (forceOpenAuth) {
      setAuthTab("signup");
      setAuthModalOpen(true);
    }
  }, [forceOpenAuth]);

  // Form states
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [dobDay, setDobDay] = useState("4");
  const [dobMonth, setDobMonth] = useState("Jul");
  const [dobYear, setDobYear] = useState("1997");
  const [agree18, setAgree18] = useState(true);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleOpenSignUp = () => {
    setAuthTab("signup");
    setAuthModalOpen(true);
  };

  const handleOpenLogIn = () => {
    setAuthTab("login");
    setAuthModalOpen(true);
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!agree18) return;
    // Open age confirmation dialog
    setAgeModalOpen(true);
  };

  const handleConfirmAge = () => {
    setAgeModalOpen(false);
    setAuthModalOpen(false);
    onCloseAuth?.();
    // Proceed to avatar onboarding flow
    const cleanUsername = username.trim().replace(/^@/, "") || name.toLowerCase().replace(/\s+/g, "_");
    onStartOnboarding({
      name: name.trim(),
      username: cleanUsername,
      email: email.trim() || undefined,
      dob: { day: dobDay, month: dobMonth, year: dobYear },
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login and enter city
    try {
      localStorage.setItem("dubai_logged_in", "true");
      if (!localStorage.getItem("dubai_citizen")) {
        const citizenProfile = {
          name: loginIdentifier.trim() || "Dubai Citizen",
          username: (loginIdentifier.trim().replace(/^@/, "") || "citizen_dxb").toLowerCase(),
          balance: 50000,
          traits: ["Ambitious", "Networking"],
          dream: "Crypto & Real Estate Mogul",
          home: "Downtown Studio",
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem("dubai_citizen", JSON.stringify(citizenProfile));
      }
    } catch {}
    setAuthModalOpen(false);
    onCloseAuth?.();
    router.push("/explore");
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const years = Array.from({ length: 65 }, (_, i) => String(2008 - i));

  return (
    <>
      {/* 1. TOP FLOATING BAR (As shown in Screenshot 1) */}
      <header className="absolute top-3 sm:top-5 left-0 w-full z-40 pointer-events-none px-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-2">
          
          {/* Main Top Header Pill */}
          <div className="w-full flex items-center justify-between gap-2 pointer-events-auto">
            {/* Left Brand & Online Stats Pill */}
            <div className="flex items-center gap-2.5 sm:gap-3 bg-white/95 hover:bg-white backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-3 sm:px-4 py-2 rounded-full transition-all">
              <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs sm:text-sm">
                <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>Dubai Life</span>
              </div>

              <div className="w-[1px] h-3.5 bg-slate-200" />

              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>1.4k online</span>
              </div>

              <div className="hidden xs:flex sm:flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-500">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>35.5k visits</span>
              </div>
            </div>

            {/* Quick Stats Pills (Hidden on small mobile) */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow-sm border border-slate-100">
                <span>🏛️</span>
                <span>Gov @CrownPrince</span>
              </div>
              <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow-sm border border-slate-100">
                <span>🏝️</span>
                <span>Palm Plots</span>
              </div>
              <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow-sm border border-slate-100">
                <span>🏘️</span>
                <span>450 homes</span>
              </div>
            </div>

            {/* Top Right Auth Buttons */}
            {isLoggedIn ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => router.push("/home")}
                  className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  <span>🏠 My Home</span>
                </button>
                <button
                  onClick={onLogout}
                  className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-white hover:bg-slate-50 active:scale-95 text-slate-700 border border-slate-200/80 font-bold text-xs sm:text-sm transition-all shadow-sm"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={handleOpenSignUp}
                  className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/20"
                >
                  Sign up
                </button>
                <button
                  onClick={handleOpenLogIn}
                  className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white hover:bg-slate-50 active:scale-95 text-slate-800 border border-slate-200/80 font-bold text-xs sm:text-sm transition-all shadow-sm"
                >
                  Log in
                </button>
              </div>
            )}
          </div>

          {/* Governor Ticker Banner (As shown in Screenshot 1) */}
          <div className="hidden sm:inline-flex items-center gap-2 bg-emerald-800/90 hover:bg-emerald-800 backdrop-blur-md text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg border border-emerald-600/50 pointer-events-auto transition-transform">
            <span>🏛️</span>
            <span>Gov @CrownPrince: Welcome to Dubai Life! Claim your apartment in Downtown & Marina 🌴</span>
          </div>

        </div>
      </header>

      {/* 2. BOTTOM FLOATING CARD (As shown in Screenshot 1) */}
      <div className="absolute bottom-6 sm:bottom-8 left-0 w-full z-40 pointer-events-none px-4">
        <div className="max-w-md mx-auto bg-white/95 backdrop-blur-2xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] rounded-3xl p-4 sm:p-5 pointer-events-auto text-center space-y-3.5">
          
          {/* Citizens Playing Header */}
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
            {/* 4 Overlapping Avatar Circles */}
            <div className="flex items-center -space-x-2">
              <div className="w-6 h-6 rounded-full border-2 border-white bg-amber-400 flex items-center justify-center text-xs">🧔🏾</div>
              <div className="w-6 h-6 rounded-full border-2 border-white bg-pink-400 flex items-center justify-center text-xs">👩🏻</div>
              <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-400 flex items-center justify-center text-xs">👨🏽</div>
              <div className="w-6 h-6 rounded-full border-2 border-white bg-emerald-400 flex items-center justify-center text-xs">🧕🏼</div>
            </div>
            <span>
              <strong className="font-black text-slate-900">1.4k Citizens</strong> playing right now · free
            </span>
          </div>

          {/* Action Buttons */}
          {isLoggedIn ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => router.push("/home")}
                className="flex-1 py-3 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>🏠 My Apartment</span>
              </button>
              <button
                onClick={() => router.push("/explore")}
                className="py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2"
              >
                <span>🗺️ Explore Map</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleOpenSignUp}
                className="flex-1 py-3 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-500/25 transition-all"
              >
                Sign up free
              </button>
              <button
                onClick={handleOpenLogIn}
                className="py-3 px-6 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-98 text-slate-800 border border-slate-200 font-bold text-sm sm:text-base transition-all"
              >
                Log in
              </button>
            </div>
          )}

          {/* Social Badges Footer */}
          <div className="flex items-center justify-center gap-3 pt-1 text-[11px] font-bold text-slate-400">
            <div className="flex items-center gap-1 text-emerald-600">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2.5 text-slate-500">
              <span className="hover:text-slate-800 cursor-pointer transition-colors">𝕏</span>
              <span className="hover:text-slate-800 cursor-pointer transition-colors">TikTok</span>
              <span className="hover:text-slate-800 cursor-pointer transition-colors">Instagram</span>
              <span className="hover:text-slate-800 cursor-pointer transition-colors">LinkedIn</span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. SIGN UP & LOG IN MODAL (Screenshot 2) */}
      <Dialog 
        open={authModalOpen} 
        onOpenChange={(open) => {
          setAuthModalOpen(open);
          if (!open) onCloseAuth?.();
        }}
      >
        <DialogContent className="bg-white text-slate-900 border-none shadow-2xl w-[94vw] max-w-md max-h-[90dvh] overflow-y-auto z-50 rounded-3xl p-5 sm:p-7">
          
          {/* Friendly Map-locked banner */}
          <div className="flex items-center gap-2.5 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3 mb-4 text-xs font-bold text-emerald-900">
            <span className="text-lg">🏙️</span>
            <span>Sign up to unlock interactive map exploration, claim starter apartments, and visit venues!</span>
          </div>
          
          {/* Segmented Tab Pill: Create account | Log in */}
          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-full mb-6 text-xs sm:text-sm font-bold">
            <button
              onClick={() => setAuthTab("signup")}
              className={`py-2 rounded-full transition-all ${
                authTab === "signup"
                  ? "bg-white text-slate-950 shadow-sm font-black"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Create account
            </button>
            <button
              onClick={() => setAuthTab("login")}
              className={`py-2 rounded-full transition-all ${
                authTab === "login"
                  ? "bg-white text-slate-950 shadow-sm font-black"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Log in
            </button>
          </div>

          {authTab === "signup" ? (
            /* CREATE ACCOUNT FORM */
            <form onSubmit={handleSignUpSubmit} className="space-y-4 text-left">
              {/* Your name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Your name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rashid Al Mansoori"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!username) {
                      setUsername("@" + e.target.value.toLowerCase().replace(/\s+/g, "_"));
                    }
                  }}
                  className="w-full h-11 px-4 bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all"
                />
              </div>

              {/* Username */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Username</label>
                <input
                  type="text"
                  required
                  placeholder="@rashid_dxb"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.startsWith("@") ? e.target.value : "@" + e.target.value)}
                  className="w-full h-11 px-4 bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">This is your Citizen's name in Dubai Life.</p>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-4 pr-11 bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">At least 8 characters. Not 123456 😅</p>
              </div>

              {/* Email (optional) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Email (optional)</label>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">You can log in with it too. We never send you codes.</p>
              </div>

              {/* Date of birth */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Date of birth</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={dobDay}
                    onChange={(e) => setDobDay(e.target.value)}
                    className="h-11 px-3 bg-slate-100/80 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 outline-none"
                  >
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select
                    value={dobMonth}
                    onChange={(e) => setDobMonth(e.target.value)}
                    className="h-11 px-3 bg-slate-100/80 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 outline-none"
                  >
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select
                    value={dobYear}
                    onChange={(e) => setDobYear(e.target.value)}
                    className="h-11 px-3 bg-slate-100/80 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 outline-none"
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* 18+ Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <input
                    type="checkbox"
                    checked={agree18}
                    onChange={(e) => setAgree18(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 leading-snug">
                    I'm <strong>18+</strong> and I agree to the <span className="text-blue-600 underline">Terms</span>, <span className="text-blue-600 underline">Privacy Policy</span> and <span className="text-blue-600 underline">Disclaimer</span>.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!agree18}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-500/25 transition-all mt-2 active:scale-98"
              >
                Sign up · it's free
              </button>

              <p className="text-[11px] text-center text-slate-400 pt-1">
                Your Citizen will live in the same Dubai as everyone else who signs up.
              </p>
            </form>
          ) : (
            /* LOG IN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Username or Email</label>
                <input
                  type="text"
                  required
                  placeholder="@rashid_dxb or you@email.com"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-500/25 transition-all mt-4 active:scale-98"
              >
                Log in
              </button>
            </form>
          )}

        </DialogContent>
      </Dialog>

      {/* 4. AGE CONFIRMATION MODAL (Screenshot 3) */}
      <Dialog open={ageModalOpen} onOpenChange={setAgeModalOpen}>
        <DialogContent className="bg-white text-slate-900 border-none shadow-2xl w-[90vw] max-w-sm z-[60] rounded-3xl p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-sm border border-amber-100">
            🗓️
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Are you sure?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              You're confirming you were born on <strong className="text-slate-900">{dobDay} {dobMonth} {dobYear}</strong> and are 18 or older.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleConfirmAge}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-md shadow-emerald-500/25 transition-all active:scale-98"
            >
              Yes, that's right
            </button>
            <button
              onClick={() => setAgeModalOpen(false)}
              className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-98"
            >
              Go back
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
