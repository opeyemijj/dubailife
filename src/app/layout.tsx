import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";
import { PresenceTracker } from "@/components/PresenceTracker";
import { KnockListener } from "@/components/property/KnockListener";
import { MoneyListener } from "@/components/social/MoneyListener";
import { MessageAlerts } from "@/components/social/MessageAlerts";
import { Suspense } from "react";

const fredoka = Fredoka({ subsets: ["latin"], display: 'swap' });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Dubai Life",
  description: "Virtual City × Social Network × Life Simulation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`antialiased min-h-screen bg-background text-foreground ${fredoka.className}`}>
        <PresenceTracker />
        <KnockListener />
        <MoneyListener />
        <Suspense fallback={null}><MessageAlerts /></Suspense>
        {children}
      </body>
    </html>
  );
}
