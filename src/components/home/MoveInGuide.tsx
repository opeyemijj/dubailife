"use client";

// A new player's first action is making their home theirs: buy something, move things around or hire a decorator.
// This stays up at home until they've done one (their goals wait for it), and the map points back here.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNewCitizen, useCitizen } from "@/lib/citizenStore";

export function MoveInGuide({ name, decorated, hired, onShop, onMove, onDecorator, onDone }: {
  name: string; decorated: boolean; hired: boolean; onShop: () => void; onMove: () => void; onDecorator: () => void; onDone: () => void;
}) {
  return (
    <div className="fixed inset-x-3 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] z-[60] flex justify-center animate-[sheetUp_0.3s_ease-out]" role="dialog" aria-label="Decorate your home">
      <div className="w-full max-w-md rounded-[26px] bg-white text-slate-900 p-4 shadow-2xl space-y-2.5">
        {decorated ? (
          <>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-700">✨ Looking good</p>
            <p className="font-black text-lg leading-tight">{hired ? "Your decorator has the key." : "It's starting to feel like home."}</p>
            <p className="text-sm text-slate-600">{hired ? "You'll hear when they've finished." : "Keep going as long as you like."} Now let&apos;s get busy in Dubai!</p>
            <button onClick={onDone} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black">🎯 Set my goals</button>
            {!hired && (
              <div className="flex gap-2">
                <button onClick={onShop} className="flex-1 h-10 rounded-2xl bg-slate-100 font-bold text-sm text-slate-700">🛋️ Buy more</button>
                <button onClick={onMove} className="flex-1 h-10 rounded-2xl bg-slate-100 font-bold text-sm text-slate-700">↔️ Move things</button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-700">🔑 You&apos;re home{name ? `, @${name}` : ""}</p>
            <p className="font-black text-lg leading-tight">First, make this place yours</p>
            <p className="text-sm text-slate-600">You have AED 50,000 and a 30-day visit visa. Start by decorating your home:</p>
            <button onClick={onShop} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black">🛋️ Buy furniture</button>
            <div className="flex gap-2">
              <button onClick={onMove} className="flex-1 h-11 rounded-2xl bg-emerald-50 font-black text-sm text-emerald-800">↔️ Move things</button>
              <button onClick={onDecorator} className="flex-1 h-11 rounded-2xl bg-emerald-50 font-black text-sm text-emerald-800">🧑‍🎨 Hire a decorator</button>
            </div>
            <button onClick={onDone} className="w-full h-10 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50">I&apos;m fine with my house as it is</button>
          </>
        )}
      </div>
    </div>
  );
}

/** On the map before they've decorated: back home to do it. */
export function DecorFirstNudge() {
  const { citizen } = useCitizen();
  const path = usePathname() ?? "";
  if (!citizen?.decorFirst || !isNewCitizen(citizen) || !path.startsWith("/explore")) return null;
  return (
    <Link href="/home" className="fixed left-1/2 -translate-x-1/2 top-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] z-[45] rounded-full bg-emerald-600 text-white shadow-lg px-4 py-2 text-xs font-black whitespace-nowrap">
      🛋️ Decorate your home first ›
    </Link>
  );
}
