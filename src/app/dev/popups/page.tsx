// Development only: fires several popups at once to check the coordinator (lib/popups) shows one at a time, in
// order, and drops none. Production builds answer 404.

import { notFound } from "next/navigation";
import { PopupsPreview } from "./PopupsPreview";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PopupsPreview />;
}
