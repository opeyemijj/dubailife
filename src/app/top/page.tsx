"use client";

// Top users this week and the richest users (requirements R6), as a page: from the City Feed, the More menu and
// the wiki. ?tab=rich opens on the richest.

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useRequireCitizen } from "@/lib/citizenStore";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopUsersList } from "@/components/social/TopUsers";

export default function TopPage() {
  return <Suspense><Top /></Suspense>;
}

function Top() {
  useRequireCitizen();
  const params = useSearchParams();
  return (
    <main className="relative min-h-[100dvh] bg-slate-950 text-white pb-32">
      <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-amber-500/20 to-transparent pointer-events-none" />
      <div className="relative max-w-md mx-auto px-4 pt-[max(1.5rem,env(safe-area-inset-top))] space-y-4">
        <header className="flex items-center gap-3">
          <Link href="/city" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back to the City"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-2xl font-black flex-1">{params?.get("tab") === "online" ? "Available to chat" : "Top users"}</h1>
        </header>
        <TopUsersList dark start={(["rich", "givers", "online"] as const).find((t) => t === params?.get("tab")) ?? "week"} />
      </div>
      <BottomNav />
    </main>
  );
}
