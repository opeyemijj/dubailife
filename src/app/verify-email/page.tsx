"use client";

// Opens the link from the verification email. Works signed in or not, on any device.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { sendVerification, verifyEmail } from "@/lib/email";
import { useCitizen } from "@/lib/citizenStore";

function Verify() {
  const token = useSearchParams().get("token") ?? "";
  const { citizen } = useCitizen();
  const [state, setState] = useState<"checking" | "ok" | "expired" | "invalid">("checking");
  const [name, setName] = useState("");
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    void verifyEmail(token).then((r) => { if (r.ok) { setName(r.username ?? ""); setState("ok"); } else setState(r.error ?? "invalid"); });
  }, [token]);

  return (
    <main className="min-h-[100dvh] bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-5xl">{state === "ok" ? "✅" : state === "checking" ? "📧" : "⚠️"}</div>
        <h1 className="text-2xl font-black">
          {state === "checking" ? "Checking your link…" : state === "ok" ? "Email verified!" : state === "expired" ? "This link has expired" : "This link doesn't work"}
        </h1>
        <p className="text-sm text-slate-300">
          {state === "ok" ? `Thanks${name ? `, @${name}` : ""}. Your account is safer, and you're now eligible for tournament prizes and invite rewards.`
            : state === "checking" ? "One moment."
            : "Verification links work once, for 24 hours. Send yourself a new one below."}
        </p>
        {state === "ok" && <Link href="/explore" className="block h-12 leading-[3rem] rounded-2xl bg-emerald-500 text-slate-950 font-black">Back to Dubai</Link>}
        {(state === "expired" || state === "invalid") && (citizen
          ? <button onClick={async () => setNote((await sendVerification()).text)} className="w-full h-12 rounded-2xl bg-emerald-500 text-slate-950 font-black">Send a new link</button>
          : <Link href="/?login=true" className="block h-12 leading-[3rem] rounded-2xl bg-white text-slate-950 font-black">Log in to send a new link</Link>)}
        {note && <p className="text-sm font-bold text-emerald-300">{note}</p>}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><Verify /></Suspense>;
}
