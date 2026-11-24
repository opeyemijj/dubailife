"use client";

// A caption or comment: @mentions open that player's profile, #hashtags stand out.

import { ProfileLink } from "@/components/social/ProfileLink";

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/(@[A-Za-z0-9_.]{3,24}|#[A-Za-z0-9_]{2,40})/g);
  return (
    <span className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((p, i) =>
        p.startsWith("@") && p.length > 3 ? <ProfileLink key={i} username={p.slice(1).toLowerCase()} className="font-bold text-sky-400">{p}</ProfileLink>
          : p.startsWith("#") && p.length > 2 ? <span key={i} className="font-bold text-fuchsia-400">{p}</span>
          : <span key={i}>{p}</span>)}
    </span>
  );
}
