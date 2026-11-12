import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCampus } from "@/lib/city/academic";
import CampusHubClient from "./CampusHubClient";

type Params = { params: Promise<{ campusId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { campusId } = await params;
  const campus = getCampus(campusId);
  if (!campus) return { title: "Campus not found", robots: { index: false } };
  const title = `${campus.name} — Dubai Life Academic City`;
  const description = `${campus.description} Explore degree programs, courses, and certifications at ${campus.name} in Dubai Life Game.`;
  return {
    title,
    description,
    alternates: { canonical: `/academics/${campusId}` },
    openGraph: {
      title,
      description,
      url: `/academics/${campusId}`,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function CampusHubPage({ params }: Params) {
  const { campusId } = await params;
  const campus = getCampus(campusId);
  if (!campus) notFound();
  return <CampusHubClient campusId={campusId} />;
}
