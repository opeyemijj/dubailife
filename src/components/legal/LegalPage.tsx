// The layout every legal and company page shares (/privacy, /terms, /cookies, /community-guidelines, /purchases,
// /prize-rules, /delete-account, /contact, /investors, /legal): a header back to the game, the title and when it was
// last updated, numbered sections, and the links to all the others at the foot. Server-rendered, readable without
// signing in.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SITE } from "@/lib/site";
import { UniversalNav } from "@/components/layout/UniversalNav";

export const OPERATOR = "Opeyemi Ishola (Brain)";
export const SUPPORT_EMAIL = "support@mydubailife.app";

/** Every page in the legal and company set, in the order the hub lists them. */
export const LEGAL_PAGES = [
  { href: "/terms", title: "Terms of Service", blurb: "The agreement between you and Dubai Life." },
  { href: "/privacy", title: "Privacy Policy", blurb: "What we collect, why, who sees it, and your rights." },
  { href: "/cookies", title: "Cookie Policy", blurb: "The cookies and storage we use, and your choices." },
  { href: "/community-guidelines", title: "Community Guidelines", blurb: "How to treat other citizens, and what happens if you don't." },
  { href: "/purchases", title: "Purchases & Refunds", blurb: "Virtual AED, entry fees, and what happens if something goes wrong." },
  { href: "/prize-rules", title: "Prize & Tournament Rules", blurb: "The monthly tournament, real-cash prizes and in-game prizes." },
  { href: "/delete-account", title: "Delete Your Account & Data", blurb: "How to delete everything, and what it removes." },
  { href: "/credits", title: "Credits & Licences", blurb: "The artists and software the game is built with." },
  { href: "/contact", title: "Contact", blurb: "Support, safety, press and partnerships." },
  { href: "/investors", title: "Investors", blurb: "What Dubai Life is, how it grows, and live numbers." },
] as const;

export interface Section { id: string; title: string; body: React.ReactNode }

export function LegalPage({ title, kicker = "Dubai Life", updated, intro, top, sections, children }: {
  title: string; kicker?: string; updated?: string; intro?: React.ReactNode;
  /** Shown before the sections (the Investors page's live numbers). */
  top?: React.ReactNode;
  sections?: Section[]; children?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 sm:px-6 py-3.5">
          <Link href="/legal" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" /> Legal & company</Link>
          <Link href="/explore" className="text-xs font-extrabold text-emerald-400 hover:text-emerald-300">Enter Dubai Life →</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        <div className="space-y-3 border-b border-slate-800 pb-7">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-400">{kicker}</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">{title}</h1>
          {updated && <p className="text-xs text-slate-400">Last updated {updated} · {SITE.domain}</p>}
          {intro && <div className="text-sm sm:text-base text-slate-300 leading-relaxed space-y-3">{intro}</div>}
        </div>
        {top}
        {sections && sections.length > 2 && (
          <nav aria-label="On this page" className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">On this page</p>
            <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {sections.map((s, i) => <li key={s.id}><a href={`#${s.id}`} className="text-slate-300 hover:text-emerald-400">{i + 1}. {s.title}</a></li>)}
            </ol>
          </nav>
        )}
        {sections?.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-20 space-y-3">
            <h2 className="flex items-center gap-3 text-xl font-black text-white">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-400">{i + 1}</span>
              {s.title}
            </h2>
            <div className="legal-body text-sm sm:text-[15px] text-slate-300 leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_a]:text-emerald-400 [&_a:hover]:underline [&_strong]:text-white [&_table]:w-full [&_th]:text-left [&_th]:text-white [&_th]:py-1.5 [&_td]:py-1.5 [&_td]:align-top [&_tr]:border-b [&_tr]:border-slate-800">{s.body}</div>
          </section>
        ))}
        {children}
        <footer className="border-t border-slate-800 pt-6 space-y-3">
          <p className="text-xs text-slate-500">Dubai Life is operated by {OPERATOR}, Dubai, United Arab Emirates. Questions: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-400 hover:underline">{SUPPORT_EMAIL}</a>.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-bold">
            {LEGAL_PAGES.map((p) => <Link key={p.href} href={p.href} className="text-slate-400 hover:text-emerald-400">{p.title}</Link>)}
          </div>
          <p className="text-[11px] text-slate-600">Dubai Life is a fan-made virtual city inspired by Dubai. It isn&apos;t affiliated with or endorsed by the Government of Dubai or any place, business or brand shown in the game.</p>
        </footer>
      </main>
      <UniversalNav />
    </div>
  );
}
