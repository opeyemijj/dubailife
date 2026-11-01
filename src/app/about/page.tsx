import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { MIN_AGE } from "@/lib/age";
import { AboutView } from "@/components/about/AboutView";

const TITLE = "What is Dubai Life? Live your Dubai story online";
const DESCRIPTION =
  "Dubai Life is a free online life simulation set in Dubai, created by Opeyemi Ishola (fondly called Brain). Rent a flat, get a job, ride the Metro, shop at Dubai Mall, host Live Audio Spaces, play games and make real friends — in your browser.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} - Dubai Life` },
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/about" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

const FAQ: Array<[string, string]> = [
  [
    "Is Dubai Life free?",
    "Yes. Dubai Life is free to play in any modern browser on phone, tablet or computer. You can also add it to your home screen like an app.",
  ],
  [
    "Do I need to download anything?",
    `No. Open ${SITE.domain} and play. On iPhone or Android you can install it from the browser for a full-screen app with notifications.`,
  ],
  [
    "Is it the real Dubai?",
    "It's a virtual Dubai drawn from the real city: real neighbourhoods, landmarks, metro stations and the kinds of places people go. Prices are in AED and life runs on Dubai time.",
  ],
  [
    "Who can play?",
    `Anyone aged ${MIN_AGE} or over. You make an avatar, choose your first home and budget, and start your Dubai life straight away.`,
  ],
  [
    "Can I play with friends?",
    "Yes. Invite friends with your link, host a Live Audio Space, meet in the city, visit each other's homes and play Ludo, Chess, 3D Pool and the other games together.",
  ],
];

const STRUCTURED = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": `${SITE.url}/about#page`,
      url: `${SITE.url}/about`,
      name: TITLE,
      description: DESCRIPTION,
      isPartOf: { "@id": `${SITE.url}/#website` },
      about: { "@id": `${SITE.url}/#app` },
      author: {
        "@type": "Person",
        name: "Opeyemi Ishola",
        alternateName: "Brain",
        url: "https://www.linkedin.com/in/opeyemijj/",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Dubai Life", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "About", item: `${SITE.url}/about` },
      ],
    },
  ],
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED) }}
      />
      <AboutView />
    </>
  );
}
