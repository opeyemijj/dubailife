"use client";

// /profile renders the exact same unified LifePanel content (Profile, Visa & budget, League, Season,
// Needs, Goals, Skills, People, Career, Settings + the 3-pill Streak/Visa/Runway retention strip).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireCitizen } from "@/lib/citizenStore";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { LifePanel, type LifeTab } from "@/components/life/LifePanel";

export default function ProfilePage() {
  const router = useRouter();
  const { citizen } = useRequireCitizen();
  const [tab, setTab] = useState<LifeTab>("profile");

  if (!citizen) return <main className="min-h-screen bg-slate-950" />;

  return (
    <main className="min-h-screen bg-slate-950 pt-16 pb-28 px-3 sm:px-4">
      <TopBar />
      <LifePanel open tab={tab} onTab={setTab} onClose={() => router.push("/explore")} inline />
      <BottomNav />
    </main>
  );
}
