import type { Metadata, Viewport } from "next";
import { PhoneFab } from "@/components/layout/PhoneFab";
import { ConnectionSaver } from "@/lib/idle";
import { TapLayer } from "@/components/layout/SideBar";
import { PartySheetHost } from "@/components/invite/PartySheetHost";
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
import { LoveListener, MoveInListener } from "@/components/love/LoveListener";
import { GameInviteListener } from "@/components/games/GameInviteListener";
import { MarathonBanner } from "@/components/marathon/MarathonBanner";
import { Custody } from "@/components/cars/Custody";
import { FineNotice } from "@/components/cars/FineNotice";
import { DecorFirstNudge } from "@/components/home/MoveInGuide";
import { LogoutConfirm } from "@/components/layout/LogoutConfirm";
import { BackToParty } from "@/components/invite/BackToParty";
import { LiveSpaceBanner } from "@/components/social/LiveSpaceBanner";
import { GoalSetup } from "@/components/goals/GoalSetup";
import { DecorJobAlert } from "@/components/home/DecorJobAlert";
import { NextStep } from "@/components/goals/NextStep";
import { MorningScene } from "@/components/goals/MorningScene";
import { Payday } from "@/components/goals/Payday";
import { EmbedBridge, OutsidePhone } from "@/components/layout/Embed";
import { ClarityAnalytics } from "@/components/analytics/ClarityAnalytics";
import { FloatingSpaceOverlay } from "@/components/social/FloatingSpaceOverlay";

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
    default: "Dubai Life (MyDubaiLife.app) — Official 3D Dubai Life Game & Virtual World",
    template: "%s | Dubai Life (MyDubaiLife.app)",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: SITE.keywords,
  authors: [
    { name: SITE.name, url: SITE.url },
    { name: "Opeyemi Ishola (Brain)", url: SITE.url },
  ],
  creator: "Opeyemi Ishola (Brain) — Dubai Life",
  publisher: SITE.name,
  category: "games",
  classification: "Virtual World / Life Simulation / Multiplayer Games",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: "Dubai Life (MyDubaiLife.app) — Official 3D Dubai Life Game & Virtual World",
    description: SITE.description,
    url: "/",
    locale: "en_AE",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Dubai Life (MyDubaiLife.app) — Official 3D Dubai Life Game",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dubai Life (MyDubaiLife.app) — Official 3D Dubai Life Game & Virtual World",
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
        "Apartment & Villa Customization, Furniture Placement & Pool Parties",
        "Real-Time Social Chat, Live Audio Spaces & Cultural Weddings",
        "Push Notifications on Home Screen PWA",
        "Zero-Limit Virtual Economy with Instant AED Transfers",
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE.url}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "What is the official Dubai Life game?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Dubai Life (hosted officially at mydubailife.app) is a free 3D multiplayer life simulation game set in Dubai where you customize your 3D citizen, own Palm Jumeirah villas and Marina apartments, drive supercars, host cultural weddings and pool parties, join live audio Spaces, and build your fortune in AED.",
          },
        },
        {
          "@type": "Question",
          name: "How do I play Dubai Life online for free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Visit https://mydubailife.app on any phone, tablet, or computer browser to start playing Dubai Life instantly with zero download required, or install it to your home screen as an app.",
          },
        },
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
        <ClarityAnalytics />
        <ServiceWorker />
        <OutsidePhone>
          <PresenceTracker />
          <KnockListener />
          <MoneyListener />
          <FriendRequestListener />
          <Suspense fallback={null}><MessageAlerts /></Suspense>
          <NotificationPrompt />
          <PushCoach />
          <AgeGate />
          <NextStep />
          <ScamPhone />
          <DiscoverHost />
        </OutsidePhone>
        <EmbedBridge />
        <LogoutConfirm />
        {children}
        <LifeHub />
        <OutsidePhone>
          <KeyboardShortcuts />
          <FloatingSpaceOverlay />
          <LiveSpaceBanner />
          <BackToParty />
          <PhoneOverlay />
          <PhoneFab />
          <ConnectionSaver />
          <PartySheetHost />
          <TapLayer />
          <HudSheets />
          <LoveListener />
          <MoveInListener />
          <GameInviteListener />
          <MarathonBanner />
          <Custody />
          <FineNotice />
          <GoalSetup />
          <DecorFirstNudge />
          <DecorJobAlert />
          <MorningScene />
          <Payday />
        </OutsidePhone>
      </body>
    </html>
  );
}
