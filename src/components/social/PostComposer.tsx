"use client";

// Posting to the City: a snap from the game (or one taken earlier this session), a caption (@mention people, #tags),
// and where it was taken. Photos only come from the game, never from the phone's camera roll.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, X } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { recentSnaps, type Snap } from "@/lib/snap";
import { createPost, SOCIAL_RULES, uploadSnap } from "@/lib/social";
import { gameAudio } from "@/utils/gameAudio";

export function PostComposer({ snap: first, onClose, onPosted }: { snap: Snap | null; onClose: () => void; onPosted?: (id: number) => void }) {
  const { citizen } = useCitizen();
  const router = useRouter();
  const [snap, setSnap] = useState<Snap | null>(first);
  const [text, setText] = useState("");
  const [withPlace, setWithPlace] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const snaps = recentSnaps();
  const placeName = snap?.placeName ?? null;

  const post = async () => {
    if (!citizen?.id || busy) return;
    if (!snap && !text.trim()) { setError("Write something or add a snap."); return; }
    setBusy(true); setError(null);
    let path: string | null = null;
    if (snap) {
      const up = await uploadSnap(citizen.id, snap.blob);
      if (up.error || !up.path) { setBusy(false); setError(up.error ?? "Couldn't upload the snap."); return; }
      path = up.path;
    }
    const r = await createPost(text, path, withPlace ? snap?.place ?? null : null, withPlace ? placeName : null);
    setBusy(false);
    if (r.error || !r.data) { setError(r.error ?? "Couldn't post."); return; }
    gameAudio.playConfirmSound();
    onPosted?.(r.data);
    onClose();
    if (!onPosted) router.push(`/city?tab=posts&post=${r.data}`);
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="New post">
      <div className="absolute inset-0 bg-slate-950/70" onClick={onClose} aria-hidden />
      <div className="relative w-full sm:max-w-md bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3 max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-lg font-black">New post</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        {snap ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={snap.url} alt="Your snap" className="w-full rounded-2xl object-cover max-h-[46dvh] bg-slate-200" />
            <button onClick={() => setSnap(null)} className="absolute top-2 right-2 h-8 px-3 rounded-full bg-slate-950/70 text-white text-xs font-black">Remove</button>
          </div>
        ) : snaps.length > 0 ? (
          <div>
            <p className="text-xs font-black text-slate-500 mb-1">Your snaps</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {snaps.map((s) => (
                // eslint-disable-next-line @next/next/no-img-element
                <button key={s.url} onClick={() => setSnap(s)} className="shrink-0"><img src={s.url} alt="" className="w-24 h-24 rounded-xl object-cover bg-slate-200" /></button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 rounded-2xl bg-slate-50 p-3">Tip: tap 📸 anywhere in the game (a venue, your home, a race, the yacht) to snap a photo for your post.</p>
        )}
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, SOCIAL_RULES.postMax))} rows={3} autoFocus
          placeholder="What's happening? Mention people with @username, add #tags"
          className="w-full rounded-2xl bg-slate-50 border border-slate-200 p-3 text-base outline-none focus:border-fuchsia-400 resize-none" />
        <div className="flex items-center gap-2">
          {placeName && (
            <button onClick={() => setWithPlace(!withPlace)} aria-pressed={withPlace}
              className={`h-9 px-3 rounded-full text-xs font-black flex items-center gap-1 ${withPlace ? "bg-fuchsia-100 text-fuchsia-700" : "bg-slate-100 text-slate-400 line-through"}`}>
              <MapPin className="w-3.5 h-3.5" /> {placeName}
            </button>
          )}
          <span className="ml-auto text-[11px] text-slate-400">{text.length}/{SOCIAL_RULES.postMax}</span>
        </div>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button onClick={() => void post()} disabled={busy} className="w-full h-12 rounded-2xl bg-fuchsia-600 text-white font-black disabled:opacity-60">{busy ? "Posting…" : "Post to the City"}</button>
        <p className="text-[11px] text-slate-400 text-center">Everyone in the City can see it. No links or phone numbers.</p>
      </div>
    </div>
  );
}
