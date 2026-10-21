import { verifyAdmin } from "@/lib/admin/dal";
import { AdminShell } from "@/components/admin/console/AdminShell";

export const metadata = { title: "Admin Console", robots: { index: false } };

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await verifyAdmin();
  return <AdminShell email={admin.email} role={admin.role}>{children}</AdminShell>;
}
