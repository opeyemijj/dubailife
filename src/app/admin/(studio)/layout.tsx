import { verifyAdmin } from "@/lib/admin/dal";

export const metadata = { title: "Map studio · Come to Dubai", robots: { index: false } };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await verifyAdmin();
  return children;
}
