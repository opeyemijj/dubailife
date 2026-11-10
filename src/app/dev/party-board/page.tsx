// Development only: a home with the party game outside, against the computer, so the 3D boards can be checked
// in a browser (and screenshotted) without a party. ?tier=villa|studio&game=connect4|chess|ludo|pool&pool=1.
// Production builds answer 404.

import { notFound } from "next/navigation";
import { PartyBoardPreview } from "./PartyBoardPreview";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  return <PartyBoardPreview tier={q.tier ?? "villa"} game={q.game ?? "connect4"} pool={q.pool !== "0"} moves={Number(q.moves ?? 6)} />;
}
