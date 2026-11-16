import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, SUPPORT_EMAIL, type Section } from "@/components/legal/LegalPage";

const TITLE = "Purchases & Refunds";
const DESCRIPTION = "Virtual AED, paid features, entry fees and in-game prizes in Dubai Life, and when you can get a refund.";
export const metadata: Metadata = { title: { absolute: `${TITLE} - Dubai Life` }, description: DESCRIPTION, alternates: { canonical: "/purchases" } };

const sections: Section[] = [
  {
    id: "free", title: "Dubai Life is free to play",
    body: <p>You can play everything in Dubai Life without paying. Every player starts with virtual AED, and earns more from jobs, ventures, goals, daily missions, rewards and games.</p>,
  },
  {
    id: "virtual", title: "What virtual AED is",
    body: <p>Virtual AED is the game&apos;s currency. It&apos;s a licence to use inside the game, not money: it has no real-world value and can&apos;t be cashed out, exchanged, or transferred outside Dubai Life (see the <Link href="/terms">Terms</Link>).</p>,
  },
  {
    id: "buying", title: "Buying virtual AED or paid features",
    body: (
      <ul>
        <li>When we offer purchases, the price in real currency and what you get are shown before you pay.</li>
        <li>Payments are processed by our payment provider; we never see your full card details.</li>
        <li>What you buy goes into your account straight away. If it doesn&apos;t arrive within an hour, tell us.</li>
        <li>Venue owners can pay for venue subscriptions and advertising campaigns on in-game billboards; the price and length are shown when you buy.</li>
      </ul>
    ),
  },
  {
    id: "refunds", title: "Refunds",
    body: (
      <>
        <p>Because what you buy is delivered and used straight away, purchases are final, except:</p>
        <ul>
          <li>you were charged but didn&apos;t receive what you bought;</li>
          <li>you were charged twice, or the wrong amount;</li>
          <li>the purchase was made without your permission (tell us quickly, and secure your account);</li>
          <li>the law where you live gives you a right to a refund.</li>
        </ul>
        <p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> within 14 days with your @username, the date and the amount. Refunds go back to the original payment method, and the virtual AED or feature is removed. Disputing a charge with your bank instead of asking us may suspend the account while we look into it.</p>
      </>
    ),
  },
  {
    id: "ingame", title: "Entry fees, prizes and gifts inside the game",
    body: (
      <ul>
        <li>Race entry fees at Dubai Autodrome, hotel stays, parties, cars, homes and everything else bought inside the game are paid in virtual AED.</li>
        <li>Race entry fees go into the race&apos;s pot and are all paid out to the winner, or the top three. Leave the grid before the start and your fee comes back; if a race is closed or nobody finishes, every fee comes back.</li>
        <li>Rewards, prizes and gifts between players are virtual AED too. Mistakes and winnings gained by cheating can be reversed.</li>
        <li>The monthly tournament&apos;s real-world prize has its own <Link href="/prize-rules">rules</Link>.</li>
      </ul>
    ),
  },
  {
    id: "closing", title: "If an account closes",
    body: <p>If you delete your account, or it&apos;s closed for breaking the rules, its virtual AED and items are gone and can&apos;t be refunded, except where the law requires otherwise.</p>,
  },
];

export default function PurchasesPage() {
  return <LegalPage title={TITLE} kicker="Legal" updated="16 November 2026" sections={sections} />;
}
