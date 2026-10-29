"use client";

// The Driving Academy in Academic City (design spec section 8): eye & reflex test, theory exam, Smart Yard.
// Passing all three issues a provisional in-game license that unlocks car options in the Blueprint.
// Stage 4 (the highway road test) arrives with the 3D traffic simulation.

import { ShareButton } from "@/components/share/ShareButton";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle, Lock } from "lucide-react";
import { useRequireCitizen } from "@/lib/citizenStore";
import { BottomNav } from "@/components/layout/BottomNav";
import { SmartYard } from "@/components/driving/SmartYard";
import { drivingProgress, recordStage, submitTheory, type DrivingProgress } from "@/lib/driving/progress";
import { drawExam, THEORY } from "@/lib/driving/theory";
import { syncLife } from "@/lib/lifeLoop";
import { gameAudio } from "@/utils/gameAudio";

type Stage = "eye" | "theory" | "yard" | null;

export default function DrivingAcademyPage() {
  useRequireCitizen();
  const [p, setP] = useState<DrivingProgress | null | undefined>(undefined);
  const [stage, setStage] = useState<Stage>(null);
  useEffect(() => { void drivingProgress().then(setP); }, []);

  const done = { eye: !!p?.eye_passed_at, theory: !!p?.theory_passed_at, yard: !!p?.yard_passed_at };
  const finish = (next: DrivingProgress | null) => {
    if (next) setP(next);
    setStage(null);
    if (next?.issued_at) void syncLife();
  };

  const steps = [
    { id: "eye" as const, n: 1, title: "Eye & reflex test", text: "Spot the odd tile, then react when the light turns green.", open: true },
    { id: "theory" as const, n: 2, title: "Theory exam", text: `20 questions on road rules. ${THEORY.passPct}% to pass.`, open: done.eye },
    { id: "yard" as const, n: 3, title: "Smart Yard", text: "Park in a 90° bay and a parallel bay without touching anything.", open: done.theory },
  ];

  return (
    <main className="min-h-[100dvh] bg-slate-950 text-white pb-32">
      <div className="max-w-lg mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/academics" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-xl font-black">🚗 Driving Academy</h1>
            <p className="text-xs text-slate-400">Academic City · in-game license</p>
          </div>
        </div>

        {p?.revoked_at && !p.issued_at && (
          <section className="rounded-3xl bg-rose-600/15 border border-rose-500/40 p-4 space-y-1">
            <p className="font-black text-rose-200">🚫 Your license was revoked</p>
            <p className="text-sm text-rose-100/80">Revoked on {new Date(p.revoked_at).toLocaleDateString()} after three traffic accidents. Your eye test still counts: pass the theory exam and the Smart Yard again for a new license.</p>
          </section>
        )}
        {p?.issued_at && (
          <div className="rounded-3xl bg-gradient-to-br from-sky-600 to-indigo-700 p-4 shadow-xl">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/70"><span>Dubai Life · Driving license</span><span>Provisional</span></div>
            <p className="text-2xl font-black mt-2 tracking-wider">{p.licence_no}</p>
            <p className="text-xs text-white/80 mt-1">Issued {new Date(p.issued_at).toLocaleDateString()} · theory {p.theory_score}%</p>
            <p className="text-[10px] text-white/60 mt-2">An in-game license only. Not a real driving license or government document.</p>
            <ShareButton moment="licence" v={p.theory_score ?? 0} text="I passed my driving test in Dubai Life 🚗" className="mt-3 h-9 px-4 rounded-full bg-white/20 text-white text-xs" />
          </div>
        )}

        {stage === null && (
          <div className="space-y-2">
            {steps.map((s) => {
              const ok = done[s.id];
              return (
                <button key={s.id} disabled={!s.open || ok || p === undefined} onClick={() => { gameAudio.playClickSound(); setStage(s.id); }}
                  className={`w-full flex items-center gap-3 rounded-2xl p-4 text-left border ${ok ? "bg-emerald-950/40 border-emerald-500/40" : s.open ? "bg-slate-900 border-white/10 hover:border-sky-500/50" : "bg-slate-900/50 border-white/5 opacity-60"}`}>
                  <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black shrink-0">{ok ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : !s.open ? <Lock className="w-4 h-4" /> : s.n}</span>
                  <span className="flex-1">
                    <span className="block font-black">{s.title}</span>
                    <span className="block text-xs text-slate-400">{s.text}</span>
                  </span>
                  {!ok && s.open && <span className="text-xs font-black text-sky-300">Start ›</span>}
                </button>
              );
            })}
            <div className="w-full flex items-center gap-3 rounded-2xl p-4 bg-slate-900/50 border border-white/5 opacity-60">
              <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black shrink-0">4</span>
              <span className="flex-1"><span className="block font-black">Highway road test</span><span className="block text-xs text-slate-400">Coming soon: lane discipline and merging in 3D traffic. Your license is provisional until then.</span></span>
            </div>
            {p?.issued_at && <Link href="/home" className="block text-center text-sm font-black py-3 rounded-2xl bg-white text-slate-950">Car options are unlocked in your Blueprint →</Link>}
          </div>
        )}

        {stage === "eye" && <EyeTest onDone={async (ok) => finish(await recordStage("eye", ok))} />}
        {stage === "theory" && <TheoryExam onDone={(next) => finish(next)} />}
        {stage === "yard" && <SmartYard onDone={async (ok) => { if (ok) gameAudio.playConfirmSound(); finish(await recordStage("yard", ok)); }} />}
        {stage !== null && <button onClick={() => setStage(null)} className="w-full text-xs font-bold text-slate-500">Leave this test</button>}
      </div>
      <BottomNav />
    </main>
  );
}

// ---------------------------------------------------------------- stage 1

function EyeTest({ onDone }: { onDone: (passed: boolean) => void }) {
  const [part, setPart] = useState<"vision" | "reflex" | "result">("vision");
  const [shapes, setShapes] = useState(false);
  const [round, setRound] = useState(0);
  const [hits, setHits] = useState(0);
  const [board, setBoard] = useState(() => newBoard(0));
  const [times, setTimes] = useState<number[]>([]);
  const [light, setLight] = useState<"wait" | "red" | "green" | "early">("wait");
  const shownAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function newBoard(r: number) {
    const hue = Math.floor(Math.random() * 360);
    return { hue, odd: Math.floor(Math.random() * 16), diff: Math.max(8, 26 - r * 4) };
  }
  const pick = (i: number) => {
    const ok = i === board.odd;
    if (ok) gameAudio.playClickSound();
    const h = hits + (ok ? 1 : 0);
    setHits(h);
    if (round + 1 >= 5) { setPart(h >= 4 ? "reflex" : "result"); return; }
    setRound(round + 1); setBoard(newBoard(round + 1));
  };
  const arm = () => {
    setLight("red");
    timer.current = setTimeout(() => { shownAt.current = performance.now(); setLight("green"); }, 1500 + Math.random() * 2500);
  };
  const tap = () => {
    if (light === "red") { if (timer.current) clearTimeout(timer.current); setLight("early"); return; }
    if (light !== "green") return;
    const t = [...times, Math.round(performance.now() - shownAt.current)];
    setTimes(t); setLight("wait");
    if (t.length >= 3) setPart("result");
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const passed = hits >= 4 && times.length >= 3 && avg <= 700;

  if (part === "vision") return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-black"><span>Vision {round + 1}/5 · tap the odd one</span>
        <button onClick={() => setShapes(!shapes)} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10">{shapes ? "Use colours" : "Colour-blind? Use shapes"}</button></div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 16 }, (_, i) => {
          const odd = i === board.odd;
          return (
            <button key={`${round}-${i}`} onClick={() => pick(i)} aria-label={`Tile ${i + 1}`} className="aspect-square rounded-2xl flex items-center justify-center"
              style={shapes ? { background: "#1e293b" } : { background: `hsl(${board.hue} 65% ${odd ? 50 + board.diff / 2 : 50}%)` }}>
              {shapes && <span className="block bg-sky-400" style={{ width: odd ? 30 - board.diff / 4 : 30, height: 30, borderRadius: odd ? "50%" : `${Math.max(4, 14 - board.diff / 3)}px` }} />}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (part === "reflex") return (
    <div className="space-y-3 text-center">
      <p className="text-sm font-black">Reflex {times.length + 1}/3 · tap when the light turns green</p>
      <button onClick={light === "wait" || light === "early" ? arm : tap}
        className={`w-full aspect-square max-h-80 rounded-3xl font-black text-xl ${light === "green" ? "bg-emerald-500 text-slate-950" : light === "red" ? "bg-rose-600" : "bg-slate-800"}`}>
        {light === "wait" ? "Tap to start" : light === "red" ? "Wait…" : light === "green" ? "TAP!" : "Too early! Tap to retry"}
      </button>
      {times.length > 0 && <p className="text-xs text-slate-400">Times: {times.map((t) => `${t} ms`).join(" · ")}</p>}
    </div>
  );

  return (
    <div className="rounded-3xl bg-slate-900 p-5 text-center space-y-3">
      <p className="text-4xl">{passed ? "👁️✅" : "👁️"}</p>
      <p className="font-black text-lg">{passed ? "Eye & reflex test passed" : "Not this time"}</p>
      <p className="text-sm text-slate-300">Vision {hits}/5 (4 needed){times.length ? ` · average reaction ${avg} ms (700 or less needed)` : ""}</p>
      <button onClick={() => onDone(passed)} className="w-full h-12 rounded-2xl bg-white text-slate-950 font-black">{passed ? "Continue" : "Back to the academy"}</button>
    </div>
  );
}

// ---------------------------------------------------------------- stage 2

function TheoryExam({ onDone }: { onDone: (p: DrivingProgress | null) => void }) {
  const [paper] = useState(drawExam);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean; progress: DrivingProgress | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const q = THEORY.questions[paper[i]];

  const handIn = async () => {
    setBusy(true); setError(null);
    const r = await submitTheory(paper.map((qi) => [qi, answers[qi]] as [number, number]));
    setBusy(false);
    if ("error" in r) return setError(r.error);
    if (r.passed) gameAudio.playConfirmSound();
    setResult(r);
  };

  if (result) return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-slate-900 p-5 text-center space-y-2">
        <p className="text-4xl">{result.passed ? "📝✅" : "📝"}</p>
        <p className="font-black text-lg">{result.passed ? "Theory exam passed" : "Not passed this time"}</p>
        <p className="text-sm text-slate-300">You scored {result.score}% ({THEORY.passPct}% needed)</p>
      </div>
      <div className="space-y-2">
        {paper.filter((qi) => answers[qi] !== THEORY.questions[qi].correctIndex).map((qi) => (
          <div key={qi} className="rounded-2xl bg-white/5 p-3 text-sm">
            <p className="font-bold">{THEORY.questions[qi].q}</p>
            <p className="text-emerald-300 text-xs mt-1">✓ {THEORY.questions[qi].options[THEORY.questions[qi].correctIndex]}</p>
            <p className="text-slate-400 text-xs">{THEORY.questions[qi].why}</p>
          </div>
        ))}
      </div>
      <button onClick={() => onDone(result.progress)} className="w-full h-12 rounded-2xl bg-white text-slate-950 font-black">{result.passed ? "Continue" : "Back to the academy"}</button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-black"><span>Question {i + 1}/{paper.length}</span><span className="text-slate-400">{Object.keys(answers).length} answered</span></div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-sky-500" style={{ width: `${((i + 1) / paper.length) * 100}%` }} /></div>
      <p className="text-lg font-black leading-snug">{q.q}</p>
      <div className="space-y-2">
        {q.options.map((o, oi) => (
          <button key={oi} onClick={() => { setAnswers({ ...answers, [paper[i]]: oi }); if (i + 1 < paper.length) setTimeout(() => setI(i + 1), 180); }}
            className={`w-full text-left p-3.5 rounded-2xl border text-sm font-bold ${answers[paper[i]] === oi ? "bg-sky-600 border-sky-400" : "bg-slate-900 border-white/10"}`}>{o}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button disabled={i === 0} onClick={() => setI(i - 1)} className="flex-1 h-11 rounded-2xl bg-white/10 font-black text-sm disabled:opacity-30">Back</button>
        {i + 1 < paper.length
          ? <button onClick={() => setI(i + 1)} className="flex-1 h-11 rounded-2xl bg-white/10 font-black text-sm">Next</button>
          : <button disabled={busy || Object.keys(answers).length < paper.length} onClick={handIn} className="flex-1 h-11 rounded-2xl bg-emerald-600 font-black text-sm disabled:opacity-40">{busy ? "Marking…" : "Hand in"}</button>}
      </div>
      {error && <p className="text-xs font-bold text-rose-400 text-center">{error}</p>}
      <p className="text-[10px] text-slate-500 text-center">General road-safety knowledge for an in-game license. Always follow the official traffic rules.</p>
    </div>
  );
}
