// Development only: opens an attraction game straight away, without signing in, so the 3D games can be
// checked in a browser (and screenshotted) while they're built. Production builds answer 404.

import { notFound } from "next/navigation";
import { ArcadePreview } from "./ArcadePreview";

export default async function Page({ params }: { params: Promise<{ game: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { game } = await params;
  return <ArcadePreview game={game} />;
}
