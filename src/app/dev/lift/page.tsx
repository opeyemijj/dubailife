// Development only: a villa with its home lift, to ride it between the floors. Production builds answer 404.

import { notFound } from "next/navigation";
import { LiftPreview } from "./LiftPreview";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <LiftPreview />;
}
