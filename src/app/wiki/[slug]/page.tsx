import type { Metadata } from "next";
import { WikiView } from "@/components/wiki/WikiView";
import { WIKI_HUBS } from "@/components/wiki/WikiData";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const hub = WIKI_HUBS.find((h) => h.slug === slug);
  if (!hub) {
    return {
      title: "Dubai Life Game Wiki & Player Guide",
      description: "Official guides, tips, and mechanics for Dubai Life Game.",
      alternates: { canonical: `/wiki/${slug}` },
    };
  }
  const title = `${hub.title} — Dubai Life Game Wiki`;
  const description = `${hub.subtitle} Complete guide for ${hub.title} in Dubai Life Game (mydubailife.app).`;
  return {
    title,
    description,
    alternates: { canonical: `/wiki/${slug}` },
    openGraph: {
      title,
      description,
      url: `/wiki/${slug}`,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function WikiSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <WikiView slug={slug} />;
}

