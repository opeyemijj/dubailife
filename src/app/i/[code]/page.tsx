import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { InvitePage } from "@/components/invite/InvitePage";
import type { InviteView } from "@/lib/invites";

// An invite link (mydubailife.app/i/<code>). Everyone lands here first, signed in or not: what it is, who's hosting
// and who's going, then the steps to get there. The preview text is what shows when the link is shared in a chat.

type Props = { params: Promise<{ code: string }> };

async function load(code: string): Promise<InviteView | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data } = await db.rpc("invite_view", { p_code: code });
    return (data as InviteView | null) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const i = await load(code);
  if (!i) return { title: "Invite · Dubai Life", robots: { index: false } };
  const title = `@${i.host?.username ?? "A friend"} invited you: ${i.title}`;
  const description = `${i.label} · ${new Date(i.startsAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai", weekday: "short", hour: "numeric", minute: "2-digit" })} Dubai time · ${i.going} going. Join on Dubai Life.`;
  return { title, description, robots: { index: false }, openGraph: { title, description }, twitter: { card: "summary", title, description } };
}

export default async function Page({ params }: Props) {
  const { code } = await params;
  return <InvitePage code={code.toUpperCase()} initial={await load(code)} />;
}
