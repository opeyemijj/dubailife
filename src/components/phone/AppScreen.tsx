"use client";

// Building blocks for apps inside the phone: a white screen with a back arrow and title, cards, buttons
// and a three-question quiz (job interviews, a doctor's prescription, a lawyer's defence).

import { useState } from "react";
import { ChevronLeft } from "lucide-react";

export function AppScreen({ title, onBack, children, accent = "text-sky-600", right }: {
  title: React.ReactNode; onBack: () => void; children: React.ReactNode; accent?: string; right?: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 bg-white text-slate-900 flex flex-col pt-12">
      <div className="flex items-center gap-2 px-4 pb-3">
        <button onClick={onBack} aria-label="Back" className={`w-10 h-10 -ml-2 flex items-center justify-center ${accent}`}><ChevronLeft className="w-7 h-7" /></button>
        <h2 className="flex-1 min-w-0 text-[28px] font-black tracking-tight truncate">{title}</h2>
        {right}
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10 space-y-3">{children}</div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[28px] bg-slate-100/80 p-4 space-y-3 ${className}`}>{children}</div>;
}

export function Big({ children, onClick, disabled, tone = "green" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; tone?: "green" | "dark" | "light" | "red" | "blue" }) {
  const tones = {
    green: "bg-emerald-700 text-white shadow-[inset_0_-4px_0_rgba(0,0,0,0.22)]",
    dark: "bg-slate-900 text-white shadow-[inset_0_-4px_0_rgba(0,0,0,0.3)]",
    light: "bg-white text-slate-800 border border-slate-200",
    red: "bg-rose-600 text-white shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)]",
    blue: "bg-sky-600 text-white shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)]",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`w-full min-h-[52px] px-4 rounded-full font-semibold text-[17px] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100 ${tones[tone]}`}>
      {children}
    </button>
  );
}

export function Note({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{children}</p>;
}

export const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;

/** Three questions, one at a time; calls onDone with the chosen option for each. */
export function Quiz({ title, intro, questions, onDone, onCancel, submitLabel = "Submit answers" }: {
  title: string; intro?: string; questions: Array<{ q: string; options: string[] }>; onDone: (answers: number[]) => void; onCancel: () => void; submitLabel?: string;
}) {
  const [answers, setAnswers] = useState<number[]>([]);
  const i = answers.length;
  const q = questions[i];
  return (
    <Card className="bg-sky-50">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-lg">{title}</h3>
        <span className="text-sm font-semibold text-slate-500">{Math.min(i + 1, questions.length)} / {questions.length}</span>
      </div>
      {intro && i === 0 && <p className="text-slate-600">{intro}</p>}
      {q ? (
        <>
          <p className="font-semibold text-[17px] leading-snug">{q.q}</p>
          <div className="space-y-2">
            {q.options.map((o, k) => (
              <button key={k} onClick={() => setAnswers([...answers, k])} className="w-full text-left px-4 py-3 rounded-2xl bg-white border border-slate-200 hover:border-sky-400 active:scale-[0.98] transition">{o}</button>
            ))}
          </div>
        </>
      ) : (
        <Big onClick={() => onDone(answers)}>{submitLabel}</Big>
      )}
      <button onClick={onCancel} className="w-full text-sm font-semibold text-slate-500">Cancel</button>
    </Card>
  );
}
