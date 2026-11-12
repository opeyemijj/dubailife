import type { Metadata } from "next";
import { MarathonPage } from "@/components/marathon/MarathonPage";

export const metadata: Metadata = {
  title: "Dubai Life Marathon — Friday 50,000 AED Live Race & Tournament",
  description: "Run the official Dubai Life Marathon with thousands of players: race past Burj Khalifa, Sheikh Zayed Road, and Museum of the Future. Free to enter every Friday at 7pm Dubai time.",
  alternates: { canonical: "/marathon" },
  openGraph: {
    title: "Dubai Life Marathon — Friday 50,000 AED Live Race",
    description: "Run the official Dubai Life Marathon with players from around the world. Free to enter every Friday.",
    url: "/marathon",
  },
  twitter: {
    title: "Dubai Life Marathon — Friday 50,000 AED Live Race",
    description: "Run the official Dubai Life Marathon with players from around the world.",
  },
};

export default function Page() {
  return <MarathonPage />;
}
