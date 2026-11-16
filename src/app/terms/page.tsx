import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, OPERATOR, SUPPORT_EMAIL, type Section } from "@/components/legal/LegalPage";
import { MIN_AGE } from "@/lib/age";

const TITLE = "Terms of Service";
const DESCRIPTION = "The agreement between you and Dubai Life: eligibility, accounts, virtual currency, purchases, prizes, conduct, content and liability.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} - Dubai Life` },
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/terms" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

const UPDATED = "16 November 2026";

const sections: Section[] = [
  {
    id: "agreement", title: "This agreement",
    body: <p>These Terms are a legal agreement between you and {OPERATOR} (&ldquo;Dubai Life&rdquo;, &ldquo;we&rdquo;) for the Dubai Life game and website at mydubailife.app. By creating an account or playing, you accept them, together with the <Link href="/privacy">Privacy Policy</Link>, <Link href="/community-guidelines">Community Guidelines</Link>, <Link href="/purchases">Purchases &amp; Refunds</Link> and <Link href="/prize-rules">Prize &amp; Tournament Rules</Link>. If you don&apos;t agree, please don&apos;t use Dubai Life.</p>,
  },
  {
    id: "eligibility", title: `Eligibility: ${MIN_AGE} and over`,
    body: <p>You must be at least {MIN_AGE} years old and legally able to enter this agreement. We ask your date of birth when you sign up; giving a false one is a breach of these Terms, and we close accounts of anyone under {MIN_AGE}.</p>,
  },
  {
    id: "account", title: "Your account",
    body: (
      <ul>
        <li>One person, one account. Keep your login safe; you are responsible for what happens on your account.</li>
        <li>Your @username must not impersonate anyone, or be offensive or misleading.</li>
        <li>Tell us straight away at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you think someone else is using your account.</li>
      </ul>
    ),
  },
  {
    id: "virtual", title: "Virtual AED and in-game items",
    body: (
      <ul>
        <li>The game&apos;s currency, <strong>virtual AED</strong>, and everything in the game (homes, cars, furniture, clothes, ventures, prizes, badges) are a limited, personal, revocable licence to use inside Dubai Life. <strong>You don&apos;t own them, and they have no real-world money value.</strong> They can&apos;t be cashed out, refunded for money, or exchanged for real currency, crypto or goods, except as these Terms or the Prize Rules expressly say.</li>
        <li>In-game homes and places are simulations. They give no rights to any real property in Dubai or anywhere.</li>
        <li>Selling or buying accounts, virtual AED or items for real money outside the game is not allowed and leads to account closure.</li>
        <li>We may change, rebalance or remove items, prices, rewards and features to keep the game fair and working. Mistaken credits (for example from a bug) may be reversed.</li>
      </ul>
    ),
  },
  {
    id: "purchases", title: "Purchases",
    body: <p>Where we offer virtual AED or paid features for real money, the price is shown before you pay, payment is handled by our payment provider, and what you buy is delivered to your account straight away. Purchases are final once delivered, except where the law gives you a right to a refund or something went wrong; see <Link href="/purchases">Purchases &amp; Refunds</Link>.</p>,
  },
  {
    id: "prizes", title: "Entry fees, rewards and prizes",
    body: (
      <ul>
        <li><strong>In-game entry fees and prizes</strong> (for example races at Dubai Autodrome, where drivers pay an entry fee in virtual AED and the winner, or the top three, take the pot), rewards for hosting parties and Spaces, and gifts between players are all in virtual AED and have no real-world value.</li>
        <li><strong>The monthly tournament</strong> may award a real-world or cash prize. It is free to enter, decided by skill, and governed by the <Link href="/prize-rules">Prize &amp; Tournament Rules</Link>, including identity checks.</li>
        <li>We may withhold or reverse rewards, prizes or winnings gained by cheating, collusion, multiple accounts or exploiting bugs.</li>
      </ul>
    ),
  },
  {
    id: "conduct", title: "How you must behave",
    body: <p>Follow the <Link href="/community-guidelines">Community Guidelines</Link>. In particular: no harassment, hate, threats, sexual content, scams, cheating, bots, impersonation, spam, or attempts to break, overload or reverse-engineer the service. Voice in Spaces and calls is live and unmoderated as it happens; you are responsible for what you say.</p>,
  },
  {
    id: "content", title: "What you post",
    body: <p>You keep ownership of what you write and say (messages, posts, ideas, party and Space titles). You give us a worldwide, royalty-free licence to host, show and share it inside Dubai Life as the game needs (for example showing your party in the City Feed), and to use ideas you suggest to improve the game. Don&apos;t post anything you don&apos;t have the right to, or that breaks the law or these Terms. We may remove content that does.</p>,
  },
  {
    id: "enforcement", title: "Moderation, suspension and closure",
    body: <p>We may warn you, mute you, remove content, reverse virtual AED or items, suspend or close your account if you break these Terms or the Guidelines, or to protect other players or the service. Where we can, we&apos;ll tell you why, and you can reply to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you think we got it wrong. You can stop playing and delete your account at any time (<Link href="/delete-account">how</Link>). When an account closes, its virtual AED and items are gone.</p>,
  },
  {
    id: "ip", title: "Our rights",
    body: <p>The game, its code, design, art, sound and the Dubai Life name are owned by {OPERATOR} or licensed to us (see <Link href="/credits">Credits</Link>). You may use the game for your own personal entertainment. Places, landmarks, businesses and brands that appear in the city are shown for flavour and aren&apos;t affiliated with or endorsed by us, and we aren&apos;t affiliated with them or with the Government of Dubai.</p>,
  },
  {
    id: "third", title: "Other services",
    body: <p>Dubai Life uses other companies&apos; services (such as Google sign-in, Supabase, Cloudflare, Postmark and Microsoft Clarity) and may link to others (radio streams, social media). Their own terms apply to them, and we aren&apos;t responsible for them.</p>,
  },
  {
    id: "warranty", title: "The service is provided as it is",
    body: <p>Dubai Life is a game that changes often. It is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without promises that it will always be available, error-free or that progress will never be lost, to the extent the law allows.</p>,
  },
  {
    id: "liability", title: "Limits on liability",
    body: <p>To the extent the law allows, we aren&apos;t liable for indirect or consequential loss, loss of virtual items, or loss caused by other players, and our total liability to you is limited to the amount you paid us in the 12 months before the claim (or AED 100 if you paid nothing). Nothing in these Terms limits liability that can&apos;t be limited by law, or your statutory rights as a consumer.</p>,
  },
  {
    id: "indemnity", title: "Your responsibility",
    body: <p>If your breach of these Terms, or your content, causes a claim against us, you agree to cover our reasonable costs of that claim, to the extent the law allows.</p>,
  },
  {
    id: "changes", title: "Changes to these Terms",
    body: <p>We may update these Terms. We&apos;ll show the date at the top and tell you in the game or by email about significant changes before they apply. If you keep playing after that, the new Terms apply.</p>,
  },
  {
    id: "law", title: "Governing law",
    body: <p>These Terms are governed by the laws of the Emirate of Dubai and the federal laws of the United Arab Emirates, and the courts of Dubai have jurisdiction, without taking away any mandatory consumer protections of the country you live in.</p>,
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPage title={TITLE} kicker="Legal" updated={UPDATED} sections={sections}
      intro={<p>Please read these Terms before playing. The short version: you must be {MIN_AGE} or over; virtual AED and items have no real-world value; be decent to other players; and we can act against cheating and abuse.</p>} />
  );
}
