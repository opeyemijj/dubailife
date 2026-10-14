import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";
import { PresenceTracker } from "@/components/PresenceTracker";
import { KnockListener } from "@/components/property/KnockListener";
import { MoneyListener } from "@/components/social/MoneyListener";
import { MessageAlerts } from "@/components/social/MessageAlerts";
import { Suspense } from "react";
import { SITE } from "@/lib/site";
import { ServiceWorker } from "@/components/pwa/ServiceWorker";
import { KeyboardShortcuts } from "@/components/common/KeyboardShortcuts";

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
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: SITE.keywords,
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "games",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: "/",
    locale: "en_AE",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  appleWebApp: { capable: true, title: SITE.shortName, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false, email: false, address: false },
  // Older iPhones still look for the apple-prefixed tag.
  other: { "apple-mobile-web-app-capable": "yes" },
};

// What search engines read about the app (schema.org).
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      description: SITE.description,
      inLanguage: "en",
    },
    {
      "@type": ["VideoGame", "WebApplication"],
      "@id": `${SITE.url}/#app`,
      name: SITE.name,
      url: SITE.url,
      description: SITE.description,
      image: `${SITE.url}/brand/icon-512.png`,
      applicationCategory: "GameApplication",
      operatingSystem: "Any (web browser)",
      genre: ["Life simulation", "Social", "Virtual world"],
      playMode: "MultiPlayer",
      gamePlatform: ["Web browser", "iOS", "Android"],
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "AED" },
      contentLocation: { "@type": "Place", name: "Downtown Dubai, United Arab Emirates" },
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
        <Suspense fallback={null}><MessageAlerts /></Suspense>
        {children}
        <KeyboardShortcuts />
      </body>
    </html>
  );
}
