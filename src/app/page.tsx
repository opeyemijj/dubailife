"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Users, Coins, Building as BuildingIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const InteractiveMap = dynamic(() => import("@/components/map/InteractiveMap").then(mod => mod.InteractiveMap), { ssr: false });

export default function Home() {
  return (
    <main className="relative min-h-screen bg-black overflow-hidden flex flex-col">
      {/* 2D Map Background */}
      <InteractiveMap />

      {/* Background Gradient / Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="text-2xl font-bold tracking-tighter text-white">
          DUBAI<span className="text-blue-500">.</span>APP
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" className="text-white hover:text-blue-400 hover:bg-white/5">
            Log in
          </Button>
          <Button className="bg-blue-600 text-white hover:bg-blue-700">
            Create Avatar
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 pt-12 pb-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-blue-400 text-sm font-medium mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Early Access Beta
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white max-w-5xl mb-6 leading-[1.1]">
          COME TO <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-500">DUBAI</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mb-12 font-light">
          A persistent digital city where you can live, work, explore, and connect. The real Dubai, reimagined for the social age.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/register">
            <Button size="lg" className="h-14 px-8 text-lg bg-white text-black hover:bg-gray-200">
              Enter the City
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/explore">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10 backdrop-blur-md">
              Explore Venues
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <FeatureCard 
            icon={<MapPin className="w-6 h-6 text-blue-400" />}
            title="Real-World Discovery"
            description="Explore a digital twin of Dubai and check into real physical venues."
          />
          <FeatureCard 
            icon={<Users className="w-6 h-6 text-violet-400" />}
            title="Social Network"
            description="Meet new people, chat, and attend exclusive digital and physical events."
          />
          <FeatureCard 
            icon={<BuildingIcon className="w-6 h-6 text-cyan-400" />}
            title="Virtual Real Estate"
            description="Rent apartments, customize your home, and start your own virtual business."
          />
          <FeatureCard 
            icon={<Coins className="w-6 h-6 text-yellow-400" />}
            title="Game Economy"
            description="Work jobs, complete missions, and earn D-Coins to level up your lifestyle."
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
      <div className="w-12 h-12 rounded-full bg-black/50 border border-white/5 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
