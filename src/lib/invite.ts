"use client";

// Inviting friends: the phone's share sheet, or the link copied where there isn't one.

import { SITE } from "@/lib/site";

export async function inviteFriends(username?: string): Promise<"shared" | "copied" | "failed"> {
  const url = `${window.location.origin}/${username ? `?ref=${encodeURIComponent(username)}` : ""}`;
  const text = `Come and live in Dubai with me on ${SITE.name}! It's only fun with friends.`;
  if (navigator.share) {
    try { await navigator.share({ title: SITE.name, text, url }); return "shared"; } catch { /* cancelled, or not allowed */ }
  }
  try { await navigator.clipboard.writeText(`${text} ${url}`); return "copied"; } catch { return "failed"; }
}
