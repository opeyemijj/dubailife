"use client";

// A flat or home: travel there, get through the door (access rules / knocking), then see the saved
// interior. Residents and editors can furnish it; owners manage access, guests and listings.

import { askForPush } from "@/lib/push/engage";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, DoorClosed, KeyRound, Loader2, LogOut, MapPin, Navigation, Settings2, ShoppingBag, UserPlus, X, Zap } from "lucide-react";
import { ApartmentRoom, type PlacingState } from "@/components/home/ApartmentRoom";
import { CATALOG, getCatalogItem, housingTierFor, withHomeItems, HOUSING_CONFIGS, type CatalogItem, type OwnedFurniture, type Placement, type Rotation, type HousingTier } from "@/lib/furniture";
import { adjustBalance, updateCitizen, useCitizen, useRequireCitizen } from "@/lib/citizenStore";
import { distanceMetres, entranceOf, getEntity } from "@/lib/city/geo";
import { instantFare } from "@/lib/transit";
import {
  ACCESS_LABEL, addGuest, flatTitle, getFlat, getInterior, listFlat, listGuests, removeGuest, requestEntry, saveInterior, setAccess, watchRequest,
  type Access, type FlatView, type Listing,
} from "@/lib/city/flats";
import { ROSTER } from "@/components/avatar/roster";
import { gameAudio } from "@/utils/gameAudio";
import { befriend, sendMoney, useRoom, type Received } from "@/lib/room";
import { PeerPanel } from "@/components/social/PeerPanel";
import { SocialFeed } from "@/components/social/SocialFeed";
import type { Person } from "@/components/home/ApartmentRoom";
import { SmallLoader } from "@/components/GameLoadingScreen";

/** Unique id for a newly bought piece of furniture. */
const newUid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

type Door = { state: "checking" } | { state: "closed"; reason: string } | { state: "knocking"; requestId: string } | { state: "denied" } | { state: "open"; canEdit: boolean; reason: string };

export function PropertyRoute({ buildingId, unit }: { buildingId: string; unit: string }) {
  const router = useRouter();
  const { citizen, hydrated } = useRequireCitizen();
  const flatId = `${buildingId}:${unit}`;
  const building = getEntity(buildingId);
  const [flat, setFlat] = useState<FlatView | null | undefined>(undefined);
  const [door, setDoor] = useState<Door>({ state: "checking" });
  const [furniture, setFurniture] = useState<OwnedFurniture[]>([]);

  const load = useCallback(async () => {
    const f = await getFlat(flatId);
    setFlat(f);
    if (!f) return;
    const res = await getInterior(flatId);
    if (res.ok) {
      setFurniture(res.data.interior?.furniture ?? []);
      setDoor({ state: "open", canEdit: res.data.can_edit, reason: res.data.reason });
    } else {
      setDoor({ state: "closed", reason: res.error.replace(/^access_denied:/, "") });
    }
  }, [flatId]);

  const atBuilding = citizen?.location?.placeId === buildingId;
  // Fetches the flat once the citizen has arrived; state is set when the request resolves.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hydrated && citizen && atBuilding) void load();
  }, [hydrated, citizen?.id, atBuilding, load]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated || !citizen) return <Blank />;
  if (!building) return <Card><h1 className="text-xl font-black">This home doesn&apos;t exist</h1><Link href="/explore" className="mt-4 inline-block px-4 py-2 rounded-xl bg-emerald-500 text-white font-black">Back to the city</Link></Card>;

  // Travel first (or skip on purpose).
  if (!atBuilding) {
    // Skipping the trip costs a premium (more than a taxi); only walking is free.
    const at = entranceOf(buildingId);
    const premium = instantFare(at && citizen.location ? distanceMetres(citizen.location, at) : 0);
    const goDirectly = () => {
      if (!adjustBalance(-premium)) return;
      updateCitizen((c) => ({ ...c, location: { ...(at ?? c.location ?? { x: 0, y: 0 }), placeId: buildingId } }));
    };
    return (
      <Card>
        <MapPin className="w-8 h-8 text-emerald-500 mx-auto" />
        <h1 className="text-xl font-black mt-2">You&apos;re not at {building.name} yet</h1>
        <div className="mt-4 space-y-2">
          <Link href={`/explore?open=${buildingId}`} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-black"><Navigation className="w-4 h-4" /> Plan the journey</Link>
          <button onClick={goDirectly} disabled={(citizen.balance ?? 0) < premium} className="disabled:opacity-50 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold"><Zap className="w-4 h-4" /> Go directly · AED {premium}</button>
          {(citizen.balance ?? 0) < premium && <p className="text-xs text-rose-600 font-bold">You need AED {premium} to skip the trip. Walking is free.</p>}
        </div>
      </Card>
    );
  }

  if (flat === undefined || door.state === "checking") return <Blank spinner />;
  if (flat === null) return <Card><h1 className="text-xl font-black">That home isn&apos;t in this building</h1><Link href={`/explore?open=${buildingId}`} className="mt-4 inline-block px-4 py-2 rounded-xl bg-emerald-500 text-white font-black">See the homes here</Link></Card>;

  if (door.state !== "open") {
    return <DoorStep flat={flat} door={door} setDoor={setDoor} onEnter={load} buildingName={building.name ?? ""} />;
  }

  return (
    <Inside
      flat={flat}
      me={citizen.id}
      canEdit={door.canEdit}
      reason={door.reason}
      furniture={furniture}
      setFurniture={setFurniture}
      look={citizen.look}
      onExit={() => router.push(`/explore?at=${buildingId}`)}
      onChanged={load}
    />
  );
}

// ---------------------------------------------------------------- the door

function DoorStep({ flat, door, setDoor, onEnter, buildingName }: { flat: FlatView; door: Door; setDoor: (d: Door) => void; onEnter: () => void; buildingName: string }) {
  const [error, setError] = useState<string | null>(null);
  const resident = flat.residentName ?? "the resident";

  useEffect(() => {
    if (door.state !== "knocking") return;
    return watchRequest(door.requestId, (status) => {
      if (status === "approved") onEnter();
      else if (status === "denied") setDoor({ state: "denied" });
    });
  }, [door, onEnter, setDoor]);

  const knock = async () => {
    setError(null);
    gameAudio.playClickSound();
    const res = await requestEntry(flat.id);
    if (!res.ok) return setError(res.error);
    if (res.data.status === "approved") onEnter();
    else if (res.data.status === "denied") setDoor({ state: "denied" });
    else {
      setDoor({ state: "knocking", requestId: res.data.id });
      setTimeout(() => askForPush({ icon: "🚪", title: `You knocked on ${resident}'s door`, text: "Turn on notifications to know the moment they let you in, even if you leave this screen." }), 1500);
    }
  };

  const reason = door.state === "closed" ? door.reason : null;
  return (
    <Card>
      <DoorClosed className="w-10 h-10 text-slate-700 mx-auto" />
      <h1 className="text-lg font-black mt-2">{flatTitle(flat)}</h1>
      <p className="text-xs text-slate-500">{buildingName}</p>
      <div className="mt-4 space-y-2">
        {door.state === "knocking" ? (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-sm font-bold flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> You knocked. Waiting for {resident} to answer…
          </div>
        ) : door.state === "denied" ? (
          <p className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-sm font-bold text-rose-700">{resident} isn&apos;t taking visitors right now.</p>
        ) : reason === "friends" ? (
          <p className="p-3 rounded-2xl bg-slate-100 text-sm font-bold">This home is for {resident}&apos;s friends only.</p>
        ) : reason === "invite" ? (
          <p className="p-3 rounded-2xl bg-slate-100 text-sm font-bold">Only guests {resident} has invited can come in.</p>
        ) : reason === "not_listed" ? (
          <p className="p-3 rounded-2xl bg-slate-100 text-sm font-bold">This home is empty and not open for viewings.</p>
        ) : (
          <button onClick={knock} className="w-full py-3 rounded-xl bg-slate-900 text-white font-black">✊ Knock on the door</button>
        )}
        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
        <Link href={`/explore?open=${flat.building_id}`} className="block w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm">Back to the building</Link>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- inside

function Inside({ flat, me, canEdit, reason, furniture, setFurniture, look, onExit, onChanged }: {
  flat: FlatView; me: string; canEdit: boolean; reason: string; furniture: OwnedFurniture[];
  setFurniture: (f: OwnedFurniture[]) => void; look?: import("@/components/avatar/roster").AvatarLookProps; onExit: () => void; onChanged: () => void;
}) {
  const [placing, setPlacing] = useState<PlacingState | null>(null);
  const [decorating, setDecorating] = useState(false);
  const [turns, setTurns] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManager = flat.owner_id === me || flat.tenant_id === me;
  const isOwner = flat.owner_id === me;

  const say = (t: string) => { setToast(t); setTimeout(() => setToast((x) => (x === t ? null : x)), 3000); };

  // Every change to the layout is saved to the flat, so visitors see exactly this.
  const commit = (next: OwnedFurniture[]) => {
    setFurniture(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const res = await saveInterior(flat.id, next);
      if (!res.ok) say(`Couldn't save: ${res.error}`);
    }, 500);
  };

  const buy = (item: CatalogItem) => {
    if (!adjustBalance(-item.price)) return say("⚠️ Not enough AED.");
    gameAudio.playCoinSound();
    const uid = newUid(item.id);
    commit([...furniture, { uid, itemId: item.id, placement: null }]);
    setShopOpen(false);
    setPlacing({ uid, itemId: item.id, rot: 0 });
  };

  const place = (uid: string, placement: Placement | null) => {
    commit(withHomeItems(furniture, housingTier).map((f) => (f.uid === uid ? { ...f, placement } : f)));
    setPlacing(null);
  };

  // The NPC resident is home when you visit them.
  const resident = useMemo<Person[]>(() => {
    const npc = flat.tenant_npc ?? (flat.tenant_id ? null : flat.owner_npc);
    if (!npc || isManager) return [];
    let h = 0;
    for (const c of npc) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const r = ROSTER[h % ROSTER.length];
    return [{ look: { gender: r.gender, preset: r.id }, position: [-1.2, 0, 0.6], rotation: Math.PI / 3, animation: "wave" }];
  }, [flat, isManager]);

  // ------------------------------------------------ other citizens here right now

  const { citizen } = useCitizen();
  const mySpot = spotFor(me);
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const bubble = useCallback((who: string, text: string) => {
    setBubbles((b) => ({ ...b, [who]: text }));
    setTimeout(() => setBubbles((b) => {
      if (b[who] !== text) return b;
      const next = { ...b };
      delete next[who];
      return next;
    }), 6000);
  }, []);
  const room = useRoom(`flat:${flat.id}`, { x: mySpot[0], z: mySpot[2], animation: "idle" }, (e: Received) => {
    if (e.type === "chat") bubble(e.from.userId, e.text);
    if (e.type === "wave") bubble(e.from.userId, "👋");
  });
  const [peerId, setPeerId] = useState<string | null>(null);
  const [startChat, setStartChat] = useState(false);
  const [clock, setClock] = useState(0);
  useEffect(() => {
    if (!peerId) return;
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, [peerId]);
  const peer = room.peers.find((p) => p.userId === peerId);
  const people: Person[] = [
    ...resident,
    ...room.peers.map((p): Person => ({
      look: p.look,
      position: spotFor(p.userId),
      rotation: Math.atan2(-spotFor(p.userId)[0], -spotFor(p.userId)[2]),
      animation: p.animation,
      label: `@${p.username}${room.unread[p.userId] ? ` · 💬${room.unread[p.userId]}` : ""}`,
      bubble: bubbles[p.userId],
      onClick: () => { setStartChat(false); setPeerId(p.userId); },
    })),
  ];

  const placingItem = placing ? getCatalogItem(placing.itemId) : undefined;
  const banner = isManager ? null
    : reason === "viewing" ? "🔑 Viewing — this home is on the market. Look around before you rent or buy."
    : canEdit ? `🛠️ ${flat.residentName ?? "The owner"} lets you redecorate here.`
    : `👋 You're visiting ${flat.residentName ?? "someone"}'s home. Look around — you can't change anything.`;

  // Townhouses, villas and penthouses are two-storey whatever their bedrooms; then it goes by bedrooms.
  const housingTier: HousingTier = housingTierFor(flat.property_type, flat.bedrooms);

  const housingConfig = HOUSING_CONFIGS[housingTier] ?? HOUSING_CONFIGS.studio;
  const levels = housingConfig.levels;
  const [level, setLevel] = useState(0);
  const rooms = levels ? levels[Math.min(level, levels.length - 1)].rooms : housingConfig.rooms;
  const changeLevel = (n: number) => {
    if (!levels || n === level || n < 0 || n >= levels.length) return;
    setPlacing(null);
    setLevel(n);
    setActiveRoomId(n > 0 ? "landing" : "hall");
  };
  const isMultiRoom = !!rooms?.length;
  const [upView, setUpView] = useState(isMultiRoom);
  const [activeRoomId, setActiveRoomId] = useState<string>(housingTier === "one_bedroom" ? "bedroom" : "living");

  useEffect(() => {
    if (isMultiRoom) {
      setUpView(true);
      setActiveRoomId(housingTier === "one_bedroom" ? "bedroom" : "living");
    }
  }, [housingTier, isMultiRoom]);

  return (
    <main className="fixed inset-0 w-screen h-[100dvh] overflow-hidden overscroll-none bg-[#788e6e] text-slate-900 select-none">
      <ApartmentRoom
        loadingLabel={`Opening ${flatTitle(flat)}`}
        look={look}
        furniture={furniture}
        placing={placing}
        decorating={decorating}
        turns={turns}
        people={people}
        housingTier={housingTier}
        upView={upView}
        activeRoomId={activeRoomId}
        onSelectRoom={setActiveRoomId}
        level={level}
        onChangeLevel={changeLevel}
        onPlace={(uid, p) => place(uid, p)}
        onPickUp={(uid) => { const f = withHomeItems(furniture, housingTier).find((x) => x.uid === uid); if (f) setPlacing({ uid, itemId: f.itemId, rot: f.placement?.kind === "floor" ? f.placement.rot : 0 }); }}
        onPlaceBlocked={() => say("🚫 It doesn't fit there.")}
      />

      <header className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 z-30 flex items-center gap-2">
        <button onClick={onExit} className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center" aria-label="Leave"><ArrowLeft className="w-4 h-4" /></button>
        <div className="bg-white rounded-2xl shadow-lg px-3 py-1.5 min-w-0">
          <div className="font-black text-sm truncate">{flatTitle(flat)}</div>
          <div className="text-[11px] text-slate-500 truncate">{flat.property_type} · {flat.size_sqft.toLocaleString()} sq ft{flat.view ? ` · ${flat.view}` : ""}</div>
        </div>
        <div className="flex-1" />
        {isManager && <button onClick={() => setManageOpen(true)} className="h-10 px-3 rounded-full bg-white shadow-lg flex items-center gap-1.5 text-xs font-black"><Settings2 className="w-4 h-4" /> Manage</button>}
        <button onClick={onExit} className="h-10 px-3 rounded-full bg-slate-900 text-white shadow-lg flex items-center gap-1.5 text-xs font-black"><LogOut className="w-3.5 h-3.5" /> Exit</button>
      </header>

      {/* Multi-Room Navigation & Cutaway View Pills */}
      {rooms && rooms.length > 0 && (
        <div className="absolute top-[4.65rem] left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-lg border border-slate-200 overflow-x-auto max-w-[94vw]">
          <button
            onClick={() => setUpView(!upView)}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all ${
              upView ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {upView ? "📐 All Rooms" : "🔍 Room Focus"}
          </button>
          {levels?.map((l, i) => (
            <button
              key={l.label}
              onClick={() => { changeLevel(i); gameAudio.playClickSound(); }}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${level === i ? "bg-amber-400 text-slate-900" : "bg-slate-100 text-slate-700"}`}
            >
              {l.icon} {l.label}
            </button>
          ))}
          <div className="w-[1px] h-3 bg-slate-200" />
          {rooms.map((r) => {
            const isSelected = activeRoomId === r.id;
            return (
              <button
                key={r.id}
                onClick={() => {
                  setActiveRoomId(r.id);
                  gameAudio.playClickSound();
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-black whitespace-nowrap transition-all flex items-center gap-1 ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm scale-105"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {banner && <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-slate-950/85 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl max-w-[92vw] text-center">{banner}</div>}

      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
        <button onClick={() => setTurns((t) => t - 1)} className="w-10 h-10 rounded-full bg-white shadow-lg font-black" aria-label="Rotate room left">⟲</button>
        <button onClick={() => setTurns((t) => t + 1)} className="w-10 h-10 rounded-full bg-white shadow-lg font-black" aria-label="Rotate room right">⟳</button>
      </div>

      {canEdit && !placing && (
        <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 flex gap-2">
          <button onClick={() => setShopOpen(true)} className="h-11 px-4 rounded-full bg-white shadow-xl text-xs font-black flex items-center gap-1.5"><ShoppingBag className="w-4 h-4" /> Buy furniture</button>
          <button onClick={() => setDecorating((d) => !d)} className={`h-11 px-4 rounded-full shadow-xl text-xs font-black ${decorating ? "bg-emerald-500 text-white" : "bg-white"}`}>{decorating ? "Done decorating" : "Decorate"}</button>
        </div>
      )}

      {placing && placingItem && (
        <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 bg-white rounded-2xl shadow-2xl p-3 flex items-center gap-2">
          <span className="text-2xl">{placingItem.icon}</span>
          <span className="text-xs font-bold">{placingItem.kind === "wall" ? "Tap a wall" : "Tap the floor"} to place</span>
          {placingItem.kind !== "wall" && <button onClick={() => setPlacing({ ...placing, rot: (((placing.rot + 1) % 4) as Rotation) })} className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-black">Rotate</button>}
          <button onClick={() => place(placing.uid, null)} className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold">Store</button>
          <button onClick={() => setPlacing(null)} className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold">Cancel</button>
        </div>
      )}

      {shopOpen && (
        <Modal title="Furniture for this home" onClose={() => setShopOpen(false)}>
          {withHomeItems(furniture, housingTier).filter((f) => !f.placement).map((f) => {
            const item = getCatalogItem(f.itemId);
            return item ? (
              <div key={f.uid} className="flex items-center gap-3 p-2.5 rounded-2xl bg-amber-50 border border-amber-100">
                <span className="text-2xl">{item.icon}</span><span className="flex-1 text-sm font-black">{item.name} <span className="text-[11px] text-slate-500">(in storage)</span></span>
                <button onClick={() => { setShopOpen(false); setPlacing({ uid: f.uid, itemId: f.itemId, rot: 0 }); }} className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-black">Place</button>
              </div>
            ) : null;
          })}
          {CATALOG.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1"><div className="text-sm font-black">{item.name}</div><div className="text-xs font-mono font-black text-emerald-600">AED {item.price.toLocaleString()}</div></div>
              <button onClick={() => buy(item)} className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-black">Buy</button>
            </div>
          ))}
        </Modal>
      )}

      {manageOpen && <Manage flat={flat} isOwner={isOwner} onClose={() => setManageOpen(false)} onChanged={onChanged} say={say} />}

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
          onClose={() => setPeerId(null)}
          onChat={(text) => room.say(peer.userId, text, flatTitle(flat))}
          onSendMoney={async (amount) => {
            const error = await sendMoney(peer, amount, flatTitle(flat));
            if (!error) { room.emit({ type: "money", amount }, peer.userId); gameAudio.playCoinSound(); say(`💸 Sent AED ${amount.toLocaleString()} to @${peer.username}`); }
            return error;
          }}
          onWave={() => { room.emit({ type: "wave" }, peer.userId); say(`👋 You waved at @${peer.username}`); setPeerId(null); }}
          onInvite={() => {}}
          onFriend={async () => {
            const r = await befriend(me, peer);
            if (r === "sent") room.emit({ type: "friend" }, peer.userId);
            return r === "friends" ? `You and @${peer.username} are now friends 🤝` : r === "sent" ? "Friend request sent" : r === "blocked" ? "You can't add them." : "Couldn't send the request — try again.";
          }}
        />
      )}
      <SocialFeed
        events={room.events}
        readingWith={peerId}
        onAccept={() => {}}
        onReply={(e) => { setStartChat(true); setPeerId(e.from.userId); }}
        onFriend={async (e) => { const r = await befriend(me, e.from); say(r === "friends" ? `🤝 You and @${e.from.username} are now friends` : "Couldn't add them — try again."); }}
      />
      {room.peers.length > 0 && !peer && (
        <div className="absolute left-3 bottom-20 z-30 bg-sky-500/90 text-white rounded-full px-3 py-1 text-[11px] font-black shadow-lg pointer-events-none">
          👥 {room.peers.length} {room.peers.length === 1 ? "person" : "people"} here · tap them to say hi
        </div>
      )}

      {toast && <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 bg-slate-950/90 text-white text-sm font-bold px-4 py-2 rounded-full shadow-2xl">{toast}</div>}
    </main>
  );
}

/** Where a citizen stands while in someone's home: a spot picked from their id, the same for everyone. */
const SPOTS: Array<[number, number, number]> = [[1.0, 0, 1.0], [0.2, 0, 1.6], [1.6, 0, 0.2], [-0.4, 0, 1.8], [1.8, 0, 1.4], [-1.6, 0, 1.6]];
function spotFor(userId: string): [number, number, number] {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return SPOTS[Math.abs(h) % SPOTS.length];
}

// ---------------------------------------------------------------- owner tools

function Manage({ flat, isOwner, onClose, onChanged, say }: { flat: FlatView; isOwner: boolean; onClose: () => void; onChanged: () => void; say: (t: string) => void }) {
  const [access, setAccessState] = useState<Access>(flat.access);
  const [guests, setGuests] = useState<Awaited<ReturnType<typeof listGuests>>>([]);
  const [username, setUsername] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [listing, setListing] = useState<Listing>(flat.listing);
  const [rent, setRent] = useState(String(flat.rent_price ?? ""));
  const [sale, setSale] = useState(String(flat.sale_price ?? ""));
  const [busy, setBusy] = useState(false);

  const refreshGuests = useCallback(() => { listGuests(flat.id).then(setGuests); }, [flat.id]);
  useEffect(refreshGuests, [refreshGuests]);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return say(`⚠️ ${(res as { error: string }).error}`);
    say(okMsg);
    onChanged();
  };

  return (
    <Modal title="Manage your home" onClose={onClose}>
      <section className="space-y-1.5">
        <h4 className="text-xs font-black uppercase text-slate-400">Who can come in</h4>
        {(Object.keys(ACCESS_LABEL) as Access[]).map((a) => (
          <label key={a} className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm font-bold cursor-pointer ${access === a ? "border-emerald-400 bg-emerald-50" : "border-slate-200"}`}>
            <input type="radio" name="access" checked={access === a} onChange={() => { setAccessState(a); void run(() => setAccess(flat.id, a), "Access updated."); }} />
            {ACCESS_LABEL[a]}
          </label>
        ))}
      </section>

      <section className="space-y-1.5 pt-2">
        <h4 className="text-xs font-black uppercase text-slate-400">Guests</h4>
        <p className="text-[11px] text-slate-500">Invited guests can always come in. Give someone “can edit” to let them redecorate.</p>
        {guests.map((g) => (
          <div key={g.user_id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 font-bold">@{g.profiles?.username ?? "?"} {g.can_edit && <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 rounded">can edit</span>}</span>
            <button onClick={async () => { await removeGuest(flat.id, g.user_id); refreshGuests(); }} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center" aria-label="Remove guest"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <div className="flex gap-1.5">
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" className="flex-1 h-9 px-3 rounded-xl bg-slate-100 text-sm font-bold outline-none" />
          <label className="flex items-center gap-1 text-[11px] font-bold"><input type="checkbox" checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} /> can edit</label>
          <button disabled={!username.trim() || busy} onClick={() => run(async () => { const r = await addGuest(flat.id, username, canEdit); if (r.ok) { setUsername(""); refreshGuests(); } return r; }, "Guest added.")} className="h-9 px-3 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center gap-1 disabled:opacity-50"><UserPlus className="w-3.5 h-3.5" /> Add</button>
        </div>
      </section>

      {isOwner && (
        <section className="space-y-1.5 pt-2">
          <h4 className="text-xs font-black uppercase text-slate-400">Put it on the market</h4>
          <select value={listing} onChange={(e) => setListing(e.target.value as Listing)} className="w-full h-9 rounded-xl border border-slate-200 px-2 text-sm font-bold">
            <option value="none">Not listed</option>
            <option value="rent">For rent</option>
            <option value="sale">For sale</option>
            <option value="rent_or_sale">For rent or sale</option>
          </select>
          {(listing === "rent" || listing === "rent_or_sale") && <input inputMode="numeric" value={rent} onChange={(e) => setRent(e.target.value.replace(/\D/g, ""))} placeholder="Monthly rent (virtual AED)" className="w-full h-9 px-3 rounded-xl bg-slate-100 text-sm font-bold outline-none" />}
          {(listing === "sale" || listing === "rent_or_sale") && <input inputMode="numeric" value={sale} onChange={(e) => setSale(e.target.value.replace(/\D/g, ""))} placeholder="Sale price (virtual AED)" className="w-full h-9 px-3 rounded-xl bg-slate-100 text-sm font-bold outline-none" />}
          <button disabled={busy} onClick={() => run(() => listFlat(flat.id, listing, rent ? +rent : null, sale ? +sale : null), listing === "none" ? "Taken off the market." : "Listing updated.")} className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-black disabled:opacity-50">Save listing</button>
        </section>
      )}
      {!isOwner && <p className="text-[11px] text-slate-500 pt-2 flex items-center gap-1"><KeyRound className="w-3 h-3" /> You rent this home{flat.tenant_until ? ` until ${new Date(flat.tenant_until).toLocaleDateString()}` : ""}. Only the owner can list it.</p>}
    </Modal>
  );
}

// ---------------------------------------------------------------- bits

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center p-4 pb-2"><h3 className="flex-1 font-black">{title}</h3><button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button></div>
        <div className="overflow-y-auto px-4 pb-4 space-y-2">{children}</div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 bg-gradient-to-b from-slate-800 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center">{children}</div>
    </main>
  );
}

function Blank({ spinner }: { spinner?: boolean }) {
  return <SmallLoader label={spinner ? "Walking up to the door…" : "Getting you there…"} />;
}
