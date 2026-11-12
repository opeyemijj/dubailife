import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dubai Life Monthly Gaming Tournament — Live Leaderboard & Cash Prizes",
  description:
    "Compete in the official Dubai Life monthly gaming tournament. Free to enter, 100% skill-based competition with AED cash prizes and real-time citizen rankings.",
  alternates: { canonical: "/tournament" },
  openGraph: {
    title: "Dubai Life Monthly Gaming Tournament — Live Leaderboard & Prizes",
    description:
      "Compete in the official Dubai Life monthly tournament. Free to enter, skill-based competition with real prizes.",
    url: "/tournament",
  },
  twitter: {
    title: "Dubai Life Monthly Gaming Tournament — Live Leaderboard & Prizes",
    description: "Compete in the official Dubai Life monthly tournament.",
  },
};

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
