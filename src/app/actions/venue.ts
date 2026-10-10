"use server";

import { mapSeed } from "@/data/mapSeed";

export async function getVenues() {
  return mapSeed;
}

export async function createVenue(data: {
  name: string;
  description: string;
  type: string;
  virtualX: number;
  virtualY: number;
}) {
  return { success: true };
}
