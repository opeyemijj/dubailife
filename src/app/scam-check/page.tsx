import type { Metadata } from "next";
import { ScamCheck } from "@/components/share/ScamCheck";

// "Would you fall for it?" (design spec 19.3, 20.2 Family Shield): a public, no-sign-up scam check built
// from the game's scam scenarios. Made to be sent to friends and family.

export const metadata: Metadata = {
  title: "Dubai Life Scam Check — 30-Second Dubai Fraud Test & Security Shield",
  description: "Test yourself against fake police calls, Salik toll fines, and parcel fees on Dubai Life Game. Free 30-second fraud check with no sign-up required.",
  alternates: { canonical: "/scam-check" },
  openGraph: {
    title: "Dubai Life Scam Check — 30-Second Dubai Fraud Test",
    description: "Try a real-pattern Dubai scam scenario safely and learn the red flags on Dubai Life Game.",
    url: "/scam-check",
    images: [{ url: "/api/share-image?m=scam-fell", width: 1200, height: 630 }],
  },
  twitter: {
    title: "Dubai Life Scam Check — 30-Second Dubai Fraud Test",
    description: "Try a real-pattern Dubai scam scenario safely on Dubai Life Game.",
  },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ScamCheckPage({ searchParams }: Props) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return <ScamCheck start={one(sp.s)} referrer={/^[a-z0-9_]{3,24}$/.test(one(sp.r)) ? one(sp.r) : null} />;
}
