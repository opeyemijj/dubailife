import type { Metadata } from "next";
import Link from "next/link";

// Official rules for the monthly tournament (design spec section 13.4). Public, so anyone can read them
// before playing. Keep in step with supabase/migrations/*_tournament.sql and the `tournament` setting.

export const metadata: Metadata = {
  title: "Monthly tournament · Official rules",
  description: "Free to enter, skill-based monthly tournament in Dubai Life. Eligibility, scoring, prizes and verification.",
  alternates: { canonical: "/tournament/rules" },
};

const Section = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section className="space-y-1.5">
    <h2 className="font-black text-lg">{n}. {title}</h2>
    <div className="text-sm text-slate-300 space-y-1.5 leading-relaxed">{children}</div>
  </section>
);

export default function TournamentRules() {
  return (
    <main className="min-h-[100dvh] bg-slate-950 text-white px-4 py-[max(1.5rem,env(safe-area-inset-top))] pb-16">
      <article className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/tournament" className="text-sm font-bold text-sky-300 hover:underline">← Back to Tournament</Link>
          <div className="flex items-center gap-2">
            <Link href="/explore" className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300">City Map</Link>
            <Link href="/home" className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300">Home</Link>
          </div>
        </div>
        <header>
          <h1 className="text-3xl font-black">Monthly tournament: official rules</h1>
          <p className="text-sm text-slate-400 mt-1">Effective 22 October 2026. The cash prize applies from the January 2027 tournament.</p>
        </header>

        <Section n={1} title="Sponsor">
          <p>The tournament is run and paid for by the operator of Dubai Life (mydubailife.app), the “Sponsor”. Apple, Google and any other app store or platform are not sponsors and are not involved in any way.</p>
        </Section>
        <Section n={2} title="Free to enter">
          <p>No purchase or payment is needed to enter or to win. Buying virtual AED, a season pass or Dubai Plus does not add points or improve your chances.</p>
        </Section>
        <Section n={3} title="Who can take part">
          <p>Players aged 21 or older with one Dubai Life account. Staff and admins of Dubai Life cannot win. Where local law doesn&apos;t allow this kind of contest, players there can play but cannot win a prize.</p>
        </Section>
        <Section n={4} title="Tournament period">
          <p>Each tournament runs for one calendar month, from 00:00:00 to 23:59:59 Gulf Standard Time (GST, UTC+4) on the last day of the month. The leaderboard freezes at that moment.</p>
        </Section>
        <Section n={5} title="How points are scored">
          <p>Points come only from actions the game records on its servers, in four areas worth up to 2,500 points each (10,000 in total):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Learning:</b> lessons and courses passed in Academic City, and the driving theory exam.</li>
            <li><b>Scam defence:</b> scams in the simulator reported or ignored.</li>
            <li><b>Wellbeing:</b> days played at Peak Performer.</li>
            <li><b>Career &amp; play:</b> shifts worked at player ventures, and multiplayer wins confirmed by the opponent&apos;s result.</li>
          </ul>
          <p>Each area has a daily limit, so steady play beats all-night grinding. Your balance, net worth and purchases never count.</p>
        </Section>
        <Section n={6} title="Prizes">
          <p><b>From January 2027:</b> the player ranked first after the audit wins AED 5,000, paid by bank transfer to an account in their name within 14 days of verification.</p>
          <p><b>Until then:</b> the winner receives a non-cash prize (a Dubai experience for two, arranged by the Sponsor). Prizes can&apos;t be transferred or exchanged. Any taxes are the winner&apos;s responsibility.</p>
        </Section>
        <Section n={7} title="Audit and verification">
          <p>After the freeze, the top 20 are checked for fair play. The provisional winner must, within 7 days, give their full name as on their ID, a photo of their Emirates ID or passport, and payout details. The name must match the account holder, and the player must be 21 or older.</p>
          <p>If the winner can&apos;t be verified, doesn&apos;t reply in time, or breaks these rules, they are disqualified and the next eligible player becomes the winner.</p>
        </Section>
        <Section n={8} title="Fair play">
          <p>One account per person. Multiple accounts, bots, automation, exploiting bugs, trading points or AED for real money, or arranging results with other players lead to disqualification and may close the account. The Sponsor&apos;s decision after review is final.</p>
        </Section>
        <Section n={9} title="Privacy">
          <p>ID documents are stored privately, used only to verify the winner, seen only by authorised staff, and deleted as soon as the prize is paid or the entry is disqualified. The winner&apos;s username may be shown in the game; their real name is never published without permission.</p>
        </Section>
        <Section n={10} title="Changes and contact">
          <p>The Sponsor may change or cancel a tournament if required by law or if something outside its control affects fairness; any change is announced in the game before it applies. Questions: support@cometodubai.com.</p>
        </Section>

        <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <Link href="/tournament" className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all active:scale-95">
            🏆 Enter Tournament
          </Link>
          <Link href="/explore" className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all active:scale-95">
            Return to City Map →
          </Link>
        </div>
      </article>
    </main>
  );
}
