"use client";

// Invites: parties you're hosting and parties you're invited to, with a way into each, and the links you can share
// (ask someone out, or hire you as a decorator).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCitizen } from "@/lib/citizenStore";
import { useNow } from "@/lib/dubaiClock";
import { useServices } from "@/lib/cityServices";
import { openPartySheet } from "@/components/invite/PartySheetHost";
import { createLink, isEvent, myPromotions, kindOf, myInvites, partyDoor, shareInvite, type InviteRow } from "@/lib/invites";
import { AppScreen, Big, Card, Note } from "./AppScreen";

const at = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function InvitesApp({ onBack, onClose }: { onBack: () => void; onClose?: () => void }) {
  const router = useRouter();
  const { citizen } = useCitizen();
  const svc = useServices(citizen?.id);
  const now = useNow();
  const [data, setData] = useState<{ hosting: InviteRow[]; invited: InviteRow[] } | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { void myInvites().then(setData); }, []);
  // A club promoter's numbers.
  const isPromoter = svc?.service === "promoter";
  const [promo, setPromo] = useState<{ events: number; guests: number; earned: number } | null>(null);
  useEffect(() => { if (isPromoter) void myPromotions().then(setPromo); }, [isPromoter]);

  const open = (code: string) => { onClose?.(); router.push(`/i/${code}`); };
  const headThere = (r: InviteRow) => { onClose?.(); router.push(r.route ? partyDoor(r.route) : `/i/${r.code}`); };
  const link = async (kind: "ask_out" | "hire_decorator") => {
    const r = await createLink(kind);
    if (!r.code) { setNote({ ok: false, text: r.error ?? "Couldn't make the link." }); return; }
    const s = await shareInvite(r.code, kind === "ask_out" ? "💌 Go on a date with me in Dubai Life?" : "🧑‍🎨 I'm an interior decorator in Dubai Life. Hire me to do your home!");
    setNote({ ok: true, text: s === "copied" ? "Link copied. Send it to someone!" : "Link ready to share." });
  };
  const row = (r: InviteRow, hosting: boolean) => {
    const k = kindOf(r.kind);
    const live = now > 0 && Date.parse(r.startsAt) <= now;
    return (
      <Card key={r.code}>
        <div className="flex items-start gap-3">
          <span className="text-3xl">{k.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-black leading-tight">{r.title}</p>
            <p className="text-sm text-slate-600 truncate">{hosting ? r.label : `From @${r.host} · ${r.label}`}</p>
            <p className={`text-sm font-bold ${live ? "text-rose-600" : "text-slate-500"}`}>{live ? "● Happening now" : at(r.startsAt)}{hosting ? ` · ${r.going ?? 0} going · ${r.arrived ?? 0} here` : r.status === "invited" ? " · Not answered yet" : " · You're going"}</p>
          </div>
        </div>
        {!hosting && live && r.status === "going" ? <Big onClick={() => headThere(r)}>🎉 Back to the party</Big> : <Big onClick={() => open(r.code)}>{hosting ? "Open and invite more" : live ? "🎉 Head there" : "See the invite"}</Big>}
      </Card>
    );
  };

  return (
    <AppScreen title="Invites" onBack={onBack} accent="text-fuchsia-600">
      {note && <Note ok={note.ok}>{note.text}</Note>}
      {!data ? <p className="text-center text-slate-500 py-8">Loading…</p> : (
        <>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">You&apos;re invited</p>
          {data.invited.length ? data.invited.map((r) => row(r, false)) : <p className="text-sm text-slate-500 px-1">No invites right now. When someone invites you to a party, it shows up here.</p>}
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 px-1 pt-2">You&apos;re hosting</p>
          {data.hosting.filter((r) => isEvent(r.kind)).map((r) => row(r, true))}
          <Card className="bg-fuchsia-50">
            {promo && (
              <div className="rounded-2xl bg-amber-50 p-3 space-y-1">
                <p className="font-black">📣 Club promoter</p>
                <p className="text-sm text-slate-600">{promo.events} events · {promo.guests} guests turned up · AED {promo.earned.toLocaleString()} commission</p>
                <p className="text-xs text-slate-500">Host at any venue for up to 200 guests. AED 150 for every guest who turns up.</p>
              </div>
            )}
            <p className="font-black">🎉 Throw a party</p>
            <p className="text-sm text-slate-600">A house party or dinner at your home, a club night, a pool party, a seminar, or dinner at a restaurant. Free or ticketed. Invite anyone with a link.</p>
            <Big onClick={() => { onClose?.(); openPartySheet(); }}>Plan a party</Big>
          </Card>
          <Card>
            <p className="font-black">💌 Ask someone out</p>
            <p className="text-sm text-slate-600">Send a link. If they say yes, you&apos;re dating, in the Family app (a man and a woman, both agreeing).</p>
            <Big onClick={() => link("ask_out")}>Share my ask-out link</Big>
          </Card>
          {svc?.service === "decorator" && (
            <Card>
              <p className="font-black">🧑‍🎨 Get decorating clients</p>
              <p className="text-sm text-slate-600">Share a link that opens the hire screen with you picked.</p>
              <Big onClick={() => link("hire_decorator")}>Share my hire-me link</Big>
            </Card>
          )}
        </>
      )}
    </AppScreen>
  );
}
