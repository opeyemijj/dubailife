import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SportLobby } from "@/components/racing/SportLobby";
import SPORTS from "@/data/racing/sports.json";

// Horse racing at Meydan, camel racing at Al Marmoom, superbikes at the Autodrome: /racing/horse, /racing/camel, /racing/bike.

export function generateStaticParams() {
  return SPORTS.sports.map((s) => ({ sport: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ sport: string }> }): Promise<Metadata> {
  const { sport } = await params;
  const s = SPORTS.sports.find((x) => x.id === sport);
  return s ? { title: `${s.name} · ${s.venue}`, description: s.tagline } : {};
}

export default async function Page({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params;
  if (!SPORTS.sports.some((s) => s.id === sport)) notFound();
  return <SportLobby sport={sport} />;
}
