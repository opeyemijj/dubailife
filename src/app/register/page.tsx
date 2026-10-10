"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Mail, Lock } from "lucide-react";
const InteractiveMap = dynamic(() => import("@/components/map/InteractiveMap").then(mod => mod.InteractiveMap), { ssr: false });

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call for now
    setTimeout(() => {
      setIsLoading(false);
      // Route to avatar creation / onboarding
      router.push("/onboarding");
    }, 1000);
  };

  return (
    <main className="relative h-screen w-screen bg-black overflow-hidden flex items-center justify-center">
      {/* 2D Map Background */}
      <div className="absolute inset-0 z-0 opacity-50 pointer-events-none">
        <InteractiveMap />
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-md p-8 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl border border-blue-500/30 flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-black text-white text-center tracking-tight">Join the City</h1>
          <p className="text-gray-400 mt-2 text-center text-sm">
            Create your digital identity to enter Dubai.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input 
                id="email" 
                type="email" 
                placeholder="citizen@dubai.app" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white h-12 rounded-xl focus-visible:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white h-12 rounded-xl focus-visible:ring-blue-500"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-12 mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
          >
            {isLoading ? "Validating..." : "Get Started"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already a citizen? <a href="#" className="text-blue-400 hover:underline">Log in</a>
        </p>
      </div>
    </main>
  );
}
