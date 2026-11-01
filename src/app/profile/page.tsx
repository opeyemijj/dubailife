"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { openLife } from "@/components/life/LifeHub";

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/explore");
    const t = setTimeout(() => openLife("profile"), 80);
    return () => clearTimeout(t);
  }, [router]);

  return <main className="min-h-screen bg-slate-950" />;
}
