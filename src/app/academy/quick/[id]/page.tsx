"use client";

// A quick course (/academy/quick/<id>): enrol and pay, read three short lessons, answer three questions (two right to
// pass) and take the certificate, with the course's skill (lib/academy/quick). On its campus's city only.

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { refreshCitizen, useRequireCitizen } from "@/lib/citizenStore";
import { completeQuick, enrollQuick, myQuickCourses, quickCourse } from "@/lib/academy/quick";
import { CITIES, type CityId } from "@/lib/city/cities";
import { getPlace } from "@/lib/city/places";
import { gainSkill, SKILLS } from "@/lib/life";
import { gameAudio } from "@/utils/gameAudio";
import "@/lib/city/cities";

type Step = "intro" | "lesson" | "quiz" | "done";

export default function QuickCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const course = quickCourse(id);
  const { citizen } = useRequireCitizen();
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [lesson, setLesson] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ passed: boolean; score: number } | null>(null);
  const [certificateAt, setCertificateAt] = useState<string | null>(null);

  // Already taken: straight to the certificate; enrolled: on to the lessons.
  useEffect(() => {
    void myQuickCourses().then((list) => {
      const mine = list.find((x) => x.course === id);
      if (mine?.completed_at) { setCertificateAt(mine.completed_at); setStep("done"); setResult({ passed: true, score: mine.score ?? 3 }); }
      else if (mine) setStep("lesson");
    });
  }, [id]);

  if (!course) return <main className="min-h-[100dvh] bg-slate-950 text-white p-6">That course doesn&apos;t exist. <Link href="/explore" className="underline">Back to the map</Link></main>;
  const campus = getPlace(course.place)?.name ?? "The campus";
  const city = CITIES[course.city as CityId];
  const skill = SKILLS.find((s) => s.id === course.skill);

  const enrol = async () => {
    setBusy(true); setError(null);
    const r = await enrollQuick(course.id);
    setBusy(false);
    if (r.error) { setError(r.error); return; }
    gameAudio.playCoinSound(); void refreshCitizen();
    setStep("lesson"); setLesson(0);
  };
  const submit = async () => {
    setBusy(true); setError(null);
    const r = await completeQuick(course.id, answers);
    setBusy(false);
    if (r.error || !r.data) { setError(r.error ?? "Couldn't mark your quiz."); return; }
    setResult(r.data);
    if (r.data.passed) { gameAudio.sfx?.("chime"); gainSkill(course.skill, course.xp); setCertificateAt(new Date().toISOString()); }
    setStep("done");
  };

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950 text-white pb-16">
      <div className="max-w-md mx-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] space-y-4">
        <header className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-4 h-4" /></button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Quick course · {campus}</p>
            <h1 className="text-xl font-black leading-tight">{course.icon} {course.title}</h1>
          </div>
        </header>

        <section className="rounded-3xl bg-white text-slate-900 p-5 space-y-4 shadow-2xl">
          {step === "intro" && (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-slate-50 p-2"><p className="text-lg font-black">{course.minutes}</p><p className="text-[10px] text-slate-500 font-bold">minutes</p></div>
                <div className="rounded-2xl bg-slate-50 p-2"><p className="text-lg font-black">{course.lessons.length}</p><p className="text-[10px] text-slate-500 font-bold">lessons</p></div>
                <div className="rounded-2xl bg-slate-50 p-2"><p className="text-lg font-black">{course.quiz.length}</p><p className="text-[10px] text-slate-500 font-bold">questions</p></div>
              </div>
              <ul className="space-y-1 text-sm">{course.lessons.map((l, i) => <li key={l.title} className="flex gap-2"><span className="font-black text-indigo-600">{i + 1}</span>{l.title}</li>)}</ul>
              <p className="text-sm text-slate-600">Pass with two of three right for your certificate and <b>{skill?.name ?? course.skill}</b> experience. Retakes are free. Taught in {city.name}.</p>
              {error && <p className="rounded-xl bg-rose-600 text-white text-sm font-bold px-3 py-2">{error}</p>}
              <button disabled={busy || !citizen} onClick={() => void enrol()} className="w-full h-14 rounded-2xl bg-indigo-600 text-white text-base font-black disabled:opacity-50">{busy ? "Enrolling…" : `Enrol · AED ${course.fee}`}</button>
            </>
          )}
          {step === "lesson" && (
            <>
              <div className="flex gap-1.5">{course.lessons.map((_, i) => <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= lesson ? "bg-indigo-600" : "bg-slate-200"}`} />)}</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Lesson {lesson + 1} of {course.lessons.length}</p>
              <h2 className="text-lg font-black">{course.lessons[lesson].title}</h2>
              <ul className="space-y-2.5">{course.lessons[lesson].points.map((pt) => <li key={pt} className="flex gap-2 text-[15px] leading-snug"><span className="text-indigo-500 shrink-0">•</span>{pt}</li>)}</ul>
              <div className="flex gap-2">
                {lesson > 0 && <button onClick={() => setLesson(lesson - 1)} className="flex-1 h-12 rounded-2xl bg-slate-100 font-bold">Back</button>}
                <button onClick={() => { if (lesson + 1 < course.lessons.length) setLesson(lesson + 1); else { setStep("quiz"); setAnswers([]); } }} className="flex-[2] h-12 rounded-2xl bg-indigo-600 text-white font-black">
                  {lesson + 1 < course.lessons.length ? "Next lesson" : "Take the quiz"}
                </button>
              </div>
            </>
          )}
          {step === "quiz" && (
            <>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Quiz · two of three to pass</p>
              {course.quiz.map((q, qi) => (
                <div key={q.q} className="space-y-1.5">
                  <p className="font-black text-[15px]">{qi + 1}. {q.q}</p>
                  {q.options.map((o, oi) => (
                    <button key={o} onClick={() => setAnswers((a) => { const n = [...a]; n[qi] = oi; return n; })}
                      className={`w-full text-left min-h-11 px-3 py-2 rounded-xl border-2 text-sm font-bold ${answers[qi] === oi ? "border-indigo-600 bg-indigo-50" : "border-slate-200"}`}>{o}</button>
                  ))}
                </div>
              ))}
              {error && <p className="rounded-xl bg-rose-600 text-white text-sm font-bold px-3 py-2">{error}</p>}
              <button disabled={busy || course.quiz.some((_, i) => answers[i] === undefined)} onClick={() => void submit()} className="w-full h-14 rounded-2xl bg-indigo-600 text-white text-base font-black disabled:opacity-40">{busy ? "Marking…" : "Submit answers"}</button>
            </>
          )}
          {step === "done" && result && (
            result.passed ? (
              <div className="text-center space-y-3">
                <div className="rounded-2xl border-4 border-double border-amber-400 p-4 bg-amber-50">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-700">Certificate of completion</p>
                  <p className="mt-1 text-lg font-black">{citizen?.name ?? citizen?.username}</p>
                  <p className="text-sm">{course.icon} {course.title}</p>
                  <p className="text-xs text-slate-500">{campus} · {result.score}/3 · {certificateAt ? new Date(certificateAt).toLocaleDateString() : ""}</p>
                </div>
                <p className="text-sm font-bold text-emerald-700">+{course.xp} {skill?.name ?? course.skill} experience</p>
                <Link href={`${city.path}?open=${course.place}`} className="block w-full h-12 leading-[3rem] rounded-2xl bg-slate-900 text-white font-black">Back to {campus}</Link>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-lg font-black">{result.score}/3: not quite</p>
                <p className="text-sm text-slate-600">Read the lessons again and retake the quiz, free.</p>
                <button onClick={() => { setStep("lesson"); setLesson(0); setResult(null); }} className="w-full h-12 rounded-2xl bg-indigo-600 text-white font-black">Read the lessons again</button>
              </div>
            )
          )}
        </section>
      </div>
    </main>
  );
}
