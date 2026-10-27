import { Suspense } from "react";
import Link from "next/link";
import { SmallLoader } from "@/components/GameLoadingScreen";
import { HomeContent } from "@/components/landing/HomeContent";
import { GAMES } from "@/lib/games/registry";

// The city map is a canvas drawn in the browser, so this description of it is rendered on the server:
// screen readers and search engines get the same account of the page that sighted players see.
export default function Home() {
  return (
    <>
      <header className="sr-only">
        <h1>Dubai Life — live your Dubai story online</h1>
        <p>
          Dubai Life is a free life simulation set in Dubai. Create your avatar, ride the Dubai Metro and taxis,
          rent a flat in Dubai Marina or a villa on the Palm, get a job, shop at Dubai Mall, play {GAMES.length} multiplayer
          games like Ludo, Chess and Pool, and make real friends. Play in your browser on phone or computer.
        </p>
        <nav aria-label="Dubai Life">
          <ul>
            <li><Link href="/about">What is Dubai Life?</Link></li>
            <li><Link href="/explore">Explore the Dubai map</Link></li>
            <li><Link href="/place/dubai-mall">The Dubai Mall</Link></li>
            <li><Link href="/academics">Dubai Academic City courses</Link></li>
            <li><Link href="/business">Advertise your business in Dubai Life</Link></li>
            <li><Link href="/scam-check">The 30-second Dubai scam check</Link></li>
            {GAMES.map((g) => <li key={g.id}><Link href={`/games/${g.id}`}>Play {g.name} online free</Link></li>)}
          </ul>
        </nav>
      </header>
      <Suspense fallback={<SmallLoader label="Loading Dubai" />}>
        <HomeContent />
      </Suspense>
    </>
  );
}
