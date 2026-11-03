"use client";

// The people at your party, for the host at home: tap someone to chat, wave, send money or add them as a friend
// (the same panel guests use with each other), and what they say and send pops up as it happens.

import { useEffect, useState } from "react";
import { PeerPanel } from "@/components/social/PeerPanel";
import { SocialFeed } from "@/components/social/SocialFeed";
import { useCitizen } from "@/lib/citizenStore";
import { befriend, sendMoney, type useRoom } from "@/lib/room";
import { gameAudio } from "@/utils/gameAudio";

type Room = ReturnType<typeof useRoom>;

export function PartyPeople({ room, place, peerId, setPeerId, say }: {
  room: Room; place: string; peerId: string | null; setPeerId: (id: string | null) => void; say: (text: string) => void;
}) {
  const { citizen } = useCitizen();
  const [startChat, setStartChat] = useState(false);
  const [clock, setClock] = useState(0);
  useEffect(() => {
    if (!peerId) return;
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, [peerId]);
  const peer = room.peers.find((p) => p.userId === peerId);
  const me = citizen?.id ?? "";

  return (
    <>
      {peer && (
        <PeerPanel
          key={peer.userId}
          peer={peer}
          context="home"
          balance={citizen?.balance ?? 0}
          startIn={startChat ? "chat" : "menu"}
          unread={room.unread[peer.userId] ?? 0}
          messages={room.messages.filter((m) => m.with === peer.userId)}
          typing={room.isTyping(peer.userId, clock)}
          onTyping={() => room.typingTo(peer.userId)}
          onThread={(open) => room.openThread(open ? peer.userId : null)}
          onClose={() => { setPeerId(null); setStartChat(false); }}
          onChat={(text) => room.say(peer.userId, text, place)}
          onSendMoney={async (amount) => {
            const error = await sendMoney(peer, amount, place);
            if (!error) { room.emit({ type: "money", amount }, peer.userId); gameAudio.playCoinSound(); say(`💸 Sent AED ${amount.toLocaleString()} to @${peer.username}`); }
            return error;
          }}
          onWave={() => { room.emit({ type: "wave" }, peer.userId); say(`👋 You waved at @${peer.username}`); setPeerId(null); }}
          onInvite={() => {}}
          onFriend={async () => {
            const r = await befriend(me, peer);
            if (r === "sent") room.emit({ type: "friend" }, peer.userId);
            return r === "friends" ? `You and @${peer.username} are now friends 🤝` : r === "sent" ? "Friend request sent" : r === "blocked" ? "You can't add them." : "Couldn't send the request. Try again.";
          }}
        />
      )}
      <SocialFeed
        events={room.events}
        readingWith={peerId}
        onAccept={() => {}}
        onReply={(e) => { setStartChat(true); setPeerId(e.from.userId); }}
        onFriend={async (e) => { const r = await befriend(me, e.from); say(r === "friends" ? `🤝 You and @${e.from.username} are now friends` : "Couldn't add them. Try again."); }}
      />
    </>
  );
}
