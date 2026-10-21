import { verifyAdmin } from "@/lib/admin/dal";
import { redirect } from "next/navigation";

export const metadata = { title: "Map Studio", robots: { index: false } };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const admin = await verifyAdmin();
  if (admin.role !== "super_admin") {
    redirect("/admin");
  }
  return children;
}
