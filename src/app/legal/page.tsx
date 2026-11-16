import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LEGAL_PAGES } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: { absolute: "Legal & Company - Dubai Life" },
  description: "Dubai Life's Terms, Privacy Policy, Cookie Policy, Community Guidelines, purchase and prize rules, data deletion, contact and investor information.",
  alternates: { canonical: "/legal" },
};

export default function LegalHubPage() {
  return (
    <LegalPage title="Legal & company" kicker="Dubai Life" intro={<p>Everything about how Dubai Life works as a service: the rules, your data, and who we are.</p>}>
      <div className="grid sm:grid-cols-2 gap-3">
        {LEGAL_PAGES.map((p) => (
          <Link key={p.href} href={p.href} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-emerald-500/50">
            <p className="font-black text-white">{p.title}</p>
            <p className="text-sm text-slate-400">{p.blurb}</p>
          </Link>
        ))}
      </div>
    </LegalPage>
  );
}
