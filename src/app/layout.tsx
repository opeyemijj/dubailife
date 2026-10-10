import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], display: 'swap' });

export const metadata: Metadata = {
  title: "COME TO DUBAI",
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
        {children}
      </body>
    </html>
  );
}
