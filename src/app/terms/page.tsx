import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Scale, AlertTriangle, ShieldCheck, FileCheck } from "lucide-react";
import { SITE } from "@/lib/site";
import { MIN_AGE } from "@/lib/age";

const TITLE = "Terms of Service";
const DESCRIPTION =
  "Terms of Service for Dubai Life. Rules, user conduct, virtual currency disclaimer, and service conditions.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} - Dubai Life` },
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/terms" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function TermsOfServicePage() {
  const lastUpdated = "November 8, 2026";

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 py-3.5">
          <Link
            href="/about"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to About</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-extrabold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Enter Dubai Life →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-16 space-y-10">
        {/* Title Block */}
        <div className="space-y-3 border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
            <Scale className="w-3.5 h-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Last Updated: {lastUpdated} · Official domain:{" "}
            <span className="text-slate-200 font-mono">{SITE.domain}</span>
          </p>
        </div>

        {/* Introduction */}
        <section className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-300">
          <p>
            Please read these Terms of Service (&ldquo;Terms&rdquo;) carefully before using the <strong>Dubai Life</strong>{" "}
            application and website at <a href={SITE.url} className="text-emerald-400 hover:underline">{SITE.domain}</a>.
            These Terms form a legally binding agreement between you and <strong>Opeyemi Ishola (Brain)</strong> (&ldquo;Dubai Life,&rdquo; &ldquo;we,&rdquo; or &ldquo;our&rdquo;).
          </p>
          <p>
            By accessing or playing Dubai Life, creating an account, or signing in via Google or email, you agree to be bound
            by these Terms. If you do not agree to these Terms, please do not use the application.
          </p>
        </section>

        {/* 1. Eligibility & Minimum Age */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-400">
              1
            </span>
            Eligibility &amp; Age Requirements
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            You must be at least <strong>{MIN_AGE} years old</strong> to register an account and play Dubai Life.
            By creating an account, you represent and warrant that you meet this minimum age requirement and have the legal
            capacity to agree to these Terms.
          </p>
        </section>

        {/* 2. Virtual Currency & Virtual Assets Disclaimer */}
        <section className="space-y-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm sm:text-base">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Important: Virtual Currency &amp; Virtual Assets Disclaimer</span>
          </div>
          <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              Dubai Life includes in-game virtual currency referred to as <strong>Virtual AED (AED)</strong>, as well as
              virtual real estate, clothing, vehicles, furniture, and cosmetic badges.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li>
                <strong>No Real-World Cash Value:</strong> Virtual AED and in-game items have <strong>zero monetary or cash value</strong>.
                They cannot be redeemed, refunded, exchanged, or converted into real-world fiat currency, cryptocurrency, or physical goods.
              </li>
              <li>
                <strong>No Real Estate Ownership:</strong> Apartments, villas, and venues inside Dubai Life are simulation assets only.
                They confer no real-world ownership, title, lease, or legal rights to physical properties in Dubai or elsewhere.
              </li>
              <li>
                <strong>Non-Transferable:</strong> In-game assets cannot be sold for real money outside the simulation.
                Any real-money trading (RMT) outside the platform is strictly prohibited and grounds for immediate account termination.
              </li>
            </ul>
          </div>
        </section>

        {/* 3. Account Security & Registration */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-400">
              3
            </span>
            Account Registration &amp; Security
          </h2>
          <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
            <p>
              When creating an account or logging in with Google, you agree to provide accurate and truthful information.
              You are solely responsible for maintaining the confidentiality of your login credentials and for all activities
              under your account. You must notify us immediately if you suspect unauthorized access to your account.
            </p>
          </div>
        </section>

        {/* 4. Community Rules & Fair Play */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-400">
              4
            </span>
            Community Standards &amp; Prohibited Conduct
          </h2>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>To ensure a safe and respectful virtual city for all citizens, you agree that you will NOT:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-300">
              <li>Engage in harassment, hate speech, bullying, stalking, defamation, or threats of violence.</li>
              <li>Impersonate city officials, moderators, developers, other players, or real-world Dubai entities.</li>
              <li>Broadcast abusive, illegal, sexually explicit, or infringing content in Live Audio Spaces or public chats.</li>
              <li>Use unauthorized third-party automation tools, cheat engines, bots, or exploit simulation bugs.</li>
              <li>Attempt to reverse engineer, decompile, DDoS, or disrupt our servers and infrastructure.</li>
              <li>Scam, phish, or attempt to defraud other citizens of virtual assets or personal information.</li>
            </ul>
          </div>
        </section>

        {/* 5. Intellectual Property */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-400">
              5
            </span>
            Intellectual Property Rights
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            All code, 3D graphics, user interfaces, storylines, artwork, audio elements, game mechanics, and trademarks
            in Dubai Life are the exclusive intellectual property of <strong>Opeyemi Ishola</strong> and protected by
            applicable copyright and intellectual property laws. You are granted a personal, revocable, non-exclusive,
            non-transferable license to access and play Dubai Life for entertainment purposes.
          </p>
        </section>

        {/* 6. Account Suspension & Termination */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-400">
              6
            </span>
            Suspension &amp; Termination
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            We reserve the right to warn, suspend, or permanently ban any user account, without liability or prior notice,
            if we determine in good faith that you have violated these Terms, engaged in fraudulent or abusive conduct, or
            posed a threat to the community or service infrastructure.
          </p>
        </section>

        {/* 7. Disclaimer of Warranties & Limitation of Liability */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-400">
              7
            </span>
            Disclaimer of Warranties &amp; Liability
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Dubai Life is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind,
            either express or implied. We do not warrant that the service will be uninterrupted, error-free, or completely secure.
            In no event shall Dubai Life or its creator be liable for any indirect, incidental, special, or consequential damages
            arising from your use of or inability to use the application.
          </p>
        </section>

        {/* 8. Governing Law & Jurisdiction */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-400">
              8
            </span>
            Governing Law &amp; Jurisdiction
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            These Terms shall be governed and construed in accordance with the laws of the Emirate of Dubai and the applicable
            Federal Laws of the United Arab Emirates, without regard to conflict of law provisions.
          </p>
        </section>

        {/* 9. Contact Us */}
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            Questions &amp; Contact
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            If you have questions or concerns regarding these Terms of Service, please reach out to us at:
          </p>
          <div className="text-xs sm:text-sm text-slate-200 space-y-1 font-mono pt-1">
            <p><strong>Operator:</strong> Opeyemi Ishola (Brain)</p>
            <p><strong>App:</strong> Dubai Life ({SITE.domain})</p>
            <p><strong>Support Email:</strong> support@cometodubai.com</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-4xl px-4 flex flex-wrap items-center justify-center gap-4">
          <span>&copy; {new Date().getFullYear()} Dubai Life · All rights reserved</span>
          <span>·</span>
          <Link href="/privacy" className="text-slate-400 hover:text-white underline">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/about" className="text-slate-400 hover:text-white underline">
            About Dubai Life
          </Link>
        </div>
      </footer>
    </div>
  );
}
