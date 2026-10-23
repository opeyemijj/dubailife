import { verifyAdmin } from "@/lib/admin/dal";
import { MyAccount } from "@/components/admin/console/MyAccount";

export default async function Page() {
  const admin = await verifyAdmin();
  return <MyAccount email={admin.email} role={admin.role} />;
}
