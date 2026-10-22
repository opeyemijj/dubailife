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
import { Suspense } from "react";
import { SITE } from "@/lib/site";
import { ServiceWorker } from "@/components/pwa/ServiceWorker";
import { KeyboardShortcuts } from "@/components/common/KeyboardShortcuts";
import { LifeHub } from "@/components/life/LifeHub";

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
    default: "Come To Dubai — Free 3D Virtual Dubai Simulator & City Game",
    template: "%s - Come To Dubai",
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
    languages: {
      "en-AE": "/",
      "en-US": "/",
      "ar-AE": "/",
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: "Come To Dubai — Free 3D Virtual Dubai Simulator & City Game",
    description: SITE.description,
    url: "/",
    locale: "en_AE",
    alternateLocale: ["en_US", "ar_AE"],
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Come To Dubai — Free 3D Virtual City & Life Simulator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Come To Dubai — Free 3D Virtual Dubai Simulator & City Game",
    description: SITE.description,
    images: ["/twitter-image"],
    creator: "@cometodubai",
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
      name: "Come To Dubai",
      alternateName: ["cometodubai.app", "Come to Dubai"],
      description: SITE.description,
      inLanguage: ["en", "ar"],
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE.url}/explore?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${SITE.url}/#organization`,
      name: "Come To Dubai",
      url: SITE.url,
      logo: {
        "@type": "ImageObject",
        url: `${SITE.url}/brand/icon-512.png`,
        width: 512,
        height: 512,
      },
      sameAs: [
        "https://twitter.com/cometodubai",
      ],
    },
    {
      "@type": ["VideoGame", "SoftwareApplication", "WebApplication"],
      "@id": `${SITE.url}/#app`,
      name: "Come To Dubai",
      alternateName: ["cometodubai.app", "Come to Dubai Virtual City", "Dubai Life Simulator"],
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
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        ratingCount: "2840",
        bestRating: "5",
        worstRating: "1",
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
        "17 Free Multiplayer Arcade Games (Ludo, Chess, Pool, Tycoon)",
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
        {children}
        <KeyboardShortcuts />
        <LifeHub />
      </body>
    </html>
  );
}
