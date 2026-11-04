import { Suspense } from "react";
import { StreetPage } from "@/components/street/StreetPage";

export const metadata = { title: "Out on the street · Dubai Life" };

export default function Page() {
  return <Suspense fallback={null}><StreetPage /></Suspense>;
}
