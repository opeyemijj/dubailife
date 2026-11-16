import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, OPERATOR, SUPPORT_EMAIL, type Section } from "@/components/legal/LegalPage";
import { MIN_AGE } from "@/lib/age";

const TITLE = "Privacy Policy";
const DESCRIPTION = "How Dubai Life collects, uses, shares and protects your personal data, including Google sign-in data, and your rights.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} - Dubai Life` },
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/privacy" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

const UPDATED = "16 November 2026";

const sections: Section[] = [
  {
    id: "who", title: "Who we are",
    body: <p>Dubai Life (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a 3D multiplayer life game at mydubailife.app, created and operated by {OPERATOR}, Dubai, United Arab Emirates, who is the controller of your personal data. We follow the UAE Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data (PDPL) and, for players in the European Union and the United Kingdom, the GDPR and UK GDPR. Contact: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>,
  },
  {
    id: "collect", title: "What we collect",
    body: (
      <ul>
        <li><strong>Account:</strong> your email address, a securely hashed password (or your Google sign-in), your @username and display name, and your date of birth (to confirm you are {MIN_AGE} or over).</li>
        <li><strong>Google sign-in:</strong> if you use it, your email address, whether it is verified, your name and profile picture. Nothing else from your Google account (no contacts, Drive, Gmail or Calendar).</li>
        <li><strong>Your game:</strong> your avatar and look, virtual AED balance and transactions, homes, furniture, cars, jobs, ventures, goals, scores, game results, races, hotel stays, parties you host or attend, relationships and family in the game, and the places you go in the virtual city.</li>
        <li><strong>Selfie avatars:</strong> if you make an avatar from a photo, it is created by Avaturn in their embedded tool and the result is kept in your own browser. We don&apos;t receive or keep your photo.</li>
        <li><strong>Messages and posts:</strong> direct messages, chat in rooms and Spaces, comments, ideas and suggestions, party and event titles, and invitations you send.</li>
        <li><strong>Voice:</strong> in Spaces and 1-on-1 calls your voice goes directly between players&apos; devices (through a relay server when a direct connection isn&apos;t possible). We don&apos;t record or store voice.</li>
        <li><strong>Social:</strong> who you friend, follow, block and report, and when you are online and available to chat.</li>
        <li><strong>Device and technical:</strong> browser and device type, language, time zone (so emails respect your night-time), IP address as seen by our hosting providers, error and performance logs, and push-notification subscriptions if you turn notifications on.</li>
        <li><strong>Analytics (only with your consent):</strong> Microsoft Clarity records how pages are used (clicks, scrolls, taps and session replays) so we can fix problems. See the <Link href="/cookies">Cookie Policy</Link>.</li>
        <li><strong>Email:</strong> which emails we sent you and whether they were delivered.</li>
        <li><strong>Payments:</strong> if you buy virtual AED or a paid feature, the payment is handled by our payment provider. We receive the payment status and amount, never your full card number.</li>
        <li><strong>Prize winners:</strong> if you win a real-cash or real-world prize, your full name, country, payout details and an identity-document reference, to verify and pay you (see the <Link href="/prize-rules">Prize Rules</Link>).</li>
        <li><strong>Safety:</strong> reports you make or that are made about you, and any moderation action.</li>
      </ul>
    ),
  },
  {
    id: "use", title: "How we use it, and why",
    body: (
      <>
        <ul>
          <li><strong>To run the game you signed up for</strong> (performing our contract with you): your account, saving your progress, multiplayer rooms, Spaces, games, races, parties, messages, the City Feed and leaderboards.</li>
          <li><strong>To keep everyone safe</strong> (our legitimate interests and legal obligations): preventing cheating, bots, fraud, scams and abuse, enforcing the <Link href="/community-guidelines">Community Guidelines</Link>, and verifying prize winners.</li>
          <li><strong>To tell you things</strong>: account emails (verification, password reset) always; reminder emails and &ldquo;while you were away&rdquo; emails, which you can switch off in Settings or with the link in any of them; push notifications only if you turn them on.</li>
          <li><strong>To improve the game</strong>: aggregated usage (for example, which phone apps are opened most, to order the phone screen), and Clarity analytics only with your consent.</li>
        </ul>
        <p>We don&apos;t sell your personal data, and we don&apos;t use it for third-party advertising.</p>
      </>
    ),
  },
  {
    id: "others", title: "What other players can see",
    body: (
      <ul>
        <li>Your @username, display name, avatar and profile: your net worth in virtual AED, homes (their place in the virtual city), cars, job, partner, friends and followers counts, game wins and recent activity.</li>
        <li>City Feed posts the game makes from what you do (for example a party you host, a race you win, a home you buy). You can turn categories off in the City Feed&apos;s settings.</li>
        <li>Whether you are available to chat (you can switch this off), and your position on leaderboards.</li>
        <li>What you say in rooms, Spaces and parties, to the people there.</li>
      </ul>
    ),
  },
  {
    id: "share", title: "Who we share it with",
    body: (
      <>
        <p>Only with service providers who process it for us under contract, and only what each needs:</p>
        <table>
          <thead><tr><th>Provider</th><th>What for</th></tr></thead>
          <tbody>
            <tr><td>Supabase</td><td>Database, sign-in, real-time multiplayer and storage</td></tr>
            <tr><td>Vercel</td><td>Hosting the website and app</td></tr>
            <tr><td>Cloudflare</td><td>Relaying voice when players can&apos;t connect directly</td></tr>
            <tr><td>Postmark</td><td>Sending email</td></tr>
            <tr><td>Google</td><td>Sign in with Google</td></tr>
            <tr><td>Microsoft Clarity</td><td>Usage analytics, only with your consent</td></tr>
            <tr><td>Avaturn</td><td>Making an avatar from a photo, if you choose to</td></tr>
            <tr><td>Your browser&apos;s push service</td><td>Delivering notifications you turned on</td></tr>
            <tr><td>Our payment provider</td><td>Processing purchases, when you buy something</td></tr>
          </tbody>
        </table>
        <p>We also disclose data when the law requires it, to protect players or the service, or as part of a merger or sale of the service (in which case this policy keeps applying).</p>
      </>
    ),
  },
  {
    id: "transfers", title: "International transfers",
    body: <p>Our providers may process data outside the UAE (for example in the European Union, the United Kingdom or the United States). Where they do, we rely on safeguards such as standard contractual clauses and the providers&apos; own security commitments.</p>,
  },
  {
    id: "google", title: "Google user data",
    body: <p>Dubai Life&apos;s use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements. We use Google account data only to sign you in and identify your profile; we never sell it, use it for advertising, or let people read it unless you ask us to investigate a problem or the law requires it.</p>,
  },
  {
    id: "keep", title: "How long we keep it",
    body: (
      <ul>
        <li>Your account and game data: while your account exists. Deleting your account erases it straight away, with everything that belongs to it; copies in our providers&apos; backups expire within 30 days.</li>
        <li>Direct messages: until you or the other person deletes their account.</li>
        <li>City Feed posts: 30 days. Who&apos;s online: about an hour. Records of emails sent to you: until your account is deleted.</li>
        <li>Prize verification and payment records: as long as tax and financial law requires (usually up to 5 years).</li>
        <li>Moderation records: as long as needed to keep the community safe, then deleted.</li>
      </ul>
    ),
  },
  {
    id: "rights", title: "Your rights and choices",
    body: (
      <>
        <ul>
          <li><strong>Access, correction and a copy</strong> of your data: email us.</li>
          <li><strong>Deletion:</strong> in the game, Me → Settings → Delete account, or see <Link href="/delete-account">Delete your account</Link>.</li>
          <li><strong>Object or restrict</strong> how we use your data, and <strong>withdraw consent</strong> at any time: cookie settings on the <Link href="/cookies">Cookie Policy</Link>; reminder and &ldquo;while you were away&rdquo; emails in Settings; notifications in Settings or your browser; what of yours shows in the City Feed; being available to chat.</li>
          <li><strong>Complain</strong> to a data protection authority: in the UAE the UAE Data Office; in the EU or UK, your local authority.</li>
        </ul>
        <p>We answer requests within 30 days.</p>
      </>
    ),
  },
  {
    id: "security", title: "Security",
    body: <p>Data is encrypted in transit (TLS) and at rest by our providers; secrets such as email and payment keys are kept in secure server-side vaults; access to player data is restricted to the operator and audited. No system is perfectly secure: if a breach affects you, we&apos;ll tell you and the authorities as the law requires.</p>,
  },
  {
    id: "age", title: `Players must be ${MIN_AGE} or over`,
    body: <p>Dubai Life is for adults aged {MIN_AGE} and over, and we check your age when you sign up. We don&apos;t knowingly collect data from anyone younger. If you believe someone under {MIN_AGE} has an account, tell us and we will delete it.</p>,
  },
  {
    id: "changes", title: "Changes to this policy",
    body: <p>We&apos;ll update this page when our practices change, and tell you in the game or by email before any change that affects how we use your data in a significant way.</p>,
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title={TITLE} kicker="Legal" updated={UPDATED} sections={sections}
      intro={<p>This policy explains what personal data Dubai Life collects, why, who sees it, how long we keep it, and the choices and rights you have. In short: we collect what the game needs to work and to keep players safe, we never sell your data, and you can delete your account at any time.</p>} />
  );
}
