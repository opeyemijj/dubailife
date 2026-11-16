import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type Section } from "@/components/legal/LegalPage";
import { CookieSettingsButton } from "@/components/legal/CookieConsent";

const TITLE = "Cookie Policy";
const DESCRIPTION = "The cookies and browser storage Dubai Life uses, what each is for, and how to change your choice.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} - Dubai Life` },
  description: DESCRIPTION,
  alternates: { canonical: "/cookies" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/cookies" },
};

const UPDATED = "16 November 2026";

const sections: Section[] = [
  {
    id: "what", title: "What cookies and storage are",
    body: <p>Cookies are small files a website saves in your browser. The game also saves some settings in your browser&apos;s local storage. Both are used so the game remembers you and your choices.</p>,
  },
  {
    id: "essential", title: "Essential (always on)",
    body: (
      <>
        <p>Without these the game can&apos;t work, so they don&apos;t need your consent:</p>
        <table>
          <thead><tr><th>Name</th><th>What it does</th><th>How long</th></tr></thead>
          <tbody>
            <tr><td><code>sb-…-auth-token</code></td><td>Keeps you signed in (Supabase)</td><td>Until you sign out</td></tr>
            <tr><td>Game settings in local storage</td><td>Sound on or off, which tips and popups you&apos;ve seen, your last visit, tutorial progress, sign-up progress</td><td>Until you clear them</td></tr>
            <tr><td><code>dl-cookie-consent</code></td><td>Remembers your cookie choice</td><td>12 months</td></tr>
          </tbody>
        </table>
      </>
    ),
  },
  {
    id: "analytics", title: "Analytics (only if you accept)",
    body: (
      <>
        <p>With your consent we use <strong>Microsoft Clarity</strong> to see how the game is used (clicks, taps, scrolling, and recordings of sessions with what you type hidden) so we can find and fix problems. Microsoft sets these cookies:</p>
        <table>
          <thead><tr><th>Name</th><th>What it does</th><th>How long</th></tr></thead>
          <tbody>
            <tr><td><code>_clck</code></td><td>Recognises the same browser between visits</td><td>1 year</td></tr>
            <tr><td><code>_clsk</code></td><td>Joins the pages of one visit together</td><td>1 day</td></tr>
            <tr><td><code>CLID</code>, <code>MUID</code></td><td>Identify the browser to Clarity</td><td>1 year</td></tr>
            <tr><td><code>ANONCHK</code>, <code>SM</code>, <code>MR</code></td><td>Clarity&apos;s own settings and checks</td><td>Up to 7 days</td></tr>
          </tbody>
        </table>
        <p>Read <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer">Microsoft&apos;s privacy statement</a>. We don&apos;t use advertising or tracking cookies.</p>
      </>
    ),
  },
  {
    id: "choice", title: "Changing your choice",
    body: (
      <>
        <p>You can change your mind at any time:</p>
        <CookieSettingsButton />
        <p>You can also block or delete cookies in your browser&apos;s settings; if you block the essential ones, you won&apos;t be able to stay signed in. See the <Link href="/privacy">Privacy Policy</Link> for how we use data.</p>
      </>
    ),
  },
];

export default function CookiesPage() {
  return <LegalPage title={TITLE} kicker="Legal" updated={UPDATED} sections={sections}
    intro={<p>We use only what the game needs to work, plus analytics if you say yes. No advertising cookies.</p>} />;
}
