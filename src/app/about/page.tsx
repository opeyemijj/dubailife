import type { Metadata } from "next";
import Link from "next/link";
import { PLACES } from "@/lib/city/places";
import { GAMES } from "@/lib/games/registry";
import { SITE } from "@/lib/site";
import { MIN_AGE } from "@/lib/age";

// What Dubai Life is, in plain words: the public page that explains the app to new visitors and to search
// engines (the home page itself is a canvas map).

const TITLE = "What is Dubai Life? Live your Dubai story online";
const DESCRIPTION =
  "Dubai Life is a free online life simulation set in Dubai. Rent a flat, get a job, ride the Metro, shop at Dubai Mall, play games and make real friends — in your browser.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} - Dubai Life` },
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/about" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

const venueCount = PLACES.reduce((n, p) => n + p.venues.filter((v) => !v.comingSoon).length, 0);
const landmarks = PLACES.filter((p) => p.kind !== "residential" && p.kind !== "home").slice(0, 12);

const FEATURES: Array<[string, string, string]> = [
  ["🏙️", "A whole city to walk around", `Downtown, Dubai Marina, the Palm and more, with ${venueCount.toLocaleString()} shops, restaurants, clubs, beaches and attractions you can go into.`],
  ["🚇", "Get around like a resident", "Walk, hail a Dubai taxi with a running meter, or ride the Red Line metro with station announcements in English and Arabic."],
  ["🏠", "A home that's yours", "Start in a shared bed space or a studio and work up to a Marina flat, a townhouse, a Downtown penthouse or a villa on the Palm. Furnish and decorate every room."],
  ["💼", "Work, study and earn", "Take jobs, study at Academic City, pass your driving test, start a business and keep an eye on rent, visa days and your AED wallet."],
  ["🎲", `${GAMES.length} games to play with friends`, `${GAMES.slice(0, 6).map((g) => g.name).join(", ")} and more — against real players or the computer.`],
  ["👋", "Real people", "Everyone you meet with a username is another player. Chat, add friends, knock on doors and send AED. Locals (our hosts) are always labelled Local."],
];

const FAQ: Array<[string, string]> = [
  ["Is Dubai Life free?", "Yes. Dubai Life is free to play in any modern browser on phone, tablet or computer. You can also add it to your home screen like an app."],
  ["Do I need to download anything?", `No. Open ${SITE.domain} and play. On iPhone or Android you can install it from the browser for a full-screen app with notifications.`],
  ["Is it the real Dubai?", "It's a virtual Dubai drawn from the real city: real neighbourhoods, landmarks, metro stations and the kinds of places people go. Prices are in AED and life runs on Dubai time."],
  ["Who can play?", `Anyone aged ${MIN_AGE} or over. You make an avatar, choose your first home and budget, and start your Dubai life straight away.`],
  ["Can I play with friends?", "Yes. Invite friends with your link, meet in the city, visit each other's homes and play Ludo, Chess, Pool and the other games together."],
];

// Who built Dubai Life, and how to reach them.
const DEVELOPER: Array<{ label: string; handle: string; href: string; icon: string }> = [
  { label: "LinkedIn", handle: "in/opeyemijj", href: "https://www.linkedin.com/in/opeyemijj/", icon: "💼" },
  { label: "Instagram", handle: "@brainofficial_", href: "https://www.instagram.com/brainofficial_/", icon: "📸" },
  { label: "WhatsApp", handle: "+971 58 549 0044", href: "https://wa.me/971585490044", icon: "💬" },
];

const STRUCTURED = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": `${SITE.url}/about#page`,
      url: `${SITE.url}/about`,
      name: TITLE,
      description: DESCRIPTION,
      isPartOf: { "@id": `${SITE.url}/#website` },
      about: { "@id": `${SITE.url}/#app` },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Dubai Life", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "About", item: `${SITE.url}/about` },
      ],
    },
  ],
};

export default function AboutPage() {
  return (
    <main className="min-h-[100dvh] bg-slate-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED) }} />
      <div className="max-w-2xl mx-auto px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-16 space-y-10">
        <nav className="text-xs font-bold text-slate-400" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white">Dubai Life</Link> <span aria-hidden>›</span> About
        </nav>

        <header className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">Dubai Life — live your Dubai story online</h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Dubai Life is a free online life simulation set in Dubai. Move to the city, find a home, get a job, ride the
            Metro, shop at Dubai Mall and make real friends — all in your browser at {SITE.domain}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/?signup=true" className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black">Start your Dubai life · free</Link>
            <Link href="/explore" className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 font-bold">Explore the map</Link>
          </div>
        </header>

        <section aria-labelledby="what" className="space-y-3">
          <h2 id="what" className="text-xl font-black">What you can do in Dubai Life</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {FEATURES.map(([icon, title, text]) => (
              <li key={title} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <h3 className="font-black"><span aria-hidden>{icon}</span> {title}</h3>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="places" className="space-y-3">
          <h2 id="places" className="text-xl font-black">Places in Dubai Life</h2>
          <ul className="flex flex-wrap gap-2">
            {landmarks.map((p) => (
              <li key={p.id}><Link href={`/place/${p.id}`} className="inline-block px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10">{p.name}</Link></li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="games" className="space-y-3">
          <h2 id="games" className="text-xl font-black">Games you can play</h2>
          <ul className="flex flex-wrap gap-2">
            {GAMES.map((g) => (
              <li key={g.id}><Link href={`/games/${g.id}`} className="inline-block px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10">{g.icon} {g.name}</Link></li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq" className="space-y-3">
          <h2 id="faq" className="text-xl font-black">Questions</h2>
          <div className="space-y-2">
            {FAQ.map(([q, a]) => (
              <details key={q} className="rounded-2xl bg-white/5 border border-white/10 p-4 open:bg-white/10" open>
                <summary className="font-black cursor-pointer">{q}</summary>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="developer" className="space-y-3">
          <h2 id="developer" className="text-xl font-black">Meet the developer</h2>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
            <p className="text-sm text-slate-300 leading-relaxed">
              Dubai Life is designed and built by an independent developer in Dubai. Questions, ideas or partnerships? Get in touch.
            </p>
            <ul className="grid sm:grid-cols-3 gap-2">
              {DEVELOPER.map((d) => (
                <li key={d.label}>
                  <a href={d.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2.5">
                    <span className="text-xl" aria-hidden>{d.icon}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black">{d.label}</span>
                      <span className="block text-xs text-slate-400 truncate">{d.handle}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-6">
          <span>Follow Dubai Life:</span>
          {SITE.socials.map((s) => <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer me" className="font-bold hover:text-white">{s.label}</a>)}
        </footer>
      </div>
    </main>
  );
}
