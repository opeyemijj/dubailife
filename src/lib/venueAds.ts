"use client";

export interface VenueWallAd {
  venueId: string;
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
    headline: "Spring Career Accelerators & AI Bootcamps",
    subtext: "Fast-track your skills in Coding, Real Estate, and Wealth Management.",
    sponsorName: "American University in Dubai",
    imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
    ctaLabel: "Enroll in Short Courses",
    ctaUrl: "#courses",
    promoCode: "STUDENT50",
    badge: "Accredited Academy",
    isOwnerAd: true,
  },
  "dubai-mall": {
    venueId: "dubai-mall",
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
 * Retrieves the active wall ad for a venue.
 * Checks localStorage first (for owner customization), then fallback defaults.
 */
export function getVenueWallAd(venueId: string): VenueWallAd {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${venueId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
  }

  if (DEFAULT_VENUE_ADS[venueId]) {
    return DEFAULT_VENUE_ADS[venueId];
  }

  // Generic fallback if not explicitly defined
  return {
    venueId,
    headline: "Exclusive Brand Showcase",
    subtext: "Promote your brand or venue special directly to thousands of active Dubai citizens.",
    sponsorName: "Official Venue Partner",
    imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
    ctaLabel: "Learn More",
    ctaUrl: "https://cometodubai.com",
    badge: "Venue Sponsor",
    isOwnerAd: true,
  };
}

/**
 * Saves a custom in-venue wall ad.
 * Venue owners with subscriptions publish for FREE.
 */
export function saveVenueWallAd(ad: VenueWallAd): void {
  if (typeof window === "undefined") return;
  try {
    const updated = {
      ...ad,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${STORAGE_PREFIX}${ad.venueId}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("dubai:venue-ad-updated", { detail: { venueId: ad.venueId } }));
  } catch {}
}

/**
 * Checks if the current citizen is considered the owner or subscriber of this venue.
 */
export function isUserVenueOwner(venueId: string, citizen: any): boolean {
  if (!citizen) return false;
  // Admin or user has ownership record
  if (citizen.role === "admin" || citizen.isVenueOwner) return true;
  if (citizen.ownedVenues && Array.isArray(citizen.ownedVenues)) {
    return citizen.ownedVenues.includes(venueId);
  }
  // Check if owner username matches
  const storedAd = getVenueWallAd(venueId);
  if (storedAd.ownerUsername && storedAd.ownerUsername === citizen.username) {
    return true;
  }
  return false;
}
