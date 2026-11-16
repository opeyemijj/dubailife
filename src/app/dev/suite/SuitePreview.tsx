"use client";

import { useState } from "react";
import { SuiteRoom } from "@/components/hotel/SuiteRoom";

export function SuitePreview() {
  const [toast, setToast] = useState<string | null>(null);
  return (
    <main className="fixed inset-0">
      <SuiteRoom suite="royal" look={{ gender: "woman" }} onToast={setToast} />
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full bg-slate-900 text-white px-4 py-2 text-sm font-bold">{toast}</div>}
    </main>
  );
}
