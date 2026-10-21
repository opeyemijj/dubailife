"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserPlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useCitizen } from "@/lib/citizenStore";
import { contacts } from "@/lib/messages";
import { gameAudio } from "@/utils/gameAudio";
import { sendPushNotification } from "@/lib/push/client";

interface FriendAlert {
  id: string;
  senderId: string;
  username: string;
  displayName: string;
  type: "request" | "accepted";
}

export function FriendRequestListener() {
  const { citizen } = useCitizen();
  const me = citizen?.id;
  const myUsername = citizen?.username;
  const router = useRouter();
  const [alerts, setAlerts] = useState<FriendAlert[]>([]);

  useEffect(() => {
    if (!me) return;

    // Listen to real-time friendship events
    const channel = supabase()
      .channel(`friendships-${me}-${Math.random().toString(36).slice(2, 7)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "friendships", filter: `friend_id=eq.${me}` },
        async (payload) => {
          const row = payload.new as { user_id: string; friend_id: string; status: string };
          if (row.status !== "pending") return;

          const who = (await contacts([row.user_id])).get(row.user_id);
          const username = who?.username ?? "someone";
          const displayName = who?.name ?? username;

          try { navigator.vibrate?.([80, 50, 80]); } catch {}
          gameAudio.playConfirmSound();

          const alertItem: FriendAlert = {
            id: `req-${row.user_id}-${Date.now()}`,
            senderId: row.user_id,
            username,
            displayName,
            type: "request",
          };

          setAlerts((list) => [...list.filter((a) => a.senderId !== row.user_id), alertItem]);
          setTimeout(() => {
            setAlerts((list) => list.filter((a) => a.id !== alertItem.id));
          }, 10000);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "friendships", filter: `user_id=eq.${me}` },
        async (payload) => {
          const row = payload.new as { user_id: string; friend_id: string; status: string };
          if (row.status !== "accepted") return;

          const who = (await contacts([row.friend_id])).get(row.friend_id);
          const username = who?.username ?? "someone";
          const displayName = who?.name ?? username;

          try { navigator.vibrate?.([60, 40, 60]); } catch {}
          gameAudio.playConfirmSound();

          const alertItem: FriendAlert = {
            id: `acc-${row.friend_id}-${Date.now()}`,
            senderId: row.friend_id,
            username,
            displayName,
            type: "accepted",
          };

          setAlerts((list) => [...list.filter((a) => a.senderId !== row.friend_id), alertItem]);
          setTimeout(() => {
            setAlerts((list) => list.filter((a) => a.id !== alertItem.id));
          }, 8000);
        }
      )
      .subscribe();

    return () => {
      supabase().removeChannel(channel);
    };
  }, [me, myUsername]);

  if (!alerts.length) return null;

  const acceptRequest = async (alert: FriendAlert) => {
    setAlerts((list) => list.filter((a) => a.id !== alert.id));
    gameAudio.playClickSound();

    const { error } = await supabase()
      .from("friendships")
      .update({ status: "accepted" })
      .eq("user_id", alert.senderId)
      .eq("friend_id", me!);

    if (!error) {
      // Send push notification back to the person who sent the request
      void sendPushNotification(
        alert.senderId,
        {
          title: "Friend Request Accepted 🤝",
          body: `@${myUsername || "Your friend"} accepted your friend request!`,
          url: "/phone?tab=contacts",
          tag: `friend-accept-${me}`,
        },
        me
      );
    }
  };

  const dismiss = (id: string) => {
    setAlerts((list) => list.filter((a) => a.id !== id));
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[170] space-y-2 w-[min(92vw,380px)] pointer-events-auto">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl p-3 shadow-2xl ring-4 ring-indigo-400/30 animate-[bounce_0.6s_ease-out_1]"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            {alert.type === "request" ? <UserPlus className="w-5 h-5 text-white" /> : <UserCheck className="w-5 h-5 text-emerald-300" />}
          </div>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => {
              dismiss(alert.id);
              router.push("/phone?tab=alerts");
            }}
          >
            <div className="text-xs font-black truncate">@{alert.username}</div>
            <div className="text-xs text-indigo-100 truncate">
              {alert.type === "request" ? "sent you a friend request" : "accepted your friend request!"}
            </div>
          </div>
          {alert.type === "request" ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => acceptRequest(alert)}
                className="px-2.5 py-1 bg-white text-indigo-700 text-xs font-black rounded-xl shadow active:scale-95 transition"
              >
                Accept
              </button>
              <button
                onClick={() => dismiss(alert.id)}
                className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => dismiss(alert.id)}
              className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

