"use client";

// The invite page: what it is (a party with who, where, when and who's going, or an "ask me out" or "hire me" link),
// then three steps that tick off as they're done: log in or sign up, finish your profile, then go (to the party, say
// yes to the date, or hire the decorator). Signed-out visitors keep the code through sign-up.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { useCitizen } from "@/lib/citizenStore";
import { useNow } from "@/lib/dubaiClock";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { acceptAskOut, decorOf, forgetInvite, partyDoor, inviteView, isEvent, kindOf, rememberInvite, rsvp, shareInvite, type InviteView } from "@/lib/invites";
import { gameAudio } from "@/utils/gameAudio";

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai", weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function Face({ look, size = "w-10 h-10" }: { look?: InviteView["guests"][number]["look"]; size?: string }) {
  return (
    <span className={`${size} rounded-full overflow-hidden bg-white/20 shrink-0 border-2 border-white`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={rosterThumb(presetFor(look ?? { gender: "woman" }))} alt="" className="w-full h-full object-cover object-[50%_8%] scale-[1.9] origin-top" />
    </span>
  );
}

function Step({ n, done, active, title, children }: { n: number; done: boolean; active: boolean; title: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-2xl p-3.5 space-y-2.5 ${done ? "bg-emerald-50" : active ? "bg-white ring-2 ring-emerald-500" : "bg-white/60"}`}>
      <div className="flex items-center gap-2.5">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${done ? "bg-emerald-500 text-white" : active ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"}`}>{done ? <Check className="w-4 h-4" /> : n}</span>
        <p className={`font-black ${active || done ? "text-slate-900" : "text-slate-400"}`}>{title}</p>
      </div>
      {active && children}
    </div>
  );
}

export function InvitePage({ code, initial }: { code: string; initial: InviteView | null }) {
  const router = useRouter();
  const { citizen, isLoggedIn, hydrated, needsOnboarding } = useCitizen();
  const now = useNow();
  const [invite, setInvite] = useState<InviteView | null>(initial);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Keep the code through sign-up, and read the invite again signed in (for your own reply).
  useEffect(() => { rememberInvite(code); }, [code]);
  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    void inviteView(code).then((v) => { if (live && v) setInvite(v); });
    return () => { live = false; };
  }, [code, hydrated, isLoggedIn]);

  if (!invite) {
    return (
      <main className="min-h-[100dvh] bg-slate-950 text-white flex items-center justify-center p-4 text-center">
        <div className="space-y-3 max-w-sm">
          <p className="text-5xl">🎟️</p>
          <h1 className="text-2xl font-black">This invite doesn&apos;t exist</h1>
          <p className="text-slate-400">Check the link with whoever sent it.</p>
          <Link href="/" className="inline-block h-12 leading-[3rem] px-6 rounded-2xl bg-emerald-500 text-slate-950 font-black">Go to Dubai Life</Link>
        </div>
      </main>
    );
  }

  const event = isEvent(invite.kind);
  const k = kindOf(invite.kind);
  const ended = invite.cancelled || (now > 0 && Date.parse(invite.endsAt) < now);
  const live = now > 0 && Date.parse(invite.startsAt) <= now && !ended;
  const host = invite.host?.username ?? "a friend";
  const signedIn = isLoggedIn && !!citizen;
  const profileDone = signedIn && !needsOnboarding;
  const authQuery = `invite=${code}${invite.host ? `&ref=${encodeURIComponent(invite.host.username)}` : ""}`;

  const go = async () => {
    setBusy(true);
    const err = invite.isHost ? null : await rsvp(code, "going");
    setBusy(false);
    // Already on the list counts; anything else (full, ended) stops here.
    if (err && invite.mine !== "going") { setNote(err); return; }
    forgetInvite();
    gameAudio.playClickSound();
    router.push(invite.isHost && invite.route.startsWith("/property/") ? "/home" : partyDoor(invite.route));
  };
  const countMeIn = async () => {
    setBusy(true);
    const err = await rsvp(code, "going");
    setBusy(false);
    if (err) { setNote(err); return; }
    gameAudio.playCoinSound();
    setInvite({ ...invite, mine: "going", going: invite.mine === "going" ? invite.going : invite.going + 1 });
    setNote(`You're on the list. Come back to this link at ${when(invite.startsAt)}.`);
  };
  const sayYes = async () => {
    setBusy(true);
    const r = await acceptAskOut(code);
    setBusy(false);
    if (r.error) { setNote(r.error); return; }
    forgetInvite();
    gameAudio.playCoinSound();
    setInvite({ ...invite, cancelled: true, mine: "going" });
    setNote(`💞 You and @${r.partner} are dating! Find each other in Hayati.`);
  };
  const hire = () => {
    forgetInvite();
    router.push(`/home?hire=${encodeURIComponent(invite.host?.username ?? "")}`);
  };
  const share = async () => {
    const r = await shareInvite(code, `Come to ${invite.title} at ${invite.label} on Dubai Life!`);
    if (r === "copied") setNote("Link copied. Send it to your friends!");
  };

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-fuchsia-700 via-violet-800 to-slate-950 text-white">
      <div className="max-w-md mx-auto px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 space-y-4">
        <p className="text-center text-xs font-black uppercase tracking-[0.25em] text-white/70">Dubai Life · You&apos;re invited</p>

        <section className="rounded-[28px] bg-white/10 backdrop-blur p-5 space-y-3 text-center">
          <div className="flex justify-center"><Face look={invite.host?.look} size="w-20 h-20" /></div>
          <p className="text-sm text-white/80">{invite.kind === "ask_out" ? `@${host} wants to go on a date with you` : invite.kind === "hire_decorator" ? `@${host} is an interior decorator` : `@${host} invited you to`}</p>
          <h1 className="text-3xl font-black leading-tight">{k.icon} {invite.title}</h1>
          <p className="font-bold">{event ? invite.label : invite.kind === "ask_out" ? "Say yes and you'll be dating in Hayati." : "They'll come to your home, buy with your budget and decorate it."}</p>
          {event ? (
            <>
              <p className={`inline-block rounded-full px-3 py-1 text-sm font-black ${ended ? "bg-white/15 text-white/70" : live ? "bg-rose-500" : "bg-amber-400 text-slate-950"}`}>
                {ended ? "This party has ended" : live ? `● Happening now${invite.arrived ? ` · ${invite.arrived} here` : ""}` : `${when(invite.startsAt)} · Dubai time`}
              </p>
              {!!invite.decor?.length && <p className="text-sm text-white/85">{invite.decor.map((d) => decorOf(d)?.icon).join(" ")} Decorated for the night</p>}
              <div className="flex items-center justify-center gap-2 pt-1">
                <div className="flex -space-x-3">{invite.guests.slice(0, 6).map((g) => <Face key={g.username} look={g.look} size="w-9 h-9" />)}</div>
                <p className="text-sm font-bold">{invite.going ? `${invite.going} going` : "Be the first to say yes"}</p>
              </div>
            </>
          ) : ended && <p className="inline-block rounded-full px-3 py-1 text-sm font-black bg-white/15 text-white/70">This link has been used or has expired</p>}
        </section>

        {ended ? (
          <Link href={signedIn ? "/explore" : "/?signup=true"} className="block h-14 leading-[3.5rem] text-center rounded-2xl bg-emerald-500 text-slate-950 font-black text-lg">{signedIn ? "Explore Dubai" : "Join Dubai Life"}</Link>
        ) : invite.isHost ? (
          <section className="rounded-[24px] bg-white text-slate-900 p-4 space-y-2.5">
            <p className="font-black">{event ? "It's your party. Invite more people:" : "This is your link. Share it:"}</p>
            <button onClick={share} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black">Share the invite</button>
            {event && <button onClick={go} className="w-full h-11 rounded-2xl bg-slate-100 font-black">Go there</button>}
          </section>
        ) : (
          <section className="rounded-[24px] bg-slate-100 text-slate-900 p-3 space-y-2">
            <Step n={1} done={signedIn} active={hydrated && !signedIn && !needsOnboarding} title="Log in or sign up">
              <p className="text-sm text-slate-600">Dubai Life is free. New here? It takes a minute.</p>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/?signup=true&${authQuery}`} className="h-12 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center">Sign up</Link>
                <Link href={`/?login=true&${authQuery}`} className="h-12 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center">Log in</Link>
              </div>
            </Step>
            <Step n={2} done={profileDone} active={hydrated && needsOnboarding} title="Complete your profile">
              <p className="text-sm text-slate-600">Make your character and choose where you live. You&apos;ll come straight back here.</p>
              <Link href="/onboarding/look" className="h-12 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center">Continue my profile</Link>
            </Step>
            <Step n={3} done={!event && invite.mine === "going"} active={profileDone && !(!event && invite.mine === "going")} title={invite.kind === "ask_out" ? "Say yes to the date" : invite.kind === "hire_decorator" ? `Hire @${host}` : live ? "Head to the party" : "Say you're coming"}>
              {invite.kind === "ask_out" ? (
                <button onClick={sayYes} disabled={busy} className="w-full h-12 rounded-2xl bg-rose-500 text-white font-black disabled:opacity-60">💞 Yes, let&apos;s go on a date</button>
              ) : invite.kind === "hire_decorator" ? (
                <button onClick={hire} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black">🧑‍🎨 Hire @{host} for my home</button>
              ) : live ? (
                <button onClick={go} disabled={busy} className="w-full h-12 rounded-2xl bg-fuchsia-600 text-white font-black disabled:opacity-60">🎉 Head to the party</button>
              ) : invite.mine === "going" ? (
                <p className="text-sm font-bold text-emerald-700">You&apos;re going. It starts {when(invite.startsAt)}. Come back to this link then.</p>
              ) : (
                <button onClick={countMeIn} disabled={busy} className="w-full h-12 rounded-2xl bg-fuchsia-600 text-white font-black disabled:opacity-60">Count me in</button>
              )}
              {invite.mine === "going" && !live && <button onClick={share} className="w-full h-10 rounded-2xl bg-white font-bold text-sm">Bring friends: share the invite</button>}
            </Step>
          </section>
        )}
        {note && <p className="text-center text-sm font-bold text-amber-200">{note}</p>}
        {invite.kind === "ask_out" && invite.mine === "going" && <button onClick={() => openPhone("hayati")} className="w-full h-12 rounded-2xl bg-white text-rose-600 font-black">Open Hayati</button>}
        <p className="text-center text-[11px] text-white/50">Dubai Life is a free life game for players aged 21+.</p>
      </div>
    </main>
  );
}
