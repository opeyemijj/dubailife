import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCourse, getCampus } from "@/lib/city/academic";
import CourseViewerClient from "./CourseViewerClient";

type Params = { params: Promise<{ courseId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { courseId } = await params;
  const course = getCourse(courseId);
  if (!course) return { title: "Course not found", robots: { index: false } };
  const campus = getCampus(course.institutionId);
  const title = `${course.title} — Dubai Life Academic City`;
  const description = `${course.tagline} Study ${course.title} at ${campus?.name ?? "Dubai Academic City"} in Dubai Life Game.`;
  return {
    title,
    description,
    alternates: { canonical: `/academics/course/${courseId}` },
    openGraph: {
      title,
      description,
      url: `/academics/course/${courseId}`,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function CourseViewerPage({ params }: Params) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  if (!course) notFound();
  return <CourseViewerClient courseId={courseId} />;
}
