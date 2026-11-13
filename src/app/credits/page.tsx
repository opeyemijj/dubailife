import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Who made what: the game's own work, and every piece of art, sound, font and code from someone else with its
// licence. Kept in step with public/models/CREDITS.md and public/audio/CREDITS.md.

const TITLE = "Credits";
const DESCRIPTION = "Credits for Dubai Life: the 3D models, animations, music, sound effects, fonts and open-source software the game is built with, and their licences.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} - Dubai Life` },
  description: DESCRIPTION,
  alternates: { canonical: "/credits" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/credits" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

const CC0 = { name: "CC0 1.0 (public domain)", url: "https://creativecommons.org/publicdomain/zero/1.0/" };
const CCBY3 = { name: "CC BY 3.0", url: "https://creativecommons.org/licenses/by/3.0/" };
const MIT = { name: "MIT License", url: "https://opensource.org/license/mit" };
const OFL = { name: "SIL Open Font License 1.1", url: "https://openfontlicense.org" };
const UNSPLASH = { name: "Unsplash License", url: "https://unsplash.com/license" };

type Licence = { name: string; url: string };
interface Item { what: string; by: string; source?: string; licence: Licence; note?: string }

const SECTIONS: Array<{ icon: string; title: string; intro?: string; items: Item[] }> = [
  {
    icon: "🧍",
    title: "Citizens and animations",
    items: [
      { what: "Citizen models, outfits and animation clips", by: "Microsoft Rocketbox (Copyright © 2020 Microsoft)", source: "https://github.com/microsoft/Microsoft-Rocketbox", licence: MIT, note: "Converted to glTF, textures downscaled and meshes compressed for the web." },
      { what: "Selfie avatars", by: "Avaturn", source: "https://avaturn.me", licence: { name: "Avaturn terms", url: "https://avaturn.me" }, note: "Made by the player through Avaturn's embed and kept in their own browser; no Avaturn files ship with the game." },
    ],
  },
  {
    icon: "🛋️",
    title: "Furniture and props",
    items: [
      { what: "Couch, L couch, TV, round rug, houseplant, double bed, fridge, chair, counters, shelves, tables, bench, dining chair", by: "Quaternius", source: "https://poly.pizza", licence: CC0 },
      { what: "Lounge chair, rug, glass coffee table, floor lamp, bookcase, desk, desk chair, side table, bar stools, coffee machine, kitchen bar, coat rack, laptop, screen, speaker, frappe, tea cup, television", by: "Kenney", source: "https://kenney.nl", licence: CC0 },
    ],
  },
  {
    icon: "🚗",
    title: "Cars",
    items: [
      { what: "Sedan, compact, sports sedan and SUV", by: "Quaternius", source: "https://poly.pizza", licence: CC0, note: "Repainted per car in the game." },
      { what: "Supercar (\"Car\")", by: "Quaternius", source: "https://poly.pizza/m/HQ0hvRM2XR", licence: CCBY3, note: "Repainted per car in the game." },
    ],
  },
  {
    icon: "🎵",
    title: "Music and sound",
    intro: "Most sounds in the game (punches, the lift, games, the metro, races) are made in code by Dubai Life. These come from others:",
    items: [
      { what: "\"Lofi Hip Hop Loop\"", by: "omfgdude (OMF-Games)", source: "https://opengameart.org/content/lofi-hip-hop-loop", licence: CC0 },
      { what: "\"Chill (Loopable)\"", by: "Pro Sensory (Alex McCulloch)", source: "https://opengameart.org/content/chill-loopable", licence: CC0 },
      { what: "Click and confirm sounds (\"Interface Sounds\")", by: "Kenney", source: "https://opengameart.org/content/interface-sounds", licence: CC0 },
      { what: "Coin sound (\"RPG Sound Pack\")", by: "artisticdude", source: "https://opengameart.org/content/rpg-sound-pack", licence: CC0 },
    ],
  },
  {
    icon: "🖼️",
    title: "Photos and fonts",
    items: [
      { what: "Sample photos on some billboards, courses and profiles", by: "Photographers on Unsplash", source: "https://unsplash.com", licence: UNSPLASH },
      { what: "Fredoka typeface", by: "Milena Brandão and Hafontia", source: "https://fonts.google.com/specimen/Fredoka", licence: OFL },
      { what: "Icons", by: "Lucide contributors", source: "https://lucide.dev", licence: { name: "ISC License", url: "https://lucide.dev/license" } },
    ],
  },
  {
    icon: "🧩",
    title: "Open-source software",
    items: [
      { what: "Next.js and React", by: "Vercel and Meta", source: "https://nextjs.org", licence: MIT },
      { what: "three.js", by: "three.js authors", source: "https://threejs.org", licence: MIT },
      { what: "React Three Fiber, Drei and Rapier bindings", by: "Poimandres (pmndrs)", source: "https://github.com/pmndrs", licence: MIT },
      { what: "Rapier physics", by: "Dimforge", source: "https://rapier.rs", licence: { name: "Apache License 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" } },
      { what: "chess.js", by: "Jeff Hlywa", source: "https://github.com/jhlywa/chess.js", licence: { name: "BSD 2-Clause", url: "https://opensource.org/license/bsd-2-clause" } },
      { what: "Tailwind CSS", by: "Tailwind Labs", source: "https://tailwindcss.com", licence: MIT },
      { what: "Supabase client libraries", by: "Supabase", source: "https://supabase.com", licence: MIT },
    ],
  },
];

export default function CreditsPage() {
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 sm:px-6 py-3.5">
          <Link href="/about" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>About</span>
          </Link>
          <Link href="/" className="text-xs font-extrabold text-emerald-400 hover:text-emerald-300 transition-colors">Enter Dubai Life →</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        <div className="space-y-3 border-b border-slate-800 pb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Credits</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Dubai Life is designed and built by Opeyemi Ishola. The city, buildings, homes, venues, games, game logic,
            interface and in-code sound effects are original work made for the game. Thank you to the artists and
            developers below, whose work we use under the licences shown.
          </p>
        </div>

        {SECTIONS.map((s) => (
          <section key={s.title} className="space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2"><span aria-hidden>{s.icon}</span>{s.title}</h2>
            {s.intro && <p className="text-sm text-slate-400">{s.intro}</p>}
            <ul className="space-y-3">
              {s.items.map((it) => (
                <li key={it.what} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
                  <p className="font-bold text-slate-100">{it.what}</p>
                  <p className="text-sm text-slate-400">
                    by {it.source ? <a href={it.source} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">{it.by}</a> : it.by}
                    {" · "}
                    <a href={it.licence.url} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:underline">{it.licence.name}</a>
                  </p>
                  {it.note && <p className="text-xs text-slate-500">{it.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="text-xs text-slate-500 border-t border-slate-800 pt-6">
          Dubai Life is a fan-made virtual city inspired by the real Dubai and isn&apos;t affiliated with or endorsed by
          the government of Dubai or any place, business or brand named in the game. Spotted something that should be
          credited? Tell us through <Link href="/feedback" className="text-emerald-400 hover:underline">Feedback</Link>.
        </p>
      </main>
    </div>
  );
}
