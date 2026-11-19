import type { Metadata } from "next";
import { TuningGarage } from "@/components/cars/TuningGarage";

export const metadata: Metadata = {
  title: "Tuning garage",
  description: "Upgrade your car's engine, turbo and tyres for the Autodrome, and respray it.",
  robots: { index: false },
};

export default function Page() {
  return <TuningGarage />;
}
