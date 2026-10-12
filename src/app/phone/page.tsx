"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Users, Bell, PhoneCall, ChevronRight, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function PhonePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const logged = localStorage.getItem("dubai_logged_in") === "true";
      const citizen = localStorage.getItem("dubai_citizen");
      if (!logged || !citizen) {
        router.replace("/?signup=true");
      }
    } catch {
      router.replace("/?signup=true");
    }
  }, [router]);
  return (
    <main className="relative min-h-screen bg-black overflow-hidden flex flex-col pb-24">
      {/* Background */}
      <div className="absolute inset-0 bg-zinc-950 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/10 blur-[100px] pointer-events-none" />

      {/* Phone Header */}
      <div className="relative z-10 pt-16 px-6 pb-6">
        <h1 className="text-3xl font-black text-white tracking-tight">Messages</h1>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 w-full max-w-md mx-auto px-4 flex flex-col">
        <Tabs defaultValue="chats" className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10 rounded-2xl h-14 mb-6">
            <TabsTrigger value="chats" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-black">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chats
            </TabsTrigger>
            <TabsTrigger value="contacts" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-black">
              <Users className="w-4 h-4 mr-2" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-black relative">
              <Bell className="w-4 h-4 mr-2" />
              Alerts
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="flex-1 overflow-y-auto space-y-4 outline-none">
            <div className="sticky top-0 bg-zinc-950 pb-4 z-10">
              <Input 
                placeholder="Search messages..." 
                className="bg-white/5 border-white/10 rounded-xl h-12 text-white placeholder:text-gray-500"
              />
            </div>

            <ChatRow 
              name="Sarah" 
              avatar="https://i.pravatar.cc/150?u=sarah"
              message="Are you coming to the Vibe Nation event tonight?"
              time="12:04 PM"
              unread={2}
            />
            <ChatRow 
              name="Michael" 
              avatar="https://i.pravatar.cc/150?u=mike"
              message="Let's meet at the Marina!"
              time="Yesterday"
            />
            <ChatRow 
              name="Property Manager" 
              avatar="https://i.pravatar.cc/150?u=prop"
              message="Your rent for Downtown Studio is due tomorrow."
              time="Tue"
              isSystem
            />
            <ChatRow 
              name="Vibe Nation Club" 
              avatar="https://i.pravatar.cc/150?u=vibe"
              message="You successfully claimed your VIP entry."
              time="Mon"
              isSystem
            />
          </TabsContent>

          <TabsContent value="contacts" className="flex-1 overflow-y-auto space-y-2 outline-none">
             <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between mb-4 hover:bg-white/10 cursor-pointer transition-colors">
               <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/30">
                   <MapPin className="w-6 h-6 text-blue-400" />
                 </div>
                 <div>
                   <div className="font-bold text-white text-lg">Meet Me</div>
                   <div className="text-sm text-gray-400">Share your virtual location</div>
                 </div>
               </div>
               <ChevronRight className="text-gray-500" />
             </div>
             
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-2 mt-6 mb-2">Online Now</h3>
             <ContactRow name="Sarah" avatar="https://i.pravatar.cc/150?u=sarah" status="online" location="Dubai Marina" />
             <ContactRow name="Alex" avatar="https://i.pravatar.cc/150?u=alex" status="online" location="Downtown" />
             
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-2 mt-6 mb-2">Offline</h3>
             <ContactRow name="Michael" avatar="https://i.pravatar.cc/150?u=mike" status="offline" />
          </TabsContent>

          <TabsContent value="notifications" className="flex-1 overflow-y-auto space-y-3 outline-none">
            <NotificationRow 
              title="Mission Completed!" 
              desc="You explored 3 districts. Reward: +1000 D-Coins" 
              time="2m ago" 
            />
            <NotificationRow 
              title="Alex entered your apartment" 
              desc="Alex is currently in your Downtown Studio." 
              time="1h ago" 
            />
            <NotificationRow 
              title="New Event Nearby" 
              desc="A new nightlife event just popped up in Dubai Marina." 
              time="3h ago" 
            />
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </main>
  );
}

function ChatRow({ name, avatar, message, time, unread, isSystem }: { name: string, avatar: string, message: string, time: string, unread?: number, isSystem?: boolean }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group">
      <div className="relative">
        <Avatar className="w-14 h-14 border border-white/10">
          <AvatarImage src={avatar} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        {isSystem && (
          <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center border-2 border-black">
            <Shield className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-white truncate text-base">{name}</span>
          <span className={`text-xs whitespace-nowrap ${unread ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>{time}</span>
        </div>
        <p className={`text-sm truncate ${unread ? 'text-white font-medium' : 'text-gray-400'}`}>
          {message}
        </p>
      </div>

      {unread && (
        <div className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">
          {unread}
        </div>
      )}
    </div>
  );
}

function ContactRow({ name, avatar, status, location }: { name: string, avatar: string, status: 'online' | 'offline', location?: string }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer">
      <div className="relative">
        <Avatar className="w-12 h-12 border border-white/10">
          <AvatarImage src={avatar} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-black rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
      </div>
      
      <div className="flex-1">
        <div className="font-bold text-white text-base">{name}</div>
        {location && <div className="text-xs text-blue-400 font-medium">At {location}</div>}
      </div>
      
      <div className="flex gap-2">
        <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <MessageSquare className="w-4 h-4 text-white" />
        </button>
        <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <PhoneCall className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

function NotificationRow({ title, desc, time }: { title: string, desc: string, time: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer">
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-bold text-white text-sm">{title}</h4>
        <span className="text-xs text-gray-500 whitespace-nowrap ml-4">{time}</span>
      </div>
      <p className="text-sm text-gray-400 leading-snug">{desc}</p>
    </div>
  );
}

// Temporary Shield icon for the ChatRow component since it's not imported at the top. 
function Shield(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  )
}
