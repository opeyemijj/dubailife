import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { LegalPage, OPERATOR, SUPPORT_EMAIL, type Section } from "@/components/legal/LegalPage";

// For investors: what Dubai Life is, what's built, how it grows and makes money, and live numbers straight from the
// database (public.public_metrics: real accounts only, refreshed hourly; never the game's padded "online" figure).

const TITLE = "Investors";
const DESCRIPTION = "Dubai Life: a 3D social life game set in Dubai, played in the browser. What's built, how it grows, how it makes money, and live numbers.";
export const metadata: Metadata = { title: { absolute: `${TITLE} - Dubai Life` }, description: DESCRIPTION, alternates: { canonical: "/investors" } };
export const revalidate = 3600;

interface Metrics {
  asOf: string; citizens: number; active1: number; active7: number; active30: number; signups7: number; signups30: number;
  firstSignup: string | null; parties: number; gamesPlayed: number; messages: number; friendships: number;
  homesOwned: number; carsOwned: number; races: number; hotelStays: number; timeZones: number;
}

async function metrics(): Promise<Metrics | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data } = await db.rpc("public_metrics");
    return (data as Metrics | null) ?? null;
  } catch { return null; }
}

const n = (v: number) => v.toLocaleString("en-US");
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dubai" });

const sections: Section[] = [
  {
    id: "what", title: "What Dubai Life is",
    body: (
      <>
        <p>A 3D multiplayer life game set in a virtual Dubai, played instantly in any phone or computer browser, with no download. Players build a life: a home they furnish and throw parties in, a job and a business, cars, relationships and a family, and a social circle of real people.</p>
        <p>It&apos;s social first: everything worth doing is better with other players, and the game is built to bring people together and bring them back.</p>
      </>
    ),
  },
  {
    id: "built", title: "What's built",
    body: (
      <ul>
        <li><strong>A living city:</strong> nearly 500 places to visit, homes from bed spaces to Palm villas, the Metro, taxis and driving with a licence.</li>
        <li><strong>3D homes and parties:</strong> furnish and decorate, host house and pool parties with music, games and a voice Space.</li>
        <li><strong>Live voice Spaces</strong> and 1-on-1 calls, chat, friends and follows.</li>
        <li><strong>Multiplayer games:</strong> Ludo, chess, 3D pool, boxing and more; races at Dubai Autodrome with entry fees and prize pots.</li>
        <li><strong>Life simulation:</strong> needs, jobs, ventures, education, visas, dating, marriage and children.</li>
        <li><strong>Growth loops:</strong> a City Feed of what players do, Top users and Richest lists, rewards for hosting and bringing friends, WhatsApp invites, lifecycle and &ldquo;while you were away&rdquo; emails, push notifications.</li>
        <li><strong>Luxury hotel stays</strong> in 3D suites, and a monthly skill tournament with a real prize.</li>
      </ul>
    ),
  },
  {
    id: "money", title: "How it makes money",
    body: (
      <ul>
        <li><strong>Virtual currency:</strong> players can top up virtual AED to move faster (the payment step is being switched on).</li>
        <li><strong>Venues and brands:</strong> paid venue subscriptions and advertising on the city&apos;s billboards (live, with first customers).</li>
        <li><strong>Memberships and season passes:</strong> built into the game, launching with payments.</li>
        <li><strong>Events:</strong> branded parties, races and hotel experiences inside the city.</li>
      </ul>
    ),
  },
  {
    id: "why", title: "Why it grows",
    body: <p>Dubai is an aspiration for millions of young people across Africa, the Middle East and South Asia. Dubai Life lets them live it with their friends, in a browser on any phone, with WhatsApp-first invites. Every party, race and Space is a reason to bring a friend, and every friend makes the game better for the next one.</p>,
  },
  {
    id: "team", title: "Team",
    body: <p>Dubai Life is founded and built by <a href="https://www.linkedin.com/in/opeyemijj/" target="_blank" rel="noopener noreferrer">Opeyemi Ishola (Brain)</a>, based in Dubai.</p>,
  },
  {
    id: "contact", title: "Get in touch",
    body: <p>For investment conversations, a deck or a demo, email <a href={`mailto:${SUPPORT_EMAIL}?subject=Investors`}>{SUPPORT_EMAIL}</a> with &ldquo;Investors&rdquo; in the subject. See also <Link href="/about">About</Link> and <Link href="/contact">Contact</Link>.</p>,
  },
];

export default async function InvestorsPage() {
  const m = await metrics();
  const cards: Array<[string, string, string?]> = m ? [
    ["Citizens", n(m.citizens), m.firstSignup ? `since ${day(m.firstSignup)}` : undefined],
    ["Active in the last 7 days", n(m.active7), m.citizens ? `${Math.round((m.active7 / m.citizens) * 100)}% of all citizens` : undefined],
    ["Active in the last 30 days", n(m.active30)],
    ["Active today", n(m.active1)],
    ["New citizens, last 7 days", n(m.signups7)],
    ["New citizens, last 30 days", n(m.signups30)],
    ["Parties hosted", n(m.parties)],
    ["Games played", n(m.gamesPlayed)],
    ["Messages sent", n(m.messages)],
    ["Friendships", n(m.friendships)],
    ["Cars owned", n(m.carsOwned)],
    ["Races run", n(m.races)],
  ] : [];
  return (
    <LegalPage title={TITLE} kicker={`Company · ${OPERATOR}`} sections={sections}
      intro={<p>Dubai Life is a 3D social life game set in Dubai, played in the browser. It launched in October 2026 and is growing through its players&apos; friends.</p>}
      top={<section className="space-y-3">
        <h2 className="text-xl font-black text-white">Live numbers</h2>
        {m ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {cards.map(([k, v, note]) => (
                <div key={k} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-2xl font-black text-white tabular-nums">{v}</p>
                  <p className="text-xs font-bold text-slate-400">{k}</p>
                  {note && <p className="text-[11px] text-slate-500 mt-0.5">{note}</p>}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">Real accounts only, straight from the game&apos;s database, as of {new Date(m.asOf).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} Dubai time (refreshed hourly). The game&apos;s hosts (Locals) are not accounts and are never counted.</p>
          </>
        ) : <p className="text-sm text-slate-400">Live numbers are unavailable right now. Email us for the latest.</p>}
      </section>} />
  );
}
