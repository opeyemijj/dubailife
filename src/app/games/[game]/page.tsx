import type { Metadata } from "next";
import { Suspense } from "react";
import { GameRoomPage } from "@/components/games/GameRoomPage";
import { gameInfo } from "@/lib/games/registry";

type Params = { params: Promise<{ game: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { game } = await params;
  const info = gameInfo(game);
  if (!info) return { title: "Game not found", robots: { index: false } };
  const title = `${info.name} — play free in Game City`;
  const description = `${info.tagline}. Play ${info.name} free against the computer or with friends in Dubai Life's Game City. ${info.rules}`.slice(0, 300);
  return { title, description, alternates: { canonical: `/games/${game}` }, openGraph: { title, description }, twitter: { title, description } };
}

export default async function GamePage({ params }: Params) {
  const { game } = await params;
  return (
    <Suspense>
      <GameRoomPage game={game} />
    </Suspense>
  );
}
