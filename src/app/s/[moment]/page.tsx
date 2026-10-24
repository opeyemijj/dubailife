import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isMoment, momentText } from "@/lib/share/moments";

// A shared moment (design spec 19.3): the card, and a way in for whoever opened the link. The sharer's
// username doubles as their invite code (?r=).

type Props = { params: Promise<{ moment: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function read({ params, searchParams }: Props) {
  const { moment } = await params;
  if (!isMoment(moment)) return null;
  const sp = await searchParams;
  const q = { u: one(sp.u), v: one(sp.v), l: one(sp.l) };
  const image = `/api/share-image?${new URLSearchParams({ m: moment, ...q })}`;
  return { moment, q, image, t: momentText(moment, q) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const r = await read(props);
  if (!r) return { title: "Dubai Life", robots: { index: false } };
  const title = `${r.t.title} · Dubai Life`;
  return {
    title, description: r.t.sub, robots: { index: false },
    openGraph: { title, description: r.t.sub, images: [{ url: r.image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description: r.t.sub, images: [r.image] },
  };
}

export default async function SharePage(props: Props) {
  const r = await read(props);
  if (!r) notFound();
  const join = r.t.user ? `/?signup=true&ref=${r.t.user}` : "/?signup=true";
  return (
    <main className="min-h-[100dvh] bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={r.image} alt={r.t.title} className="w-full rounded-3xl shadow-2xl" />
        <h1 className="text-2xl font-black">{r.t.title}</h1>
        <p className="text-slate-300">{r.t.sub}</p>
        <Link href={join} className="block h-14 leading-[3.5rem] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-lg transition-all active:scale-98">Start your Dubai life, free</Link>
        <div className="flex flex-col gap-2 pt-1">
          <Link href="/explore" className="block text-sm font-bold text-slate-300 hover:text-white transition-colors">🗺️ Explore Dubai City Map →</Link>
          <Link href="/scam-check" className="block text-sm font-bold text-sky-300 hover:text-sky-200 transition-colors">Would you spot a scam? Take the 30-second check →</Link>
        </div>
        <p className="text-[11px] text-slate-500">Dubai Life is a free life simulation game for players aged 21+.</p>
      </div>
    </main>
  );
}
