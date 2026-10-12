"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, Send, Gift, Wallet, Coffee, Waves, Utensils } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Mock live players in the room
const livePlayers = [
  { id: 1, name: "Sarah_DXB", avatar: "https://i.pravatar.cc/150?u=1", x: 20, y: 40 },
  { id: 2, name: "Mo_Crypto", avatar: "https://i.pravatar.cc/150?u=2", x: 70, y: 60 },
  { id: 3, name: "Elena_V", avatar: "https://i.pravatar.cc/150?u=3", x: 40, y: 70 },
  { id: 4, name: "Ahmed_Boss", avatar: "https://i.pravatar.cc/150?u=4", x: 80, y: 30 },
];

export default function VenueRoom({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<{user: string, text: string}[]>([
    { user: "System", text: "Welcome to the room." },
    { user: "Sarah_DXB", text: "Anyone want to do the Marina mission later?" }
  ]);
  const [selectedPlayer, setSelectedPlayer] = useState<typeof livePlayers[0] | null>(null);

  const venueName = id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  // Determine venue background and audio based on ID/category
  let bgImage = "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=1920"; // default hotel
  let audioSrc = null;

  if (id.includes("club")) {
    bgImage = "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&q=80&w=1920"; // neon club
    audioSrc = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_24a2f8c5b0.mp3?filename=electronic-future-beats-117997.mp3"; // club beat
  } else if (id.includes("mall")) {
    bgImage = "https://images.unsplash.com/photo-1519567281027-1c04262489e3?auto=format&fit=crop&q=80&w=1920"; // mall
    audioSrc = "https://cdn.pixabay.com/download/audio/2022/01/18/audio_8b248a39d8.mp3?filename=mall-ambience-14631.mp3"; // mall ambience
  } else if (id.includes("beach")) {
    bgImage = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1920"; // beach
    audioSrc = "https://cdn.pixabay.com/download/audio/2022/02/07/audio_4a6f2360eb.mp3?filename=ocean-waves-112906.mp3"; // ocean waves
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setMessages([...messages, { user: "You", text: chatMessage }]);
    setChatMessage("");
  };

  const handleSendMoney = () => {
    alert(`Sent 500 D-Coins to ${selectedPlayer?.name}!`);
    setSelectedPlayer(null);
  };

  const handleVenueAction = (action: string, cost: number) => {
    alert(`You chose to ${action} for ${cost} AED!`);
  };

  return (
    <main className="relative h-screen w-screen bg-zinc-950 overflow-hidden flex flex-col">
      
      {/* Venue Ambient Audio */}
      {audioSrc && (
        <audio autoPlay loop src={audioSrc} />
      )}

      {/* Venue Interior Background */}
      <div 
        className="absolute inset-0 pointer-events-none bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" /> {/* Dark overlay so avatars pop */}
      </div>

      {/* Top Bar */}
      <div className="relative z-20 flex items-center justify-between p-4 bg-black/50 backdrop-blur-md border-b border-white/10">
        <button 
          onClick={() => router.push("/explore")}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-white font-black text-xl tracking-tight">{venueName}</h1>
          <div className="text-xs text-green-400 font-bold flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {livePlayers.length + 1} People Here
          </div>
        </div>
        <div className="w-10" /> {/* spacer */}
      </div>

      {/* Venue Actions Bar */}
      <div className="relative z-20 w-full flex justify-center gap-2 p-4 bg-black/30 backdrop-blur-sm border-b border-white/5">
        <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10" onClick={() => handleVenueAction('Drink', 50)}>
          <Coffee className="w-4 h-4 mr-2 text-blue-400" /> Drink (-50 AED)
        </Button>
        <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10" onClick={() => handleVenueAction('Eat', 150)}>
          <Utensils className="w-4 h-4 mr-2 text-yellow-400" /> Eat (-150 AED)
        </Button>
        <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10" onClick={() => handleVenueAction('Swim', 100)}>
          <Waves className="w-4 h-4 mr-2 text-cyan-400" /> Swim (-100 AED)
        </Button>
      </div>

      {/* Play Area (Avatars) */}
      <div className="relative flex-1 z-10 w-full max-w-4xl mx-auto">
        {livePlayers.map((player) => (
          <Dialog key={player.id} open={selectedPlayer?.id === player.id} onOpenChange={(open) => !open && setSelectedPlayer(null)}>
            <button 
              onClick={() => setSelectedPlayer(player)}
              className="absolute flex flex-col items-center gap-2 transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform cursor-pointer group"
              style={{ left: `${player.x}%`, top: `${player.y}%` }}
            >
              <div className="bg-black/60 px-2 py-0.5 rounded-full text-xs font-bold text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                {player.name}
              </div>
              <Avatar className="w-16 h-16 border-2 border-white/20 shadow-2xl group-hover:border-blue-400">
                <AvatarImage src={player.avatar} />
                <AvatarFallback>{player.name[0]}</AvatarFallback>
              </Avatar>
            </button>
            
            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center">Interact with {player.name}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center py-6">
                <Avatar className="w-24 h-24 border-4 border-blue-500/30 mb-4">
                  <AvatarImage src={player.avatar} />
                </Avatar>
                <h3 className="text-xl font-black">{player.name}</h3>
                <p className="text-gray-400 text-sm mb-6">Level 12 Citizen</p>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 h-12">
                    <MessageSquare className="w-4 h-4 mr-2" /> Private Chat
                  </Button>
                  <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 h-12" onClick={handleSendMoney}>
                    <Wallet className="w-4 h-4 mr-2 text-yellow-400" /> Send 500 AED
                  </Button>
                  <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 h-12 col-span-2">
                    <Gift className="w-4 h-4 mr-2 text-pink-400" /> Send Gift
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}

        {/* User's own avatar fixed at bottom center */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
          <div className="bg-blue-600 px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-lg">
            You
          </div>
          <Avatar className="w-20 h-20 border-4 border-blue-500 shadow-2xl">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=You" />
          </Avatar>
        </div>
      </div>

      {/* Room Live Chat */}
      <div className="relative z-20 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 pb-8 h-64 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
          {messages.map((msg, idx) => (
            <div key={idx} className="text-sm">
              <span className={`font-bold mr-2 ${msg.user === 'You' ? 'text-blue-400' : msg.user === 'System' ? 'text-gray-500' : 'text-yellow-400'}`}>
                {msg.user}:
              </span>
              <span className="text-gray-300">{msg.text}</span>
            </div>
          ))}
        </div>
        
        <form onSubmit={handleSendMessage} className="flex gap-2 relative">
          <Input 
            placeholder="Chat with the room..." 
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus-visible:ring-blue-500"
          />
          <Button type="submit" className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-700 shrink-0 p-0 flex items-center justify-center">
            <Send className="w-5 h-5 text-white ml-1" />
          </Button>
        </form>
      </div>

    </main>
  );
}
