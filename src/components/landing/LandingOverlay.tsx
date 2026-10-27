"use client";

import { requestPasswordReset } from "@/lib/email";
import { InstallApp } from "@/components/pwa/InstallApp";
import { compact, useSiteStats } from "@/lib/siteStats";
import { PLACES } from "@/lib/city/places";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { 
  Users, Eye, EyeOff, X, Calendar as CalendarIcon, 
  Check, ShieldCheck, ChevronDown
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useOnlineCount, formatOnline } from "@/lib/presence";
import { getCitizenState, isUsernameTaken, logIn, resendConfirmation, signUpWithEmail, type Citizen } from "@/lib/citizenStore";
import { useSignupDraft, updateSignupDraft, type SignupForm } from "@/lib/signupDraft";
import { ageFrom, dobIso, MIN_AGE } from "@/lib/age";

interface LandingOverlayProps {
  isLoggedIn?: boolean;
  citizen?: Citizen | null;
  onLogout?: () => void;
}

/** Social accounts shown under the sign-up / log-in buttons. Add each account's link as `href` when ready. */
const SOCIALS: Array<{ label: string; href?: string }> = SITE.socials;

export function LandingOverlay({
  isLoggedIn = false,
  citizen,
  onLogout,
}: LandingOverlayProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // An invite (?ref=username) is remembered until the new citizen exists, then redeemed (LifeHub).
  const ref = searchParams.get("ref");
  useEffect(() => {
    if (ref && /^[a-z0-9_]{3,24}$/.test(ref)) { try { localStorage.setItem("dl_ref", ref); } catch { /* storage blocked */ } }
  }, [ref]);
  const onlineCount = useOnlineCount();
  const { visits } = useSiteStats();
  const placeCount = PLACES.reduce((n, p) => n + p.venues.filter((v) => !v.comingSoon).length, 0);
  const draft = useSignupDraft();

  // Modals follow the URL so a refresh keeps the user where they were:
  // /?signup=true (form) · /?signup=true&confirm=age (age check) · /?login=true (log in)
  const authTab: "signup" | "login" | null =
    searchParams.get("login") === "true" ? "login"
    : searchParams.get("signup") === "true" || searchParams.get("auth") === "true" ? "signup"
    : null;
  const authModalOpen = authTab !== null;
  const setAuthTab = (tab: "signup" | "login") => router.replace(tab === "login" ? "/?login=true" : "/?signup=true", { scroll: false });
  const closeAuth = () => router.replace("/", { scroll: false });

  // Sign-up form fields live in the draft (not the password).
  const form = draft?.form ?? {};
  const setField = <K extends keyof SignupForm>(key: K) => (value: SignupForm[K]) =>
    updateSignupDraft((d) => ({ form: { ...d.form, [key]: value } }));
  const name = form.name ?? "";
  const setName = setField("name");
  const username = form.username ?? "";
  const setUsername = setField("username");
  const email = form.email ?? "";
  const setEmail = setField("email");
  const dobDay = form.dobDay ?? "4";
  const setDobDay = setField("dobDay");
  const dobMonth = form.dobMonth ?? "Jul";
  const setDobMonth = setField("dobMonth");
  const dobYear = form.dobYear ?? "1997";
  const setDobYear = setField("dobYear");
  const agree18 = form.agree18 ?? false;
  const setAgree18 = setField("agree18");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // The age check only makes sense once the form has a name.
  const ageModalOpen = authTab === "signup" && searchParams.get("confirm") === "age" && !!name.trim();
  const setAgeModalOpen = (open: boolean) => router.replace(open ? "/?signup=true&confirm=age" : "/?signup=true", { scroll: false });

  // /?signup=true&confirm=email — account created, waiting for the confirmation link.
  const awaitingEmail = authTab === "signup" && searchParams.get("confirm") === "email";
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleOpenSignUp = () => router.push("/?signup=true", { scroll: false });
  const handleOpenLogIn = () => router.push("/?login=true", { scroll: false });

  // Forgot password (/?login=true&forgot=1): emails a reset link; never says whether the account exists.
  const forgot = searchParams.get("forgot") === "1";
  const [resetSent, setResetSent] = useState<string | null>(null);
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) return;
    setBusy(true); setAuthError(null);
    const err = await requestPasswordReset(loginIdentifier.trim());
    setBusy(false);
    if (err) setAuthError(err);
    else setResetSent(loginIdentifier.trim());
  };

  const cleanUsername = (username.trim().replace(/^@/, "") || name.trim().replace(/\s+/g, "_")).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!name.trim() || !agree18) return;
    if (cleanUsername.length < 3) return setAuthError("Username needs at least 3 letters, numbers or underscores.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setAuthError("Enter a valid email — you'll use it to log in.");
    if (password.length < 8) return setAuthError("Password must be at least 8 characters.");
    const dob = dobIso({ day: dobDay, month: dobMonth, year: dobYear });
    if (!dob) return setAuthError("That date of birth isn't a real date — please check it.");
    if (ageFrom(dob) < MIN_AGE) return setAuthError("Dubai Life is for players aged 21 and over.");
    router.push("/?signup=true&confirm=age", { scroll: false });
  };

  const handleConfirmAge = async () => {
    setAuthError(null);
    if (password.length < 8) {
      // The password isn't kept across refreshes; send them back to retype it.
      router.replace("/?signup=true", { scroll: false });
      setAuthError("Please re-enter your password to finish creating your account.");
      return;
    }
    setBusy(true);
    try {
      if (await isUsernameTaken(cleanUsername)) {
        router.replace("/?signup=true", { scroll: false });
        setAuthError(`@${cleanUsername} is taken — pick another username.`);
        return;
      }
      const dob = dobIso({ day: dobDay, month: dobMonth, year: dobYear });
      if (!dob || ageFrom(dob) < MIN_AGE) {
        router.replace("/?signup=true", { scroll: false });
        setAuthError("Dubai Life is for players aged 21 and over.");
        return;
      }
      const result = await signUpWithEmail(email.trim(), password, { username: cleanUsername, display_name: name.trim(), dob });
      if (!result.ok) {
        router.replace("/?signup=true", { scroll: false });
        setAuthError(result.error);
        return;
      }
      // Only a sign-up Supabase accepted becomes the account onboarding uses.
      updateSignupDraft({
        account: { name: name.trim(), username: cleanUsername, email: email.trim(), dob: { day: dobDay, month: dobMonth, year: dobYear } },
      });
      setPassword("");
      if (result.needsConfirmation) router.replace("/?signup=true&confirm=email", { scroll: false });
      else router.push("/onboarding/look");
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    const result = await resendConfirmation(email.trim());
    if (result.ok) setResent(true);
    else setAuthError(result.error);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setBusy(true);
    const result = await logIn(loginIdentifier.trim(), loginPassword);
    setBusy(false);
    if (!result.ok) return setAuthError(result.error);
    setLoginPassword("");
    router.push(getCitizenState().needsOnboarding ? "/onboarding/look" : "/explore");
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const years = Array.from({ length: 80 }, (_, i) => String(new Date().getFullYear() - MIN_AGE - i));

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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/icon-192.png" alt="" width={22} height={22} className="w-[22px] h-[22px] rounded-md" />
                <span>Dubai Life</span>
              </div>

              <div className="w-[1px] h-3.5 bg-slate-200" />

              <div className="flex items-center gap-1.5 text-xs sm:text-xs font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{formatOnline(onlineCount)} online</span>
              </div>

              <div className="hidden xs:flex sm:flex items-center gap-1 text-xs sm:text-xs font-bold text-slate-500">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>{compact(visits)} visits</span>
              </div>
            </div>

            {/* Quick Stats Pills (Hidden on small mobile) */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow-sm border border-slate-100">
                <span>🏛️</span>
                <span>{placeCount} places to visit</span>
              </div>
            </div>

            {/* Top Right Auth Buttons */}
            {isLoggedIn ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => router.push("/home")}
                  className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
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
                  className="px-4 py-2.5 sm:py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/20"
                >
                  Sign up
                </button>
                <button
                  onClick={handleOpenLogIn}
                  className="px-4 py-2.5 sm:py-2 rounded-full bg-white hover:bg-slate-50 active:scale-95 text-slate-800 border border-slate-200/80 font-bold text-xs sm:text-sm transition-all shadow-sm"
                >
                  Log in
                </button>
              </div>
            )}
          </div>

          {/* Governor Ticker Banner (As shown in Screenshot 1) */}
          <div className="hidden sm:inline-flex items-center gap-2 bg-emerald-800/90 hover:bg-emerald-800 backdrop-blur-md text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg border border-emerald-600/50 pointer-events-auto transition-transform">
            <span>🏛️</span>
            <span>Welcome to Dubai Life! Claim your apartment in Downtown and meet people in the city 🌴</span>
          </div>

        </div>
      </header>

      {/* 2. BOTTOM FLOATING CARD (As shown in Screenshot 1) */}
      <div className="absolute bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] sm:bottom-8 left-0 w-full z-40 pointer-events-none px-4">
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
              <strong className="font-black text-slate-900">{formatOnline(onlineCount)} {onlineCount === 1 ? "Citizen" : "Citizens"}</strong> playing right now · free
            </span>
          </div>

          {/* Action Buttons */}
          {isLoggedIn ? (
            <div className="flex flex-row gap-2">
              <button
                onClick={() => router.push("/home")}
                className="flex-1 py-3 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>🏠 My Apartment</span>
              </button>
              <button
                onClick={() => router.push("/explore")}
                className="flex-1 py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2"
              >
                <span>🗺️ Explore Map</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-row gap-2">
              <button
                onClick={handleOpenSignUp}
                className="flex-1 py-3 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-500/25 transition-all"
              >
                Sign up free
              </button>
              <button
                onClick={handleOpenLogIn}
                className="flex-1 py-3 px-6 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-98 text-slate-800 border border-slate-200 font-bold text-sm sm:text-base transition-all"
              >
                Log in
              </button>
            </div>
          )}

          <div className="flex justify-center"><InstallApp /></div>

          {/* What Dubai Life is, and the social accounts */}
          <div className="flex items-center justify-center gap-3 pt-1 text-xs font-bold text-slate-500">
            <Link href="/about" className="hover:text-slate-800 transition-colors">About</Link>
            {SOCIALS.map((n) => n.href
              ? <a key={n.label} href={n.href} target="_blank" rel="noopener noreferrer" className="hover:text-slate-800 transition-colors">{n.label}</a>
              : <span key={n.label} className="hover:text-slate-800 cursor-pointer transition-colors">{n.label}</span>)}
          </div>

        </div>
      </div>

      {/* 3. SIGN UP & LOG IN MODAL (Screenshot 2) */}
      <Dialog 
        open={authModalOpen}
        onOpenChange={(open) => {
          if (!open) closeAuth();
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

          {authTab === "signup" && awaitingEmail ? (
            <div className="text-center space-y-3 py-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-3xl">📧</div>
              <h3 className="text-lg font-black text-slate-900">Check your inbox</h3>
              <p className="text-sm text-slate-600">
                We sent a confirmation link to <strong className="text-slate-900">{email || "your email"}</strong>. Open it to continue to your avatar — your choices so far are saved.
              </p>
              {authError && <p role="alert" className="text-xs font-bold text-rose-600">{authError}</p>}
              <button onClick={handleResend} disabled={resent} className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-black text-sm">
                {resent ? "Email sent again ✓" : "Resend confirmation email"}
              </button>
              <button onClick={() => setAuthTab("login")} className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm">
                Already confirmed? Log in
              </button>
            </div>
          ) : authTab === "signup" ? (
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
                <p className="text-xs text-slate-400 mt-1">This is your Citizen&apos;s name in mydubailife.app.</p>
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
                <p className="text-xs text-slate-400 mt-1">At least 8 characters. Not 123456 😅</p>
              </div>

              {/* Email (optional) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all"
                />
                <p className="text-xs text-slate-400 mt-1">You&apos;ll log in with it.</p>
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

              {/* 21+ Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <input
                    type="checkbox"
                    checked={agree18}
                    onChange={(e) => setAgree18(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 leading-snug">
                    I'm <strong>21+</strong> and I agree to the <span className="text-blue-600 underline">Terms</span>, <span className="text-blue-600 underline">Privacy Policy</span> and <span className="text-blue-600 underline">Disclaimer</span>.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              {authError && <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{authError}</p>}
              <button
                type="submit"
                disabled={!agree18 || busy}
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-500/25 transition-all mt-2 active:scale-98"
              >
                Sign up · it's free
              </button>

              <p className="text-xs text-center text-slate-400 pt-1">
                Your Citizen will live in the same Dubai as everyone else who signs up.
              </p>
            </form>
          ) : (
            forgot ? (
            /* FORGOT PASSWORD */
            <form onSubmit={handleForgotSubmit} className="space-y-4 text-left">
              <div>
                <h3 className="text-base font-black text-slate-900">Forgot your password?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Enter your email or @username and we&apos;ll email you a link to choose a new one.</p>
              </div>
              {resetSent ? (
                <p className="text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                  📧 If an account matches <b>{resetSent}</b>, a reset link is on its way. It works for 1 hour. Check your spam folder too.
                </p>
              ) : (
                <input
                  type="text" required autoCapitalize="none" autoCorrect="off" autoComplete="username"
                  placeholder="you@email.com or @username" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all"
                />
              )}
              {authError && <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{authError}</p>}
              {!resetSent && (
                <button type="submit" disabled={busy} className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg transition-all">
                  {busy ? "Sending…" : "Email me a reset link"}
                </button>
              )}
              <button type="button" onClick={() => { setResetSent(null); setAuthError(null); router.replace("/?login=true", { scroll: false }); }} className="w-full text-sm font-bold text-slate-500">← Back to log in</button>
            </form>
            ) : (
            /* LOG IN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Email or @username</label>
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  placeholder="you@email.com or @username"
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
                <button type="button" onClick={() => { setAuthError(null); setResetSent(null); router.replace("/?login=true&forgot=1", { scroll: false }); }} className="mt-1.5 text-xs font-bold text-emerald-700 hover:underline">Forgot password?</button>
              </div>

              {authError && <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{authError}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-500/25 transition-all mt-4 active:scale-98"
              >
                {busy ? "Logging in…" : "Log in"}
              </button>
            </form>
            )
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
              You're confirming you were born on <strong className="text-slate-900">{dobDay} {dobMonth} {dobYear}</strong> and are 21 or older.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleConfirmAge}
              disabled={busy}
              className="w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm shadow-md shadow-emerald-500/25 transition-all active:scale-98"
            >
              {busy ? "Creating your account…" : "Yes, that's right"}
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
