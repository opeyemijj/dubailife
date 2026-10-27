import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";
import { PresenceTracker } from "@/components/PresenceTracker";
import { KnockListener } from "@/components/property/KnockListener";
import { MoneyListener } from "@/components/social/MoneyListener";
import { MessageAlerts } from "@/components/social/MessageAlerts";
import { FriendRequestListener } from "@/components/social/FriendRequestListener";
import { NotificationPrompt } from "@/components/pwa/NotificationPrompt";
import { PushCoach } from "@/components/pwa/PushCoach";
import { AgeGate } from "@/components/safety/AgeGate";
import { FirstDay } from "@/components/life/FirstDay";
import { ScamPhone } from "@/components/safety/ScamPhone";
import { DiscoverHost } from "@/components/guide/Discover";
import { Suspense } from "react";
import { SITE } from "@/lib/site";
import { GAMES } from "@/lib/games/registry";
import { ServiceWorker } from "@/components/pwa/ServiceWorker";
import { KeyboardShortcuts } from "@/components/common/KeyboardShortcuts";
import { LifeHub } from "@/components/life/LifeHub";
import { PhoneOverlay } from "@/components/layout/PhoneOverlay";
import { HudSheets } from "@/components/layout/HudSheets";

const fredoka = Fredoka({ subsets: ["latin"], display: 'swap' });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: SITE.themeColor },
    { media: "(prefers-color-scheme: light)", color: SITE.themeColor },
  ],
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Dubai Life — Live Your Dubai Story, Free Online",
    template: "%s - Dubai Life",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: SITE.keywords,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "games",
  classification: "Virtual World / Life Simulation / Multiplayer Games",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: "Dubai Life — Live Your Dubai Story, Free Online",
    description: SITE.description,
    url: "/",
    locale: "en_AE",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Dubai Life — a Sims-style life game set in Dubai",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dubai Life — Live Your Dubai Story, Free Online",
    description: SITE.description,
    images: ["/twitter-image"],
    site: "@dubailifeapp",
    creator: "@dubailifeapp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: SITE.shortName,
    statusBarStyle: "black-translucent",
  },
  // Ownership checks for Google Search Console and Bing Webmaster Tools (set the codes in the environment).
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  formatDetection: { telephone: false, email: false, address: false },
  // Older iPhones still look for the apple-prefixed tag.
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
};

// What search engines read about the app (schema.org JSON-LD).
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: "Dubai Life",
      alternateName: ["mydubailife.app", "Dubai Life Game"],
      description: SITE.description,
      inLanguage: "en",
    },
    {
      "@type": "Organization",
      "@id": `${SITE.url}/#organization`,
      name: "Dubai Life",
      url: SITE.url,
      logo: {
        "@type": "ImageObject",
        url: `${SITE.url}/brand/icon-512.png`,
        width: 512,
        height: 512,
      },
      sameAs: SITE.socials.map((x) => x.href),
    },
    {
      "@type": ["VideoGame", "SoftwareApplication", "WebApplication"],
      "@id": `${SITE.url}/#app`,
      name: "Dubai Life",
      alternateName: ["mydubailife.app", "Dubai Life Game", "Dubai Life Simulator"],
      url: SITE.url,
      description: SITE.description,
      image: `${SITE.url}/brand/icon-512.png`,
      applicationCategory: "GameApplication",
      operatingSystem: "All modern browsers, iOS (PWA), Android (PWA), macOS, Windows",
      browserRequirements: "Requires WebGL, WebSockets",
      genre: [
        "Life simulation",
        "Virtual world",
        "Social multiplayer",
        "Role-playing game",
        "City simulator",
      ],
      playMode: "MultiPlayer",
      gamePlatform: ["Web browser", "iOS", "Android", "Desktop"],
      isAccessibleForFree: true,
      contentRating: "Everyone",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "AED",
        availability: "https://schema.org/InStock",
      },
      contentLocation: {
        "@type": "Place",
        name: "Downtown Dubai, United Arab Emirates",
        geo: {
          "@type": "GeoCoordinates",
          latitude: 25.1972,
          longitude: 55.2744,
        },
      },
      featureList: [
        "Interactive 3D Downtown Dubai, Burj Khalifa & Dubai Mall",
        "Custom 3D Avatar Creation with Outfits and Styles",
        `${GAMES.length} free multiplayer games (Ludo, Chess, Pool and more)`,
        "Apartment Customization, Furniture Placement & Renting",
        "Real-Time Social Chat, Messaging & Door Knocks",
        "Push Notifications on Home Screen PWA",
        "Virtual Economy with AED Transfers",
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`antialiased min-h-screen bg-background text-foreground ${fredoka.className}`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c") }} />
        <ServiceWorker />
        <PresenceTracker />
        <KnockListener />
        <MoneyListener />
        <FriendRequestListener />
        <Suspense fallback={null}><MessageAlerts /></Suspense>
        <NotificationPrompt />
        <PushCoach />
        <AgeGate />
        <FirstDay />
        <ScamPhone />
        <DiscoverHost />
        {children}
        <KeyboardShortcuts />
        <LifeHub />
        <PhoneOverlay />
        <HudSheets />
      </body>
    </html>
  );
}
