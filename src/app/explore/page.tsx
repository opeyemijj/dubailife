"use client";

// Dubai's map (other cities have their own pages: src/app/abu-dhabi).
import { CityMapScreen } from "@/components/map/CityMapScreen";

export default function ExplorePage() {
  return <CityMapScreen city="dubai" />;
}
