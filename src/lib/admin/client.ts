"use client";

// Whether the signed-in user is an admin, for showing admin-only controls. The database enforces
// the real permission on every admin action; this only decides what to show.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

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
