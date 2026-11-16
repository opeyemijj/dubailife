import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, OPERATOR, SUPPORT_EMAIL } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

const TITLE = "Contact";
const DESCRIPTION = "Contact Dubai Life: player support, safety reports, privacy requests, press, partnerships and investors.";
export const metadata: Metadata = { title: { absolute: `${TITLE} - Dubai Life` }, description: DESCRIPTION, alternates: { canonical: "/contact" } };

const ROWS: Array<{ icon: string; title: string; text: string; subject: string }> = [
  { icon: "🛟", title: "Player support", text: "Account, sign-in, purchases, bugs.", subject: "Support" },
  { icon: "🛡️", title: "Safety", text: "Report harassment, scams or anything dangerous. For in-game reports, tap the player → Report or block.", subject: "Safety" },
  { icon: "🔐", title: "Privacy and your data", text: "Access, correction, a copy, or deletion of your data.", subject: "Privacy request" },
  { icon: "📰", title: "Press", text: "Stories, interviews and assets.", subject: "Press" },
  { icon: "🤝", title: "Partnerships and venues", text: "Bring your venue, brand or event into the city.", subject: "Partnership" },
  { icon: "📈", title: "Investors", text: "See the Investors page, then get in touch.", subject: "Investors" },
];

export default function ContactPage() {
  return (
    <LegalPage title={TITLE} kicker="Company" intro={<p>Dubai Life is made by {OPERATOR} in Dubai. We read every message and usually reply within two working days.</p>}>
      <div className="grid sm:grid-cols-2 gap-3">
        {ROWS.map((r) => (
          <a key={r.title} href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(r.subject)}`} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-emerald-500/50">
            <p className="text-2xl">{r.icon}</p>
            <p className="font-black text-white mt-1">{r.title}</p>
            <p className="text-sm text-slate-400">{r.text}</p>
            <p className="text-xs font-bold text-emerald-400 mt-2">{SUPPORT_EMAIL} · “{r.subject}”</p>
          </a>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-sm font-bold">
        {SITE.socials.map((s) => <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-emerald-400">{s.label}</a>)}
        <Link href="/feedback" className="text-amber-400 hover:text-amber-300">Ideas & feedback board</Link>
      </div>
    </LegalPage>
  );
}
