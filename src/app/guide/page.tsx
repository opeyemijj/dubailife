"use client";

// How Dubai works: the full guide to the visa ladder, money, jobs, learning, scams, friends and prizes.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRequireCitizen } from "@/lib/citizenStore";
import { BottomNav } from "@/components/layout/BottomNav";
import { GuideFull } from "@/components/guide/HowItWorks";

export default function GuidePage() {
  useRequireCitizen();
  return (
    <main className="min-h-[100dvh] bg-slate-950 text-white pb-32">
      <div className="max-w-lg mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/explore" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-xl font-black">📖 How Dubai works</h1><p className="text-xs text-slate-400">Everything you can do, and how to get ahead</p></div>
        </div>
        <GuideFull />
      </div>
      <BottomNav />
    </main>
  );
}
