"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Wallet, Sparkles, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    setIsLoading(true);
    // Simulate API to create Profile + add 50000 D-Coins
    setTimeout(() => {
      setIsLoading(false);
      router.push("/explore");
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/20 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/20 blur-[150px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10">
        
        {/* Step Indicator */}
        <div className="flex gap-2 mb-8">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-white/10'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-white/10'}`} />
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                <User className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white">Create Avatar</h1>
              <p className="text-sm text-gray-400 mt-2">Choose how you'll appear in the city.</p>
            </div>

            <div className="flex justify-center py-4">
              <Avatar className="w-32 h-32 border-4 border-black ring-2 ring-white/20 cursor-pointer hover:ring-blue-500 transition-all">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'placeholder'}`} />
                <AvatarFallback>AV</AvatarFallback>
              </Avatar>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Username</Label>
              <Input 
                placeholder="e.g. james_dxb"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/5 border-white/10 text-white h-12 rounded-xl text-center text-lg"
              />
            </div>

            <Button 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-white"
              disabled={!username.trim()}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/30">
                <Wallet className="w-8 h-8 text-yellow-400" />
              </div>
              <h1 className="text-2xl font-black text-white">Welcome Gift</h1>
              <p className="text-sm text-gray-400 mt-2">Every citizen starts with initial capital.</p>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2 text-yellow-400">
                <Sparkles className="w-5 h-5" />
                <span className="font-bold tracking-widest text-sm">INITIAL DEPOSIT</span>
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-5xl font-black text-white mb-2">50,000</div>
              <div className="text-blue-400 font-medium tracking-widest uppercase text-sm">AED / D-Coins</div>
            </div>

            <ul className="space-y-3 mt-6 mb-8 text-sm text-gray-400">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Find a place to rent in a district
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Customize your first apartment
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Explore nightlife and exclusive venues
              </li>
            </ul>

            <Button 
              className="w-full h-12 bg-white text-black hover:bg-gray-200 font-black rounded-xl text-lg transition-transform active:scale-95"
              onClick={handleComplete}
              disabled={isLoading}
            >
              {isLoading ? "Entering Dubai..." : "ENTER DUBAI"}
            </Button>
          </div>
        )}

      </div>
    </main>
  );
}
