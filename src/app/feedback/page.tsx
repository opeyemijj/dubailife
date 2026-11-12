import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { FeedbackBoard } from "@/components/social/FeedbackBoard";

export const metadata: Metadata = {
  title: "Dubai Life Feedback & Community Roadmap — Feature Voting",
  description:
    "Upvote and propose new features, yacht parties, house clubs, spaces, and districts for Dubai Life Game. See what the development team is building next.",
  alternates: {
    canonical: "/feedback",
  },
  openGraph: {
    title: "Dubai Life Feedback & Roadmap — Vote On New Features",
    description: "Propose features, vote on upcoming additions, and shape Dubai Life Game with thousands of players.",
    url: "/feedback",
    siteName: "Dubai Life Game",
    type: "website",
  },
  twitter: {
    title: "Dubai Life Feedback & Roadmap — Vote On New Features",
    description: "Propose features and shape Dubai Life Game.",
  },
};

export default function FeedbackPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white selection:bg-amber-400 selection:text-slate-950">
      {/* Top Navigation */}
      <nav className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dubai</span>
          </Link>

          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🏙️</span>
            <span className="font-black text-sm tracking-wide text-white">DUBAI LIFE</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors"
            >
              My Residence
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Feedback Board Container */}
      <div className="py-6 sm:py-10">
        <FeedbackBoard />
      </div>

      {/* Simple Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-400 space-y-2">
        <p>© 2026 Dubai Life · Virtual Dubai Simulation</p>
        <div className="flex justify-center gap-4 text-slate-400">
          <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-white">Terms of Service</Link>
          <span>·</span>
          <a href="mailto:support@mydubailife.app" className="hover:text-white">support@mydubailife.app</a>
        </div>
      </footer>
    </main>
  );
}
