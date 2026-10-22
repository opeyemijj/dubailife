import type { Metadata } from "next";
import { ScamCheck } from "@/components/share/ScamCheck";

// "Would you fall for it?" (design spec 19.3, 20.2 Family Shield): a public, no-sign-up scam check built
// from the game's scam scenarios. Made to be sent to friends and family.

export const metadata: Metadata = {
  title: "Would you fall for it? The 30-second Dubai scam check",
  description: "Fake police calls, toll fines and parcel fees: try a real-pattern scam safely and learn the red flags. Free, no sign-up.",
  alternates: { canonical: "/scam-check" },
  openGraph: { title: "Would you fall for it? 🛡️ The 30-second Dubai scam check", description: "Try a real-pattern scam safely and learn the red flags. Free, no sign-up.", url: "/scam-check",
    images: [{ url: "/api/share-image?m=scam-fell", width: 1200, height: 630 }] },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ScamCheckPage({ searchParams }: Props) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return <ScamCheck start={one(sp.s)} referrer={/^[a-z0-9_]{3,24}$/.test(one(sp.r)) ? one(sp.r) : null} />;
}
