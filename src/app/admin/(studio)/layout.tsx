import { verifyAdmin } from "@/lib/admin/dal";

export const metadata = { title: "Map Studio", robots: { index: false } };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await verifyAdmin();
  return children;
}
