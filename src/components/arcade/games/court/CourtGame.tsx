"use client";

// Dubai Courts: a courtroom drama in 3D. Each case (data/arcade/court.json) is played in parts:
//   1 the case file: open each piece of evidence;
//   2 cross-examination: the witness's statements loop; Press one for more, or Present the evidence that
//     disproves it (wrong presentations cost the judge's patience);
//   3 the face: read the witness at a key moment (believe, doubt, or accuse with proof);
//   4 the objection: tap OBJECTION on the other side's misleading leap;
//   5 the closing argument: put the evidence in order;
// then the verdict. The marriage registry is a document check: approve each couple's papers or reject them
// with the reason. Every other party is a Local; real player cases stay with the Court app and lawyers.

import { useEffect, useRef, useState } from "react";
import COURT from "@/data/arcade/court.json";
import { useCitizen } from "@/lib/citizenStore";
import { useGameProgress } from "@/lib/arcade";
import { haptic, sfx } from "@/utils/gameAudio";
import type { ArcadeGameProps } from "../../ArcadeHost";
import { GameShell, type ShellApi } from "../../GameShell";
import { GameStage } from "../../GameStage";
import { Pill, useCallouts } from "../../hud";
import { shake, slowMo } from "../../stage";
import { Courtroom, JUDGE, type Shot } from "./Courtroom";

type Case = (typeof COURT.cases)[number];
type Evidence = Case["evidence"][number];
const LEVELS = [{ n: 1, label: COURT.registry.title }, ...COURT.cases.map((c, i) => ({ n: i + 2, label: c.title }))];

export default function CourtGame({ onClose, onShare }: ArcadeGameProps) {
  const { citizen } = useCitizen();
  const progress = useGameProgress("court");
  const [picked, setPicked] = useState<number | null>(null);
  const level = picked ?? Math.min(LEVELS.length, progress.level + 1);
  const kase = level >= 2 ? COURT.cases[level - 2] : null;
  return (
    <GameShell
      game="court"
      title={kase ? kase.title : COURT.registry.title}
      venue="Dubai Courts · Bur Dubai"
      howTo={kase ? [
        { icon: "⚖️", text: `You are ${kase.you}. ${kase.claim}` },
        { icon: "🔎", text: "Open every piece of evidence. Then, as the witness speaks, Press a statement for more, or Present the evidence that proves it false." },
        { icon: "🙊", text: "Read the witness's face, object to the other side's leap of logic, and close with your evidence in the right order." },
        { icon: "👨‍⚖️", text: `Wrong moves cost ${JUDGE.name}'s patience. Run out and you lose.` },
      ] : [{ icon: "💍", text: COURT.registry.how }, { icon: "⏱️", text: "Quicker correct calls score more. Wrong calls cost the registrar's patience." }]}
      levels={LEVELS}
      onLevel={setPicked}
      onClose={onClose}
      onShare={onShare}
    >
      {(api) => kase ? <Hearing key={kase.id} api={api} kase={kase} level={level} me={citizen?.look} /> : <Registry api={api} />}
    </GameShell>
  );
}

// ---------------------------------------------------------------- a hearing

type Stage = "file" | "cross" | "face" | "objection" | "closing" | "verdict";

function Hearing({ api, kase, level, me }: { api: ShellApi; kase: Case; level: number; me?: Parameters<typeof Courtroom>[0]["me"] }) {
  const [stage, setStage] = useState<Stage>("file");
  const [opened, setOpened] = useState<string[]>([]);
  const [viewing, setViewing] = useState<Evidence | null>(null);
  const [patience, setPatience] = useState(COURT.patience);
  const [points, setPoints] = useState(0);
  const [line, setLine] = useState(0);
  const [caught, setCaught] = useState<number[]>([]);
  const [tray, setTray] = useState<"present" | "accuse" | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [objLine, setObjLine] = useState(-1);
  const [order, setOrder] = useState<string[]>([]);
  const [won, setWon] = useState<boolean | null>(null);
  const flinchRef = useRef(0);
  const callouts = useCallouts();
  const playing = api.phase === "play";
  const lies = kase.testimony.map((s, i) => ("lie" in s && s.lie ? i : -1)).filter((i) => i >= 0);

  const shot: Shot = viewing ? "docs" : stage === "file" ? "desk" : stage === "cross" ? "witness" : stage === "face" ? "face" : stage === "objection" ? "counsel" : stage === "closing" ? "wide" : "judge";

  const lose = (why: string) => { setWon(false); setStage("verdict"); callouts.push(why, "bad"); sfx("lose"); };
  const mistake = (text: string) => {
    sfx("warn"); haptic(30); shake(0.06);
    callouts.push(text, "bad");
    setPoints((p) => Math.max(0, p - 50));
    const n = patience - 1;
    setPatience(n);
    if (n <= 0) setTimeout(() => lose("The judge has heard enough"), 600);
  };
  const good = (text: string, add: number) => {
    sfx("mgPerfect"); haptic(20); shake(0.1); slowMo(0.5, 0.4);
    flinchRef.current = 1;
    callouts.push(text, "great");
    setPoints((p) => p + add);
  };

  // Cross-examination: the statements loop, one every few seconds (paused while choosing evidence).
  useEffect(() => {
    if (stage !== "cross" || !playing || tray) return;
    const id = setInterval(() => { setLine((l) => (l + 1) % kase.testimony.length); setSaid(null); }, 4200);
    return () => clearInterval(id);
  }, [stage, playing, tray, kase.testimony.length]);

  // The objection: the other side's lines, one every 2.4 seconds; letting the leap pass costs patience.
  useEffect(() => {
    if (stage !== "objection" || !playing) return;
    const id = setInterval(() => setObjLine((l) => Math.min(l + 1, kase.objection.lines.length)), 2400);
    return () => clearInterval(id);
  }, [stage, playing, kase.objection.lines.length]);
  // Past the last line without an objection: the leap went unchallenged.
  useEffect(() => {
    if (stage !== "objection" || objLine < kase.objection.lines.length) return;
    const id = setTimeout(() => { mistake("You let it pass"); setStage("closing"); }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the lines run out
  }, [stage, objLine]);

  // The verdict: a moment for the judge, then the result card.
  useEffect(() => {
    if (stage !== "verdict" || won === null) return;
    if (won) { sfx("applause"); slowMo(0.4, 1); }
    const id = setTimeout(() => {
      const score = points + patience * 100 + (won ? 500 : 0);
      const max = lies.length * 200 + 300 + 300 + 650 + COURT.patience * 100 + 500;
      const frac = score / max;
      api.finish({
        score, stars: !won ? 0 : frac > 0.85 ? 3 : frac > 0.65 ? 2 : 1, level: won ? level : 0,
        headline: won ? `Judgment for you: ${kase.win}` : "Judgment against you",
        stats: [{ label: "Lies caught", value: `${caught.length}/${lies.length}` }, { label: "Patience", value: `${patience}/${COURT.patience}` }, { label: "Case", value: kase.court }],
        share: won ? `⚖️ Won "${kase.title}" at Dubai Courts on Dubai Life` : `⚖️ Took on "${kase.title}" at Dubai Courts on Dubai Life`,
      });
    }, 2800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the verdict is in
  }, [stage, won]);

  const present = (ev: Evidence) => {
    const mode = tray;
    setTray(null);
    if (mode === "accuse") {
      if (kase.face.answer === "accuse" && "evidence" in kase.face && kase.face.evidence === ev.id) { good("CAUGHT OUT!", 300); setStage("objection"); setObjLine(-1); }
      else mistake("That doesn't prove it");
      return;
    }
    const st = kase.testimony[line];
    if ("lie" in st && st.lie === ev.id && !caught.includes(line)) {
      good("OBJECTION!", 200);
      const now = [...caught, line];
      setCaught(now);
      if (lies.every((i) => now.includes(i))) setTimeout(() => setStage("face"), 1400);
    } else mistake("The judge doesn't see the relevance");
  };
  const press = () => {
    const st = kase.testimony[line];
    sfx("tap");
    setSaid("press" in st && st.press ? st.press : "I've said what I saw.");
    if ("press" in st && st.press) setPoints((p) => p + 30);
  };
  const read = (answer: "believe" | "doubt" | "accuse") => {
    if (answer === "accuse") { setTray("accuse"); return; }
    if (answer === kase.face.answer) { good(answer === "doubt" ? "You pressed them, and it showed" : "You read them right", 300); setStage("objection"); setObjLine(-1); }
    else { mistake(answer === "doubt" ? "You doubted an honest answer" : "You let a lie go"); setStage("objection"); setObjLine(-1); }
  };
  const object = () => {
    if (objLine < 0 || objLine >= kase.objection.lines.length) return;
    if (objLine === kase.objection.misleading) { good("OBJECTION! That doesn't follow", 300); setStage("closing"); }
    else mistake("Overruled");
  };
  const pick = (id: string) => {
    if (order.includes(id)) { setOrder(order.filter((x) => x !== id)); return; }
    if (order.length < kase.closing.length) setOrder([...order, id]);
  };
  const close = () => {
    const right = order.filter((id, i) => kase.closing[i] === id).length;
    setPoints((p) => p + right * 150 + (right === kase.closing.length ? 200 : 0));
    callouts.push(right === kase.closing.length ? "A watertight argument" : `${right} of ${kase.closing.length} in the right place`, right === kase.closing.length ? "great" : "info");
    setWon(right >= 2 && patience > 0);
    setStage("verdict");
  };

  const statement = kase.testimony[line];
  const lineCaught = caught.includes(line);

  return (
    <div className="absolute inset-0">
      <GameStage camera={{ position: [0, 3.1, 6.6], fov: 50 }} background="#2a1d12" environment={0.4}>
        <Courtroom shot={shot} me={me} witness={{ gender: kase.witness.gender as "man" | "woman", preset: kase.witness.preset }} flinchRef={flinchRef} />
      </GameStage>

      <div className="absolute inset-x-0 top-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-14 flex flex-wrap gap-2 pointer-events-none">
        <Pill icon="👨‍⚖️" value={"⚖️".repeat(patience) + "·".repeat(COURT.patience - patience)} />
        <Pill icon="⭐" value={points} tone="gold" />
        {stage === "cross" && <Pill icon="🔎" value={`${caught.length}/${lies.length} caught`} />}
      </div>
      {callouts.node}

      <div className="absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] space-y-2">
        {stage === "file" && (
          <>
            <p className="text-sm font-black text-center">The case file: open each piece of evidence</p>
            <div className="grid grid-cols-3 gap-1.5">
              {kase.evidence.map((e) => (
                <button key={e.id} onClick={() => { setViewing(e); if (!opened.includes(e.id)) setOpened([...opened, e.id]); sfx("card"); }}
                  className={`rounded-xl p-2 text-left border ${opened.includes(e.id) ? "bg-amber-100 text-amber-950 border-amber-300" : "bg-white/10 border-white/20"}`}>
                  <span className="text-xl">{e.icon}</span><span className="block text-[11px] font-black leading-tight">{e.name}</span>
                </button>
              ))}
            </div>
            <button disabled={opened.length < kase.evidence.length} onClick={() => { setStage("cross"); setLine(0); sfx("chime"); }}
              className="w-full h-12 rounded-2xl bg-amber-400 text-amber-950 font-black disabled:opacity-40">Begin the hearing</button>
          </>
        )}

        {stage === "cross" && (
          <>
            <div className={`rounded-2xl p-3 border-2 ${lineCaught ? "bg-emerald-950/80 border-emerald-400" : "bg-black/75 border-white/15"}`}>
              <p className="text-[10px] font-black uppercase text-white/50"><span className="rounded bg-amber-400/90 text-amber-950 px-1 mr-1">Local</span>{kase.witness.name} · {line + 1}/{kase.testimony.length}</p>
              <p className="text-base font-black leading-snug">{statement.text}</p>
              {said && <p className="text-sm text-sky-200 mt-1">“{said}”</p>}
              <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden"><div key={line} className="h-full bg-white/60 animate-[court-line_4.2s_linear]" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={press} className="h-12 rounded-2xl bg-sky-500 font-black">🗣️ Press</button>
              <button onClick={() => setTray("present")} className="h-12 rounded-2xl bg-rose-500 font-black">📂 Present evidence</button>
            </div>
          </>
        )}

        {stage === "face" && (
          <>
            <div className="rounded-2xl p-3 bg-black/75 border border-white/15">
              <p className="text-base font-black">{kase.face.prompt}</p>
              <p className="text-sm text-white/70 mt-1">{kase.face.tell}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => read("believe")} className="h-12 rounded-2xl bg-emerald-600 font-black">Believe</button>
              <button onClick={() => read("doubt")} className="h-12 rounded-2xl bg-amber-500 text-amber-950 font-black">Doubt</button>
              <button onClick={() => read("accuse")} className="h-12 rounded-2xl bg-rose-600 font-black">Accuse 📂</button>
            </div>
          </>
        )}

        {stage === "objection" && (
          <>
            <div className="rounded-2xl p-3 bg-black/75 border border-white/15 min-h-20">
              <p className="text-[10px] font-black uppercase text-white/50"><span className="rounded bg-amber-400/90 text-amber-950 px-1 mr-1">Local</span>{kase.objection.speaker}</p>
              <p className="text-base font-black">{objLine >= 0 ? kase.objection.lines[Math.min(objLine, kase.objection.lines.length - 1)] : "…"}</p>
            </div>
            <button onClick={object} className="w-full h-16 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 font-black text-2xl tracking-wide">OBJECTION!</button>
          </>
        )}

        {stage === "closing" && (
          <>
            <p className="text-sm font-black text-center">Closing argument: tap the evidence in the order that proves your case</p>
            <div className="grid grid-cols-3 gap-1.5">
              {kase.evidence.map((e) => {
                const at = order.indexOf(e.id);
                return (
                  <button key={e.id} onClick={() => pick(e.id)} className={`rounded-xl p-2 text-left border relative ${at >= 0 ? "bg-amber-400 text-amber-950 border-amber-300" : "bg-white/10 border-white/20"}`}>
                    {at >= 0 && <span className="absolute top-1 right-1.5 text-xs font-black">{at + 1}</span>}
                    <span className="text-xl">{e.icon}</span><span className="block text-[11px] font-black leading-tight">{e.name}</span>
                  </button>
                );
              })}
            </div>
            <button disabled={order.length < kase.closing.length} onClick={close} className="w-full h-12 rounded-2xl bg-amber-400 text-amber-950 font-black disabled:opacity-40">Rest your case</button>
          </>
        )}

        {stage === "verdict" && won !== null && (
          <div className="rounded-2xl p-4 bg-black/80 text-center">
            <p className="text-[10px] font-black uppercase text-white/50"><span className="rounded bg-amber-400/90 text-amber-950 px-1 mr-1">Local</span>{JUDGE.name}</p>
            <p className="text-xl font-black">{won ? `I find for ${kase.you}.` : "The claim fails."}</p>
          </div>
        )}
      </div>

      {/* A piece of evidence, opened */}
      {viewing && (
        <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center p-6" onClick={() => setViewing(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-amber-50 text-slate-900 p-5 shadow-2xl rotate-[-1deg]">
            <p className="text-3xl">{viewing.icon}</p>
            <p className="font-black text-lg">{viewing.name}</p>
            <p className="text-sm mt-1 leading-relaxed">{viewing.detail}</p>
            <p className="text-[11px] text-slate-500 mt-3">Tap to put it back in the file</p>
          </div>
        </div>
      )}
      {/* The evidence tray, to present or accuse with */}
      {tray && (
        <div className="absolute inset-x-0 bottom-0 z-30 p-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] bg-slate-950/95 rounded-t-3xl space-y-2">
          <p className="text-sm font-black">{tray === "accuse" ? "Accuse them with…" : `Present against: “${statement.text}”`}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {kase.evidence.map((e) => (
              <button key={e.id} onClick={() => present(e)} className="rounded-xl p-2 text-left bg-white/10 border border-white/15">
                <span className="text-lg">{e.icon}</span> <span className="text-xs font-black">{e.name}</span>
                <span className="block text-[10px] text-white/60 leading-snug mt-0.5">{e.detail}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setTray(null)} className="w-full h-10 rounded-xl bg-white/10 font-black text-sm">Back</button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the marriage registry

type Couple = (typeof COURT.registry.couples)[number];
const REASONS = COURT.registry.reasons as Record<string, string>;

/** Age on a date, from a yyyy-mm-dd birthday. */
const ageOn = (born: string, at: Date) => { const b = new Date(born); let a = at.getFullYear() - b.getFullYear(); if (at < new Date(at.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };

function IdCard({ who, label }: { who: Couple["a"]; label: string }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-sky-100 to-emerald-100 text-slate-900 p-2.5 text-[11px] leading-snug shadow">
      <p className="font-black text-[10px] uppercase text-slate-500">{label} · Emirates ID</p>
      <p className="font-black text-sm">{who.name}</p>
      <p>ID {who.id}</p>
      <p>Born {who.born}</p>
      <p>Expires {who.expires}</p>
    </div>
  );
}

/** Points for a quick decision: 200, less 1 for each tenth of a second since the papers came up. */
const speedBonus = (since: number) => Math.max(0, 200 - Math.round((performance.now() - since) / 100));

function Registry({ api }: { api: ShellApi }) {
  const couples = COURT.registry.couples;
  const [i, setI] = useState(0);
  const [patience, setPatience] = useState(COURT.patience);
  const [points, setPoints] = useState(0);
  const [right, setRight] = useState(0);
  const [rejecting, setRejecting] = useState(false);
  // When this couple's papers came up (for the speed bonus).
  const startedRef = useRef(0);
  useEffect(() => { startedRef.current = performance.now(); }, [i]);
  const flinchRef = useRef(0);
  const callouts = useCallouts();
  const doneRef = useRef(false);
  const today = new Date();

  const next = (ok: boolean, pts: number) => {
    const p2 = ok ? patience : patience - 1;
    if (ok) { sfx("mgPerfect"); callouts.push("Correct", "great"); setRight((r) => r + 1); setPoints((p) => p + pts); }
    else { sfx("warn"); shake(0.06); callouts.push("That's not right", "bad"); setPatience(p2); }
    setRejecting(false);
    if (i + 1 >= couples.length || p2 <= 0) {
      if (doneRef.current) return;
      doneRef.current = true;
      const total = right + (ok ? 1 : 0);
      const score = points + (ok ? pts : 0) + p2 * 100;
      setTimeout(() => api.finish({
        score, stars: p2 <= 0 ? 0 : total === couples.length ? 3 : total >= couples.length - 1 ? 2 : 1, level: p2 > 0 && total >= couples.length - 1 ? 1 : 0,
        headline: p2 <= 0 ? "The registrar takes over the desk" : `${total} of ${couples.length} couples checked right`,
        stats: [{ label: "Right", value: `${total}/${couples.length}` }, { label: "Patience", value: `${p2}/${COURT.patience}` }, { label: "Desk", value: "Registry" }],
        share: `💍 Ran the marriage registry at Dubai Courts on Dubai Life: ${total}/${couples.length} right`,
      }), 900);
      return;
    }
    setI(i + 1);
  };
  const speed = () => speedBonus(startedRef.current);
  const approve = () => next(couples[i].problem === null, 200 + speed());
  const reject = (reason: string) => next(couples[i].problem === reason, 200 + speed());

  const c = couples[i];
  return (
    <div className="absolute inset-0">
      <GameStage camera={{ position: [0.6, 2.2, 2.4], fov: 50 }} background="#2a1d12" environment={0.4}>
        <Courtroom shot="wide" flinchRef={flinchRef} />
      </GameStage>
      <div className="absolute inset-x-0 top-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-14 flex gap-2 pointer-events-none">
        <Pill icon="💍" value={`Couple ${i + 1}/${couples.length}`} />
        <Pill icon="⚖️" value={patience} />
        <Pill icon="⭐" value={points} tone="gold" />
      </div>
      {callouts.node}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <IdCard who={c.a} label="Groom" />
          <IdCard who={c.b} label="Bride" />
        </div>
        <div className="rounded-xl bg-amber-50 text-slate-900 p-2.5 text-[11px] shadow">
          <p className="font-black text-[10px] uppercase text-slate-500">Application · today {today.toISOString().slice(0, 10)}</p>
          <p>Groom: <b>{c.certificate.groom}</b> · Bride: <b>{c.certificate.bride}</b></p>
          <p>Single-status certificate: <b>{c.certificate.single ? "attached" : "missing"}</b> · Ages {ageOn(c.a.born, today)} and {ageOn(c.b.born, today)}</p>
        </div>
        {!rejecting ? (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={approve} className="h-12 rounded-2xl bg-emerald-600 font-black">✅ Approve</button>
            <button onClick={() => setRejecting(true)} className="h-12 rounded-2xl bg-rose-600 font-black">❌ Reject…</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(REASONS).map(([k, label]) => <button key={k} onClick={() => reject(k)} className="rounded-xl p-2 bg-white/10 border border-white/15 text-xs font-black text-left">{label}</button>)}
          </div>
        )}
      </div>
    </div>
  );
}
