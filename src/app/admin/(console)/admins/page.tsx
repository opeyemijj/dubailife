import { redirect } from "next/navigation";
import { verifyAdmin } from "@/lib/admin/dal";
import { Admins } from "@/components/admin/console/Admins";

export default async function Page() {
  const admin = await verifyAdmin();
  if (admin.role !== "super_admin") redirect("/admin");
  return <Admins myId={admin.id} />;
}
