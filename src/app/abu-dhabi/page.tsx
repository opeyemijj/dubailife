"use client";

// Abu Dhabi's map: its own city in the same style as Dubai's (lib/city/abuDhabi), reached by air (lib/flights).
import { CityMapScreen } from "@/components/map/CityMapScreen";

export default function AbuDhabiPage() {
  return <CityMapScreen city="abu-dhabi" />;
}
