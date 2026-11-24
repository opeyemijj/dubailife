"use client";

// Someone's name or @username, anywhere in the game: tap it to open their profile (/u/<username>). A span acting as a
// link rather than an <a>, so it can sit inside a row that is itself a button (a chat in the list opens the chat;
// the name in it opens the profile) without the tap doing both.

import { useRouter } from "next/navigation";
import { gameAudio } from "@/utils/gameAudio";

/** Where someone's profile is. */
export const profileHref = (username: string) => `/u/${encodeURIComponent(username.replace(/^@/, ""))}`;

export function ProfileLink({ username, children, className = "" }: {
  username: string | null | undefined;
  /** What to show (their name, their face…); "@username" when left out. */
  children?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  if (!username) return <>{children ?? null}</>;
  const go = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    gameAudio.playClickSound();
    router.push(profileHref(username));
  };
  return (
    <span
      role="link"
      tabIndex={0}
      aria-label={`@${username}'s profile`}
      onClick={go}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") go(e); }}
      className={`cursor-pointer hover:underline underline-offset-2 ${className}`}
    >
      {children ?? `@${username}`}
    </span>
  );
}
