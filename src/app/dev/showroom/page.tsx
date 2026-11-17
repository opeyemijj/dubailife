// Development only: a car dealership (the colour picker and the car on the turntable), no sign-in. ?id=<dealer>.
// Production builds answer 404.

import { notFound } from "next/navigation";
import { ShowroomPreview } from "./ShowroomPreview";

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { id } = await searchParams;
  return <ShowroomPreview id={id ?? "lamborghini-dubai"} />;
}
