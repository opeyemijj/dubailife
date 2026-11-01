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
      title: "Dubai Life Wiki · How to play",
    };
  }
  return {
    title: `${hub.title} · Dubai Life Wiki`,
    description: hub.subtitle,
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

