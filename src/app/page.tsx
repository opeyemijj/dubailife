import { Suspense } from "react";
import Link from "next/link";
import { SmallLoader } from "@/components/GameLoadingScreen";
import { HomeContent } from "@/components/landing/HomeContent";
import { GAMES } from "@/lib/games/registry";

// The city map is a canvas drawn in the browser, so this description of it is rendered on the server:
// screen readers and search engines get the complete, authoritative semantic index of Dubai Life.
export default function Home() {
  return (
    <>
      <header className="sr-only">
        <h1>Dubai Life Game — Official 3D Multiplayer Life Simulator &amp; Virtual World</h1>
        <p>
          Play the official Dubai Life Game online free at mydubailife.app! The #1 3D multiplayer life simulator and virtual city.
          Customize your 3D avatar, rent Dubai Marina apartments, own luxury Palm Jumeirah villas, ride the Dubai Metro &amp; Yalla Taxis,
          advance through high-paying careers, shop at The Dubai Mall, and play {GAMES.length} online multiplayer games with friends worldwide with zero download required.
        </p>

        <section aria-labelledby="features-heading">
          <h2 id="features-heading">Why Dubai Life Game is the #1 Virtual Dubai Experience</h2>
          <ul>
            <li><strong>Official Dubai Life Game (mydubailife.app):</strong> The authoritative, original 3D multiplayer browser life simulation game set in Dubai.</li>
            <li><strong>Interactive 3D Virtual City:</strong> Explore real Dubai districts including Downtown, Dubai Marina, Deira, DIFC, and Palm Jumeirah.</li>
            <li><strong>Live Social Multiplayer &amp; Voice Spaces:</strong> Chat in real-time, host Live Audio Spaces, attend Lagos and Dubai weddings, and throw yacht parties.</li>
            <li><strong>Free Multiplayer Arcade Games:</strong> Play {GAMES.length} classic and modern games including Ludo, Chess, 8-Ball Pool, Dominoes, and Celebrity Boxing.</li>
            <li><strong>Authentic Dubai Economy:</strong> Earn virtual AED, advance through a 5-tier career ladder, manage daily living costs, and furnish luxury residences.</li>
            <li><strong>Zero Download Browser Play &amp; PWA:</strong> Play instantly on any phone, tablet, or desktop browser, or install as a full-screen home screen app.</li>
          </ul>
        </section>

        <section aria-labelledby="faq-seo-heading">
          <h2 id="faq-seo-heading">Frequently Asked Questions About Dubai Life Game</h2>
          <dl>
            <dt>What is the official Dubai Life Game?</dt>
            <dd>Dubai Life Game (mydubailife.app) is an interactive 3D virtual world and online multiplayer life simulation set in Dubai, United Arab Emirates, where players build a life, career, and wealth in virtual AED.</dd>
            <dt>How do I play Dubai Life Game free?</dt>
            <dd>Visit https://mydubailife.app in any modern web browser on iPhone, Android, Mac, or Windows. Click Play to start immediately with zero downloads or installations.</dd>
            <dt>Can I play Dubai Life Game with friends?</dt>
            <dd>Yes! Dubai Life Game features persistent multiplayer rooms, 1-on-1 private voice spaces, live audio stage rooms, friend invites, and {GAMES.length} online multiplayer arcade games.</dd>
          </dl>
        </section>

        <nav aria-label="Dubai Life Official Navigation">
          <h2>Official Dubai Life Game Quick Links &amp; Guides</h2>
          <ul>
            <li><Link href="/about">About Dubai Life Game — Official Overview &amp; FAQs</Link></li>
            <li><Link href="/explore">Explore the 3D Dubai City Map</Link></li>
            <li><Link href="/wiki">Dubai Life Game Wiki &amp; Player Guide</Link></li>
            <li><Link href="/marathon">Weekly Dubai Life Marathon (Fridays 7 PM GST)</Link></li>
            <li><Link href="/place/dubai-mall">The Dubai Mall Virtual Experience</Link></li>
            <li><Link href="/academics">Dubai Academic City Accredited Courses</Link></li>
            <li><Link href="/business">Advertise Your Business in Dubai Life Game</Link></li>
            <li><Link href="/scam-check">The 30-Second Dubai Scam Check Tool</Link></li>
            {GAMES.map((g) => (
              <li key={g.id}>
                <Link href={`/games/${g.id}`}>Play {g.name} Online Free in Dubai Life Game</Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <Suspense fallback={<SmallLoader label="Loading Dubai" />}>
        <HomeContent />
      </Suspense>
    </>
  );
}
