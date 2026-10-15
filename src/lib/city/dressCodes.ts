// Venue dress code definitions, suggestions, and guidelines for Come to Dubai.

import type { Venue } from "./types";

export type DressCodeType = "club_chic" | "smart_casual" | "beachwear" | "fashion_forward" | "casual_modest";

export interface VenueDressCode {
  type: DressCodeType;
  title: string;
  badge: string;
  icon: string;
  recommendation: string;
  color: string;
}

export const DRESS_CODES: Record<DressCodeType, VenueDressCode> = {
  club_chic: {
    type: "club_chic",
    title: "Club Chic / Glamorous",
    badge: "Nightlife Glamour",
    icon: "✨",
    recommendation: "Upscale nightlife attire recommended. High heels, stylish dresses, collared shirts, tailored jackets. No sportswear, athletic shorts or flip-flops.",
    color: "#d946ef",
  },
  smart_casual: {
    type: "smart_casual",
    title: "Smart Casual / Elegant",
    badge: "Upscale Dining",
    icon: "👔",
    recommendation: "Sophisticated attire. Collared shirts, tailored trousers, elegant evening dresses. Closed-toe footwear recommended.",
    color: "#3b82f6",
  },
  beachwear: {
    type: "beachwear",
    title: "Beachwear & Resort Casual",
    badge: "Resort & Beach",
    icon: "🩳",
    recommendation: "High-end swimwear, linen shirts, designer sunglasses, and breezy resort wear welcomed on the deck.",
    color: "#06b6d4",
  },
  fashion_forward: {
    type: "fashion_forward",
    title: "Trendsetter / Fashion Forward",
    badge: "High Fashion",
    icon: "👗",
    recommendation: "Showcase your finest Dubai runway looks, haute couture, luxury accessories, or sharp streetwear.",
    color: "#f59e0b",
  },
  casual_modest: {
    type: "casual_modest",
    title: "Modest & Casual",
    badge: "City Standard",
    icon: "👕",
    recommendation: "Comfortable and respectful attire. Shoulders and knees covered in traditional and public family areas.",
    color: "#10b981",
  },
};

/** Determines the suggested dress code for any venue */
export function getVenueDressCode(venue: Venue): VenueDressCode {
  const name = venue.name.toLowerCase();
  const cat = venue.category.toLowerCase();
  const layout = venue.layout;

  // Nightclubs & Lounges
  if (
    layout === "club" ||
    cat.includes("club") ||
    cat.includes("night") ||
    cat.includes("lounge") ||
    name.includes("prive") ||
    name.includes("kiza") ||
    name.includes("ting irie") ||
    name.includes("zabeel") ||
    name.includes("white") ||
    name.includes("1oak")
  ) {
    return DRESS_CODES.club_chic;
  }

  // Beach clubs & Pools
  if (
    layout === "beach" ||
    layout === "pooldeck" ||
    layout === "waterpark" ||
    cat.includes("beach") ||
    cat.includes("pool") ||
    name.includes("beach") ||
    name.includes("nikki") ||
    name.includes("drift") ||
    name.includes("barasti")
  ) {
    return DRESS_CODES.beachwear;
  }

  // Fine Dining & Luxury Restaurants
  if (
    layout === "dining" ||
    cat.includes("restaurant") ||
    cat.includes("dining") ||
    name.includes("atmosphere") ||
    name.includes("nobu") ||
    name.includes("zuma") ||
    name.includes("guild") ||
    name.includes("cipriani") ||
    name.includes("cavalli")
  ) {
    return DRESS_CODES.smart_casual;
  }

  // Fashion & Luxury Boutiques
  if (
    layout === "boutique" ||
    layout === "jewellery" ||
    cat.includes("fashion") ||
    cat.includes("luxury")
  ) {
    return DRESS_CODES.fashion_forward;
  }

  return DRESS_CODES.casual_modest;
}
