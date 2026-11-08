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
        <h1>Dubai Life — Official 3D Multiplayer Game &amp; Virtual World</h1>
        <p>
          Welcome to the official Dubai Life game (hosted at mydubailife.app). Play the premier 3D multiplayer life simulation
          set in Dubai. Create and customize your 3D avatar, navigate Downtown Dubai, ride the Dubai Metro and Yalla Taxis,
          rent luxury flats in Dubai Marina or villas on the Palm Jumeirah, choose from high-paying careers, shop at The Dubai Mall,
          and play {GAMES.length} online multiplayer games with friends worldwide with zero download required.
        </p>

        <section aria-labelledby="features-heading">
          <h2 id="features-heading">Official Dubai Life Virtual Experience</h2>
          <ul>
            <li><strong>Interactive 3D Virtual City:</strong> Real Dubai districts including Downtown, Dubai Marina, Deira, and Palm Jumeirah.</li>
            <li><strong>Live Social Multiplayer:</strong> Chat in real-time, host Live Audio Spaces, attend Lagos and Dubai weddings, and throw yacht parties.</li>
            <li><strong>Free Multiplayer Arcade Games:</strong> Play {GAMES.length} classic and modern games including Ludo, Chess, 8-Ball Pool, Dominoes, and Celebrity Boxing.</li>
            <li><strong>Authentic Dubai Economy:</strong> Earn virtual AED, advance through a 5-tier career ladder, manage daily living costs, and furnish luxury residences.</li>
            <li><strong>Instant Browser Play &amp; PWA:</strong> Play instantly on any phone, tablet, or desktop browser, or install as a full-screen home screen app.</li>
          </ul>
        </section>

        <nav aria-label="Dubai Life Official Navigation">
          <h2>Quick Links &amp; Dubai Life Guides</h2>
          <ul>
            <li><Link href="/about">About Dubai Life — Official Overview &amp; FAQs</Link></li>
            <li><Link href="/explore">Explore the 3D Dubai City Map</Link></li>
            <li><Link href="/wiki">Dubai Life Wiki &amp; Player Guide</Link></li>
            <li><Link href="/marathon">Weekly Dubai Life Marathon (Fridays 7 PM GST)</Link></li>
            <li><Link href="/place/dubai-mall">The Dubai Mall Virtual Experience</Link></li>
            <li><Link href="/academics">Dubai Academic City Accredited Courses</Link></li>
            <li><Link href="/business">Advertise Your Business in Dubai Life</Link></li>
            <li><Link href="/scam-check">The 30-Second Dubai Scam Check Tool</Link></li>
            {GAMES.map((g) => (
              <li key={g.id}>
                <Link href={`/games/${g.id}`}>Play {g.name} Online Free in Dubai Life</Link>
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
