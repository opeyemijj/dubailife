import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, FileText, CheckCircle2 } from "lucide-react";
import { SITE } from "@/lib/site";

const TITLE = "Privacy Policy";
const DESCRIPTION =
  "Privacy Policy for Dubai Life. Learn how we collect, use, and protect your personal data, including Google OAuth user data.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} - Dubai Life` },
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/privacy" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function PrivacyPolicyPage() {
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
            <Shield className="w-3.5 h-3.5" />
            <span>Official Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Effective Date: {lastUpdated} · Official domain:{" "}
            <span className="text-slate-200 font-mono">{SITE.domain}</span>
          </p>
        </div>

        {/* Introduction */}
        <section className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-300">
          <p>
            Welcome to <strong>Dubai Life</strong> (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;),
            accessible at <a href={SITE.url} className="text-emerald-400 hover:underline">{SITE.domain}</a>.
            Dubai Life is a 3D virtual world and life simulation game created and operated by{" "}
            <strong>Opeyemi Ishola (Brain)</strong>.
          </p>
          <p>
            We respect your privacy and are committed to protecting the personal data you share with us.
            This Privacy Policy explains what information we collect, why we collect it, how it is used
            and stored, and your rights regarding your personal information, in compliance with applicable
            data protection laws including the UAE Federal Decree-Law No. 45 of 2021 regarding the
            Protection of Personal Data (PDPL) and international standards.
          </p>
        </section>

        {/* 1. Information We Collect */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-400">
              1
            </span>
            Information We Collect
          </h2>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>We only collect information necessary to deliver, authenticate, and improve your gameplay experience:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>
                <strong>Account &amp; Authentication Data:</strong> When you register or log in, we collect your email address
                and an encrypted password hash (via our secure authentication provider, Supabase).
              </li>
              <li>
                <strong>Google OAuth Data:</strong> When you choose to sign in with Google, we receive basic profile information
                provided by Google: your email address, verified account status, and public display name. We do not access
                your Google contacts, Google Drive, private files, or calendar.
              </li>
              <li>
                <strong>Gameplay &amp; Profile Data:</strong> Your chosen Dubai citizen handle (@username), avatar customization
                choices, in-game virtual currency balance (virtual AED), virtual apartments, furniture layout, job shifts,
                game scores, and achievements.
              </li>
              <li>
                <strong>Live Audio Spaces &amp; Chat Data:</strong> Real-time ephemeral communication data (e.g. peer connection
                identifiers for WebRTC live audio rooms and public chat messages) necessary to connect you with other players.
              </li>
              <li>
                <strong>Technical &amp; Device Information:</strong> Browser type, operating system, preferred language,
                and session identifiers used to maintain your login and prevent spam or unauthorized automated activity.
              </li>
            </ul>
          </div>
        </section>

        {/* 2. Google API Services User Data Policy */}
        <section className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6">
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm sm:text-base">
            <Lock className="w-5 h-5 shrink-0" />
            <span>Google API Services User Data Compliance</span>
          </div>
          <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              Dubai Life&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 font-semibold underline hover:text-emerald-300"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements:
            </p>
            <ul className="space-y-2 pt-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  We use your Google account data strictly to authenticate your account and identify your player profile.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  We <strong>never sell</strong> your Google user data or transfer it to third-party data brokers.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  We do not use Google user data for advertising, remarketing, or personalized third-party ad targeting.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  No human employee or contractor reads your Google data unless required by applicable law or authorized by you to investigate a bug you reported.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* 3. How We Use Your Information */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-400">
              3
            </span>
            How We Use Your Information
          </h2>
          <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
            <p>Your information is used solely to:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-300">
              <li>Create and securely maintain your player account and avatar state.</li>
              <li>Save and synchronize your virtual apartment, balance, and gameplay progress.</li>
              <li>Connect you with other citizens in multiplayer venues, Live Audio Spaces, and arcade games.</li>
              <li>Send critical transactional notifications (such as password resets or account verification links).</li>
              <li>Prevent cheating, automated bots, harassment, and unauthorized access.</li>
            </ul>
          </div>
        </section>

        {/* 4. Data Storage, Security & Retention */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-400">
              4
            </span>
            Data Storage, Security &amp; Retention
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Your data is stored in enterprise-grade cloud databases with encryption in transit (HTTPS / TLS 1.3) and
            encryption at rest (AES-256). We retain your account data for as long as your account remains active.
            If your account remains inactive for an extended period or you request deletion, your account and associated
            personal data will be deleted or irreversibly anonymized.
          </p>
        </section>

        {/* 5. Your Rights & Data Deletion */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-400">
              5
            </span>
            Your Rights &amp; How to Delete Your Data
          </h2>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>You have full control over your personal data. You are entitled to:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-300">
              <li>Access and review the personal information associated with your account.</li>
              <li>Request correction or updates to any inaccurate information.</li>
              <li>
                <strong>Request total account and data deletion:</strong> You can delete your account and all associated
                profile data at any time by emailing us at{" "}
                <a href="mailto:support@cometodubai.com" className="text-emerald-400 underline font-semibold">
                  support@cometodubai.com
                </a>{" "}
                with your registered username or email address. We process deletion requests within 7 business days.
              </li>
            </ul>
          </div>
        </section>

        {/* 6. Children's Privacy */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-400">
              6
            </span>
            Children&apos;s Privacy
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Dubai Life is designed for players aged 13 and above. We do not knowingly collect personal identifiable
            information from children under the age of 13. If you believe a child under 13 has provided personal data,
            please contact us immediately at <a href="mailto:support@cometodubai.com" className="text-emerald-400 underline">support@cometodubai.com</a> and
            we will promptly delete such records.
          </p>
        </section>

        {/* 7. Contact Us */}
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Contact &amp; Data Controller
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            For questions regarding this Privacy Policy, your rights, or data deletion requests, please contact:
          </p>
          <div className="text-xs sm:text-sm text-slate-200 space-y-1 font-mono pt-1">
            <p><strong>Operator:</strong> Opeyemi Ishola (Brain)</p>
            <p><strong>App:</strong> Dubai Life ({SITE.domain})</p>
            <p><strong>Email:</strong> support@cometodubai.com</p>
            <p><strong>Location:</strong> Dubai, United Arab Emirates</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-4xl px-4 flex flex-wrap items-center justify-center gap-4">
          <span>&copy; {new Date().getFullYear()} Dubai Life · All rights reserved</span>
          <span>·</span>
          <Link href="/terms" className="text-slate-400 hover:text-white underline">
            Terms of Service
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
