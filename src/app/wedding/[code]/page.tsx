import type { Metadata } from "next";
import { WeddingPage } from "@/components/love/WeddingPage";

export const metadata: Metadata = {
  title: "You're invited to a wedding",
  description: "A wedding invitation on Dubai Life. RSVP, send a gift and celebrate with the couple in virtual Dubai.",
  robots: { index: false },
};

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <WeddingPage code={code} />;
}
