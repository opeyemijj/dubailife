"use client";

// Whether the signed-in user is an admin, for showing admin-only controls. The database enforces
// the real permission on every admin action; this only decides what to show.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type AdminRole = "super_admin" | "admin" | "finance" | "moderator";

export function useIsAdmin() {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    const db = supabase();
    const check = () => db.rpc("is_admin").then(({ data }) => setAdmin(!!data));
    void check();
    const { data: sub } = db.auth.onAuthStateChange(() => { void check(); });
    return () => sub.subscription.unsubscribe();
  }, []);
  return admin;
}

export function useAdminRole(): AdminRole | null {
  const [role, setRole] = useState<AdminRole | null>(null);
  useEffect(() => {
    const db = supabase();
    const check = async () => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) {
        setRole(null);
        return;
      }
      const { data } = await db.rpc("admin_role");
      setRole((data as AdminRole) || null);
    };
    void check();
    const { data: sub } = db.auth.onAuthStateChange(() => { void check(); });
    return () => sub.subscription.unsubscribe();
  }, []);
  return role;
}

export function useIsSuperAdmin() {
  const [isSuper, setIsSuper] = useState(false);
  useEffect(() => {
    const db = supabase();
    const check = async () => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) {
        setIsSuper(false);
        return;
      }
      const { data } = await db.rpc("admin_role");
      setIsSuper(data === "super_admin");
    };
    void check();
    const { data: sub } = db.auth.onAuthStateChange(() => { void check(); });
    return () => sub.subscription.unsubscribe();
  }, []);
  return isSuper;
}
