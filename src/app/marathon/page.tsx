import type { Metadata } from "next";
import { MarathonPage } from "@/components/marathon/MarathonPage";

export const metadata: Metadata = {
  title: "Dubai Life Marathon · every Friday 7pm",
  description: "Run the Dubai Life Marathon with players from everywhere: past Burj Khalifa, Sheikh Zayed Road and the Museum of the Future. Free to enter, every Friday at 7pm Dubai time.",
  alternates: { canonical: "/marathon" },
};

export default function Page() {
  return <MarathonPage />;
}
