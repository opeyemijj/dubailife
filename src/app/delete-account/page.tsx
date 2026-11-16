import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, SUPPORT_EMAIL, type Section } from "@/components/legal/LegalPage";

const TITLE = "Delete Your Account & Data";
const DESCRIPTION = "How to delete your Dubai Life account and personal data, what is removed, and what we have to keep.";
export const metadata: Metadata = { title: { absolute: `${TITLE} - Dubai Life` }, description: DESCRIPTION, alternates: { canonical: "/delete-account" } };

const sections: Section[] = [
  {
    id: "app", title: "Delete it in the game (fastest)",
    body: (
      <ol>
        <li>Sign in at mydubailife.app.</li>
        <li>Tap <strong>More</strong> → <strong>Me</strong>, then open <strong>Settings</strong>.</li>
        <li>At the bottom, tap <strong>Delete account</strong> and confirm.</li>
      </ol>
    ),
  },
  {
    id: "email", title: "Or ask us by email",
    body: <p>If you can&apos;t sign in, email <a href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20account`}>{SUPPORT_EMAIL}</a> from the address on your account, with your @username and &ldquo;Delete my account&rdquo;. We may ask you to confirm it&apos;s you, and we delete it within 7 days.</p>,
  },
  {
    id: "what", title: "What is deleted",
    body: <p>Straight away: your account and sign-in, profile and avatar, virtual AED and everything you own in the game, your messages, posts, friends, follows, game history, races, hotel stays, notification subscriptions and email preferences. Homes you owned or rented go back on the market. Copies in our providers&apos; backups expire within 30 days. This can&apos;t be undone, and virtual AED and items can&apos;t be refunded.</p>,
  },
  {
    id: "kept", title: "What we may keep",
    body: <p>Only what the law requires or what keeps others safe: payment and prize-payment records (for tax and accounting, usually up to 5 years), and records of serious rule-breaking (so a closed account can&apos;t simply come back). Messages you sent others are removed with your account. See the <Link href="/privacy">Privacy Policy</Link>.</p>,
  },
  {
    id: "less", title: "Want less than that?",
    body: <p>You don&apos;t have to delete everything: you can switch off reminder emails and notifications, hide what of yours shows in the City Feed, stop showing as available to chat, or withdraw analytics consent on the <Link href="/cookies">Cookie Policy</Link>.</p>,
  },
];

export default function DeleteAccountPage() {
  return <LegalPage title={TITLE} kicker="Your data" updated="16 November 2026" sections={sections} />;
}
