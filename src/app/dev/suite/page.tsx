// Development only: a Royal hotel suite (jacuzzi, spa, gaming lounge, minibar), no sign-in. Production builds answer 404.

import { notFound } from "next/navigation";
import { SuitePreview } from "./SuitePreview";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SuitePreview />;
}
