// Server-only (uses request cookies): admin checks for pages and server actions.
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type AdminRole = "super_admin" | "admin" | "finance" | "moderator";

/** The signed-in admin, or null. Checked against the database on every request. */
export const getAdmin = cache(async () => {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: role } = await supabase.rpc("admin_role");
  return role ? { id: user.id, email: user.email ?? "", role: role as AdminRole } : null;
});

/** For admin pages and actions: the admin, or a redirect to the admin login. */
export async function verifyAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
