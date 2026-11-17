import { Suspense } from "react";
import { DrivePage } from "@/components/drive/DrivePage";

export const metadata = { title: "On the road · Dubai Life" };

export default function Page() {
  return <Suspense fallback={null}><DrivePage /></Suspense>;
}
