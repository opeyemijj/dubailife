// Development only: sunbathing on the pool lounger in a villa, to check the pose. Production builds answer 404.

import { notFound } from "next/navigation";
import { LoungerPreview } from "./LoungerPreview";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <LoungerPreview />;
}
