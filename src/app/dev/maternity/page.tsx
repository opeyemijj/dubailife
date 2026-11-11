// Development only: maternity outfits on an expecting avatar (bump showing). Production builds answer 404.

import { notFound } from "next/navigation";
import { MaternityPreview } from "./MaternityPreview";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MaternityPreview />;
}
