import { RaceRoom } from "@/components/racing/RaceRoom";

// One horse, camel or superbike race (its sport is the race's own).
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RaceRoom code={code} />;
}
