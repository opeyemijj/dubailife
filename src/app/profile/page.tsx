"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Star, MapPin, Briefcase, Home, Shield, Award, Map, Car, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const router = useRouter();
  const [citizen, setCitizen] = useState<any>(null);

  useEffect(() => {
    try {
      const logged = localStorage.getItem("dubai_logged_in") === "true";
      const stored = localStorage.getItem("dubai_citizen");
      if (!logged || !stored) {
        router.replace("/?signup=true");
        return;
      }
      setCitizen(JSON.parse(stored));
    } catch {
      router.replace("/?signup=true");
    }
  }, [router]);

  const displayName = citizen?.name || "Rashid";
  const displayUsername = citizen?.username ? `@${citizen.username}` : "@rashid_dxb";
  const displayHome = citizen?.home || "Downtown Studio";

  return (
    <main className="relative min-h-screen bg-black overflow-hidden flex flex-col pb-32">
      {/* Background Gradient */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-900/40 to-black pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/20 blur-[120px] rounded-full pointer-events-none" />

      <TopBar />

      <div className="relative z-10 flex-1 overflow-y-auto pt-24 px-4 w-full max-w-2xl mx-auto space-y-6">
        {/* Header / Avatar Section */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <Avatar className="w-32 h-32 border-4 border-black ring-2 ring-white/20">
              <AvatarImage src="https://i.pravatar.cc/300?u=james" />
              <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-blue-600 border-2 border-black rounded-full w-10 h-10 flex items-center justify-center text-white">
              <Star className="w-5 h-5 fill-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-white flex items-center justify-center gap-2">
            {displayName}
            <Shield className="w-5 h-5 text-blue-400" />
          </h1>
          <p className="text-gray-400 font-medium tracking-wide">{displayUsername} · Dubai Citizen</p>

          {/* Level Progress */}
          <div className="w-full max-w-xs mt-6 space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-yellow-400">Level 17</span>
              <span className="text-gray-400">8,450 / 10,000 XP</span>
            </div>
            <Progress value={84.5} className="h-2 bg-white/10" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button className="flex-1 bg-white text-black hover:bg-gray-200 font-bold rounded-xl h-12">
            Edit Avatar
          </Button>
          <Button variant="outline" className="w-12 h-12 rounded-xl border-white/10 text-white bg-white/5 hover:bg-white/10">
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard icon={<Star className="w-5 h-5 text-yellow-400" />} label="Reputation" value="86" />
          <StatCard icon={<Award className="w-5 h-5 text-violet-400" />} label="Achievements" value="24" />
        </div>

        {/* Life Status */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white mb-4">Current Status</h2>
          
          <StatusRow 
            icon={<Home className="w-6 h-6 text-cyan-400" />} 
            title="Property" 
            value="Downtown Studio" 
            sub="Rent paid until Oct 15"
          />
          
          <StatusRow 
            icon={<Briefcase className="w-6 h-6 text-blue-400" />} 
            title="Job" 
            value="Software Engineer" 
            sub="Next salary in 3 days"
          />
          
          <StatusRow 
            icon={<Car className="w-6 h-6 text-gray-300" />} 
            title="Vehicle" 
            value="BMW M4" 
            sub="Parked at Downtown"
          />
        </div>

        {/* Passport & Inventory Teasers */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 hover:bg-white/10 transition-colors cursor-pointer flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
              <Map className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-white font-bold block mb-1">Dubai Passport</span>
            <span className="text-xs text-gray-400">12 stamps collected</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 hover:bg-white/10 transition-colors cursor-pointer flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center mb-3">
              <Briefcase className="w-6 h-6 text-violet-400" />
            </div>
            <span className="text-white font-bold block mb-1">Inventory</span>
            <span className="text-xs text-gray-400">45 items owned</span>
          </div>
        </div>

      </div>

      <BottomNav />
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
      <div className="bg-black/50 p-3 rounded-full">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black text-white leading-none mb-1">{value}</div>
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function StatusRow({ icon, title, value, sub }: { icon: React.ReactNode, title: string, value: string, sub: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-black/50 border border-white/5 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-xs text-gray-400 mb-0.5 font-medium uppercase tracking-wider">{title}</div>
        <div className="text-base font-bold text-white leading-tight">{value}</div>
        <div className="text-xs text-blue-400/80 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}
