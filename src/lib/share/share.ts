"use client";

// Sharing a moment: native share sheet on phones (WhatsApp, Instagram…), copy-the-link elsewhere.

import type { MomentId } from "./moments";
import { getCitizenState } from "@/lib/citizenStore";

export function shareUrl(moment: MomentId, extra: { v?: number; l?: string } = {}) {
  const u = getCitizenState().citizen?.username ?? "";
  const q = new URLSearchParams({ u, r: u });
  if (extra.v != null) q.set("v", String(Math.max(0, Math.round(extra.v))));
  if (extra.l) q.set("l", extra.l);
  return `${window.location.origin}/s/${moment}?${q}`;
}

/** Opens the share sheet, or copies the link. Resolves to what happened. */
export async function shareMoment(moment: MomentId, text: string, extra: { v?: number; l?: string } = {}): Promise<"shared" | "copied" | "cancelled"> {
  const url = shareUrl(moment, extra);
  if (navigator.share) {
    try { await navigator.share({ title: "Come To Dubai", text, url }); return "shared"; } catch { return "cancelled"; }
  }
  try { await navigator.clipboard.writeText(`${text} ${url}`); } catch { /* clipboard blocked */ }
  window.dispatchEvent(new CustomEvent("dubai:toast", { detail: "🔗 Link copied. Paste it anywhere to share." }));
  return "copied";
}
