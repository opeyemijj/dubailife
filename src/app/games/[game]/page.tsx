import type { Metadata } from "next";
import { Suspense } from "react";
import { GameRoomPage } from "@/components/games/GameRoomPage";
import { gameInfo } from "@/lib/games/registry";

type Params = { params: Promise<{ game: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { game } = await params;
  const info = gameInfo(game);
  if (!info) return { title: "Game Not Found", robots: { index: false } };
  const title = `Play ${info.name} Online Free`;
  const description = `${info.tagline}. Play ${info.name} free against friends or computer in Come To Dubai (cometodubai.app). ${info.rules}`.slice(0, 300);
  return {
    title,
    description,
    alternates: { canonical: `/games/${game}` },
    openGraph: { title: `${title} - Come To Dubai`, description, url: `/games/${game}` },
    twitter: { title: `${title} - Come To Dubai`, description },
  };
}

export default async function GamePage({ params }: Params) {
  const { game } = await params;
  return (
    <Suspense>
      <GameRoomPage game={game} />
    </Suspense>
  );
}
