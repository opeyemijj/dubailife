// Development only: the Autodrome race with three cars on the grid (you in the Huracán), no sign-in. Production
// builds answer 404.

import { notFound } from "next/navigation";
import { AutodromePreview } from "./AutodromePreview";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AutodromePreview />;
}
