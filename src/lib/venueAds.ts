"use client";

import { SITE } from "@/lib/site";

export type WallPanelId = "panel_main" | "panel_west" | "panel_east";

export interface WallPanelDef {
  id: WallPanelId;
  name: string;
  wall: "north" | "west" | "east";
  aspectRatio: string;
}

export const WALL_PANELS: WallPanelDef[] = [
  { id: "panel_main", name: "Main Stage / North Wall", wall: "north", aspectRatio: "16:9" },
  { id: "panel_west", name: "West Wall Lounge Screen", wall: "west", aspectRatio: "16:9" },
  { id: "panel_east", name: "East Wall VIP Screen", wall: "east", aspectRatio: "16:9" },
];

export interface VenueWallAd {
  venueId: string;
  panelId?: WallPanelId;
  headline: string;
  subtext: string;
  sponsorName: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  promoCode?: string;
  badge?: string;
  isOwnerAd: boolean; // Free for subscribed venue owners
  ownerUsername?: string;
  updatedAt?: string;
}

const STORAGE_PREFIX = "dubai_venue_ad_";

// Default authentic ads per venue
export const DEFAULT_VENUE_ADS: Record<string, VenueWallAd> = {
  "armani-prive": {
    venueId: "armani-prive",
    panelId: "panel_main",
    headline: "VIP Dom Pérignon Weekend Showcase",
    subtext: "Experience high-octane luxury with international guest DJs on the Burj Khalifa terrace.",
    sponsorName: "Armani Privé Lounge",
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
    ctaLabel: "Reserve VIP Table",
    ctaUrl: "https://www.armanihoteldubai.com",
    promoCode: "ARMANIVIP",
    badge: "Official Venue Promotion",
    isOwnerAd: true,
  },
  "the-guild": {
    venueId: "the-guild",
    panelId: "panel_main",
    headline: "The Chef's Tasting Menu & Raw Bar",
    subtext: "5-course European dining experience curated by Chef Tom Arnel in DIFC.",
    sponsorName: "The Guild DIFC",
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    ctaLabel: "Book Dinner Table",
    ctaUrl: "https://theguilddubai.com",
    promoCode: "GUILDDINE",
    badge: "Chef's Special",
    isOwnerAd: true,
  },
  "difc-trading": {
    venueId: "difc-trading",
    panelId: "panel_main",
    headline: "DFM Tech & Clean Energy Fund IPO",
    subtext: "Invest in premier Dubai public equities directly from your virtual terminal.",
    sponsorName: "Dubai Financial Market",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80",
    ctaLabel: "View Prospectus & Buy",
    ctaUrl: "https://www.dfm.ae",
    promoCode: "DFM2026",
    badge: "DFM Regulated Offering",
    isOwnerAd: true,
  },
  "aud-academy": {
    venueId: "aud-academy",
    panelId: "panel_main",
    headline: "Spring Career Accelerators & AI Bootcamps",
    subtext: "Fast-track your skills in Coding, Real Estate, and Wealth Management.",
    sponsorName: "Crescent University",
    imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
    ctaLabel: "Enroll in Short Courses",
    ctaUrl: "#courses",
    promoCode: "STUDENT50",
    badge: "Academic City",
    isOwnerAd: true,
  },
  "dubai-mall": {
    venueId: "dubai-mall",
    panelId: "panel_main",
    headline: "Fashion Avenue Private VIP Runway",
    subtext: "Exclusive haute couture showcase featuring Italian & French luxury houses.",
    sponsorName: "Fashion Avenue at Dubai Mall",
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
    ctaLabel: "Explore Showcase",
    ctaUrl: "https://thedubaimall.com",
    promoCode: "MALLVIP",
    badge: "Luxury Partner",
    isOwnerAd: true,
  },
};

/**
 * Retrieves the active wall ad for a venue and specific panel.
 */
export function getVenueWallAd(venueId: string, panelId: WallPanelId = "panel_main"): VenueWallAd {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${venueId}_${panelId}`);
      if (stored) return JSON.parse(stored);

      // Fallback to legacy single-panel key if panel_main
      if (panelId === "panel_main") {
        const legacy = localStorage.getItem(`${STORAGE_PREFIX}${venueId}`);
        if (legacy) return JSON.parse(legacy);
      }
    } catch {}
  }

  if (DEFAULT_VENUE_ADS[venueId] && panelId === "panel_main") {
    return DEFAULT_VENUE_ADS[venueId];
  }

  // Authentic panel defaults
  const panelTitle =
    panelId === "panel_west"
      ? "Dubai Skyline Cocktails & Sunset Lounge"
      : panelId === "panel_east"
      ? "Exclusive VIP Table & Bottle Service Packages"
      : "Exclusive Brand Showcase";

  return {
    venueId,
    panelId,
    headline: panelTitle,
    subtext: "Promote your brand or venue special directly to active Dubai citizens.",
    sponsorName: "Official Venue Partner",
    imageUrl:
      panelId === "panel_west"
        ? "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80"
        : panelId === "panel_east"
        ? "https://images.unsplash.com/photo-1574096079513-d8259312b785?auto=format&fit=crop&w=800&q=80"
        : "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
    ctaLabel: "Learn More",
    ctaUrl: SITE.url,
    badge: "Official Sponsor",
    isOwnerAd: true,
  };
}

/**
 * Saves a custom in-venue wall ad for a specific panel.
 */
export function saveVenueWallAd(ad: VenueWallAd): void {
  if (typeof window === "undefined") return;
  try {
    const panelId = ad.panelId || "panel_main";
    const updated = {
      ...ad,
      panelId,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${STORAGE_PREFIX}${ad.venueId}_${panelId}`, JSON.stringify(updated));
    // Also save as default if panel_main
    if (panelId === "panel_main") {
      localStorage.setItem(`${STORAGE_PREFIX}${ad.venueId}`, JSON.stringify(updated));
    }
    window.dispatchEvent(
      new CustomEvent("dubai:venue-ad-updated", { detail: { venueId: ad.venueId, panelId } })
    );
  } catch {}
}

/**
 * Checks if the current citizen is considered the owner or subscriber of this venue.
 */
export function isUserVenueOwner(venueId: string, citizen: any): boolean {
  if (!citizen) return false;
  if (citizen.role === "admin" || citizen.isVenueOwner) return true;
  if (citizen.ownedVenues && Array.isArray(citizen.ownedVenues)) {
    return citizen.ownedVenues.includes(venueId);
  }
  const storedAd = getVenueWallAd(venueId, "panel_main");
  if (storedAd.ownerUsername && storedAd.ownerUsername === citizen.username) {
    return true;
  }
  return false;
}
