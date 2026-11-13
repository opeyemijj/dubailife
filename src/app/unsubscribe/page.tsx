import type { Metadata } from "next";
import { UnsubscribeButton } from "./UnsubscribeButton";

// The link at the bottom of the reminder emails. A button, not an instant unsubscribe on opening, so mail
// scanners that open links don't turn people's emails off.

export const metadata: Metadata = {
  title: { absolute: "Email reminders - Dubai Life" },
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { t } = await searchParams;
  const token = typeof t === "string" && /^[a-f0-9]{32}$/.test(t) ? t : null;
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-center space-y-4">
        <div className="text-4xl" aria-hidden>📧</div>
        <h1 className="text-2xl font-black">Reminder emails</h1>
        {token ? <UnsubscribeButton token={token} /> : (
          <p className="text-sm text-slate-400">This link isn&apos;t complete. You can turn reminder emails off in the game: open your settings and switch off <b>Reminder emails</b>.</p>
        )}
      </div>
    </div>
  );
}
