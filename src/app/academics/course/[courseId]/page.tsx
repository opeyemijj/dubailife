"use client";

import { ShareButton } from "@/components/share/ShareButton";
import { askForPush } from "@/lib/push/engage";
import { gainSkill, skillForCourse } from "@/lib/life";
import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  Coins,
  ShieldAlert,
  Wrench,
  Terminal,
  FileCode,
} from "lucide-react";
import { useCitizen, enrollInCourse, completeLesson, graduateCourse } from "@/lib/citizenStore";
import { getCourse, getCampus, calculateTuition } from "@/lib/city/academic";
import { academyProgress, submitStep, unlockAt, untilText, type AcademyProgress } from "@/lib/academy/progress";
import { honorsFor } from "@/lib/academy/grade";
import { BottomNav } from "@/components/layout/BottomNav";
import { gameAudio } from "@/utils/gameAudio";

export default function CourseViewerPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const course = getCourse(courseId);
  // What one module is called: "Week" for courses, "Chapter" for books.
  const unit = course?.unitLabel ?? "Week";
  const { citizen } = useCitizen();

  const [activeTab, setActiveTab] = useState<"syllabus" | "lesson" | "exam">("syllabus");
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  // Case Study State
  const [caseStudyChoice, setCaseStudyChoice] = useState<number | null>(null);

  // Lesson Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Exam State
  const [examStarted, setExamStarted] = useState(false);
  const [examSecondsLeft, setExamSecondsLeft] = useState(180);
  const [examAnswers, setExamAnswers] = useState<Record<number, number>>({});
  const [examResult, setExamResult] = useState<{
    score: number;
    passed: boolean;
    honors: "Pass" | "Cum Laude" | "Magna Cum Laude" | "Summa Cum Laude";
  } | null>(null);

  // Progress recorded on the server: lessons in order, one new lesson (or the exam) a day.
  const [progress, setProgress] = useState<AcademyProgress | null | undefined>(undefined);
  const [stepNote, setStepNote] = useState<string | null>(null);
  const submitting = useRef(false);
  useEffect(() => { void academyProgress(courseId).then(setProgress); }, [courseId]);

  // Certificate Modal State
  const [showCertificate, setShowCertificate] = useState(false);

  // Smooth scroll refs for horizontal chapters & quiz
  const chapterScrollRef = useRef<HTMLDivElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);
  const quizSectionRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active chapter into center view
  useEffect(() => {
    if (selectedButtonRef.current) {
      selectedButtonRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedLessonIdx, activeTab]);

  const scrollToQuiz = () => {
    if (quizSectionRef.current) {
      quizSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!course) {
    notFound();
  }

  const campus = getCampus(course.institutionId);
  const enrollment = citizen?.academic?.enrolled?.[course.id];
  const isEnrolled = !!enrollment;
  const isGraduated = !!enrollment?.examPassed;
  const completedLessons = enrollment?.completedLessons ?? [];
  const tuition = calculateTuition(course, citizen);

  const activeLesson = course.lessons[selectedLessonIdx] ?? course.lessons[0];
  // Before anything is recorded on the server, progress made earlier in the app counts once.
  const serverPassed = progress ? progress.passed : completedLessons.length;
  const nextStep = serverPassed + 1;
  const lockedUntil = unlockAt(progress ?? null);
  const allLessonsCompleted = serverPassed >= course.lessons.length;
  const lessonGate = (n: number): string | null =>
    n <= serverPassed || completedLessons.includes(n) ? null
      : n > nextStep ? `Pass ${unit} ${nextStep} first. ${unit}s go in order.`
      : lockedUntil ? `Your next ${unit.toLowerCase()} unlocks in ${untilText(lockedUntil)}. One new ${unit.toLowerCase()} a day.`
      : null;

  // Timer countdown for exam
  useEffect(() => {
    if (!examStarted || examResult !== null) return;
    if (examSecondsLeft <= 0) {
      handleFinishExam();
      return;
    }
    const timer = setInterval(() => {
      setExamSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [examStarted, examSecondsLeft, examResult]);

  const handleEnroll = () => {
    if ((citizen?.balance ?? 0) < tuition.final) {
      alert(`Insufficient funds. You need ${tuition.final.toLocaleString()} AED.`);
      return;
    }
    gameAudio.playCoinSound();
    const ok = enrollInCourse(course.id, tuition.final);
    if (ok) {
      setTimeout(() => askForPush({ icon: "📚", title: "Don't miss tomorrow's lesson", text: "Turn on notifications and we'll remind you when your next lesson unlocks." }), 1500);
      setActiveTab("lesson");
      setSelectedLessonIdx(0);
      setCurrentSlideIdx(0);
    }
  };

  const handleLessonQuizSubmit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setStepNote(null);
    const answers = activeLesson.quiz.map((_, idx) => quizAnswers[idx] ?? null);
    const r = await submitStep(course, activeLesson.lessonNumber, answers, completedLessons.length);
    submitting.current = false;
    if ("error" in r) { setStepNote(r.error); return; }
    if (r.status === "locked" || r.status === "out_of_order") {
      setStepNote(r.status === "locked" && r.unlockAt ? `Saved for later: your next ${unit.toLowerCase()} unlocks in ${untilText(new Date(r.unlockAt))}.` : `Pass ${unit} ${r.next} first.`);
      return;
    }
    setQuizSubmitted(true);
    if (r.status !== "failed") {
      gameAudio.playClickSound();
      if (!completedLessons.includes(activeLesson.lessonNumber)) {
        completeLesson(course.id, activeLesson.lessonNumber);
        gainSkill(skillForCourse(course.category), 25);
      }
    }
    void academyProgress(course.id).then(setProgress);
  };

  const handleStartExam = () => {
    gameAudio.playClickSound();
    setExamStarted(true);
    setExamSecondsLeft(course.finalExam.durationSeconds || 180);
    setExamAnswers({});
    setExamResult(null);
  };

  const handleFinishExam = async () => {
    if (submitting.current) return;
    submitting.current = true;
    const answers = course.finalExam.questions.map((_, idx) => examAnswers[idx] ?? null);
    const r = await submitStep(course, course.lessons.length + 1, answers, completedLessons.length);
    submitting.current = false;
    if ("error" in r) { setStepNote(r.error); setExamStarted(false); return; }
    if (r.status === "locked" || r.status === "out_of_order") {
      setStepNote(r.status === "locked" && r.unlockAt ? `The exam unlocks in ${untilText(new Date(r.unlockAt))}.` : `Pass ${unit} ${r.next} first.`);
      setExamStarted(false);
      return;
    }
    const score = r.score;
    const passed = r.status === "graduated_now" || r.status === "graduated";
    const honors = honorsFor(score);
    setExamResult({ score, passed, honors });

    if (passed) {
      gameAudio.playConfirmSound();
      graduateCourse(course.id, score, honors, course.superpower.id, course.level === "secondary_diploma");
      setShowCertificate(true);
    }
    void academyProgress(course.id).then(setProgress);
  };

  return (
    <main className="relative min-h-[100dvh] bg-slate-950 text-white pb-32 overflow-x-hidden">
      {/* Top Banner Gradient */}
      <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-purple-950/40 via-indigo-950/20 to-transparent pointer-events-none" />

      <div className="relative max-w-xl mx-auto px-4 pt-6 space-y-5">
        {/* Navigation Header */}
        <header className="flex items-center justify-between">
          <Link
            href={`/academics/${course.institutionId}`}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">{campus?.shortName}</span>
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs font-black text-amber-300">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              {(citizen?.balance ?? 0).toLocaleString()} AED
            </div>
          </div>
        </header>

        {/* Course Banner */}
        <section className="rounded-3xl bg-slate-900 border border-white/10 p-5 space-y-3 shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl shrink-0">
              {course.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {course.category}
                </span>
                {course.duration && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {course.duration}
                  </span>
                )}
                {isGraduated && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {enrollment?.honors || "Graduated"}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-black text-white mt-1">{course.title}</h1>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{course.tagline}</p>
            </div>
          </div>

          {/* Superpower preview */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs">
            <span className="text-xl">{course.superpower.icon}</span>
            <div>
              <span className="font-black text-purple-300">Superpower Perk: </span>
              <span className="text-slate-300">{course.superpower.name} — {course.superpower.description}</span>
            </div>
          </div>
        </section>

        {/* Tab Controls (Only when enrolled) */}
        {isEnrolled && (
          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setActiveTab("syllabus")}
              className={`flex-1 py-2 px-1 text-center rounded-xl transition-all truncate text-[11px] sm:text-xs font-bold ${
                activeTab === "syllabus" ? "bg-white text-slate-950 shadow-md font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              {unit === "Chapter" ? "Chapters" : "Curriculum"} ({course.lessons.length})
            </button>
            <button
              onClick={() => {
                setActiveTab("lesson");
                setCurrentSlideIdx(0);
                setQuizAnswers({});
                setQuizSubmitted(false);
              }}
              className={`flex-1 py-2 px-1 text-center rounded-xl transition-all truncate text-[11px] sm:text-xs font-bold ${
                activeTab === "lesson" ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              {unit === "Chapter" ? "Read Chapter" : "Interactive Lesson"}
            </button>
            <button
              onClick={() => setActiveTab("exam")}
              className={`flex-1 py-2 px-1 text-center rounded-xl transition-all truncate text-[11px] sm:text-xs font-bold ${
                activeTab === "exam" ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              Final Exam 🎓
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 1: SYLLABUS & ENROLLMENT                                       */}
        {/* ==================================================================== */}
        {(!isEnrolled || activeTab === "syllabus") && (
          <section className="space-y-4">
            {!isEnrolled && (
              <div className="rounded-2xl bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-400/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-purple-300">Enrollment Required</div>
                    <div className="text-xl font-black text-white">Admissions Open</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-300">Tuition</div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-lg font-black text-amber-300">
                        {tuition.final === 0 ? "Free" : `${tuition.final.toLocaleString()} AED`}
                      </span>
                      {tuition.hasDiscount && (
                        <span className="text-xs line-through text-slate-400">{tuition.original.toLocaleString()} AED</span>
                      )}
                    </div>
                  </div>
                </div>

                {tuition.hasDiscount && (
                  <div className="text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 p-2 rounded-xl flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>20% High School Scholarship automatically applied to your tuition!</span>
                  </div>
                )}

                <button
                  onClick={handleEnroll}
                  className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm tracking-wide transition-all shadow-lg hover:scale-[1.01]"
                >
                  Pay Tuition & Enroll ({tuition.final.toLocaleString()} AED)
                </button>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span>Curriculum Breakdown ({course.lessons.length} {unit}s)</span>
                </h2>
                <span className="text-[11px] font-bold text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                  {course.duration || `${course.lessons.length} ${unit}s`}
                </span>
              </div>

              {/* Quick Horizontal Chapter Jumper */}
              {isEnrolled && course.lessons.length > 3 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scroll-smooth no-scrollbar [-webkit-overflow-scrolling:touch]">
                  {course.lessons.map((l, i) => {
                    const isDone = completedLessons.includes(l.lessonNumber);
                    return (
                      <button
                        key={l.id || i}
                        onClick={() => {
                          setSelectedLessonIdx(i);
                          setCurrentSlideIdx(0);
                          setQuizAnswers({});
                          setQuizSubmitted(false);
                          setCaseStudyChoice(null);
                          setActiveTab("lesson");
                        }}
                        className={`shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                          isDone
                            ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50"
                            : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                        }`}
                        title={l.title}
                      >
                        {isDone ? (
                          <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-slate-500" />
                        )}
                        <span>{unit} {l.lessonNumber}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="space-y-2.5">
                {course.lessons.map((lesson, idx) => {
                  const isDone = completedLessons.includes(lesson.lessonNumber);
                  const weekObj = course.weeks?.[idx];
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => {
                        if (isEnrolled) {
                          setSelectedLessonIdx(idx);
                          setCurrentSlideIdx(0);
                          setQuizAnswers({});
                          setQuizSubmitted(false);
                          setActiveTab("lesson");
                        }
                      }}
                      className={`p-4 rounded-2xl border transition-all ${
                        isDone
                          ? "bg-emerald-950/20 border-emerald-500/40 text-white"
                          : "bg-slate-900 border-white/10 hover:border-purple-500/30"
                      } ${isEnrolled ? "cursor-pointer" : "opacity-80"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                              isDone ? "bg-emerald-500 text-slate-950" : "bg-white/10 text-white"
                            }`}
                          >
                            {isDone ? "✓" : `${unit[0]}${lesson.lessonNumber}`}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                                {unit} {lesson.lessonNumber}
                              </span>
                              {isDone && (
                                <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded">
                                  Completed
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-bold text-white leading-snug">{lesson.title}</div>
                            {weekObj?.objective && (
                              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                {weekObj.objective}
                              </p>
                            )}
                            <div className="flex items-center gap-2 pt-1 flex-wrap text-[10px] text-slate-300">
                              <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <BookOpen className="w-2.5 h-2.5 text-purple-400" />
                                {lesson.slides.length} Concept Slides
                              </span>
                              {lesson.lab && (
                                <span className="bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Wrench className="w-2.5 h-2.5" />
                                  Lab: {lesson.lab.title}
                                </span>
                              )}
                              <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                                {lesson.quiz.length}-Q Quiz
                              </span>
                            </div>
                          </div>
                        </div>
                        {isEnrolled && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {isGraduated && (
              <button
                onClick={() => setShowCertificate(true)}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-black text-sm flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>View Certificate</span>
              </button>
            )}
          </section>
        )}

        {/* ==================================================================== */}
        {/* VIEW 2: INTERACTIVE LESSON SLIDE DECK & QUIZZES                     */}
        {/* ==================================================================== */}
        {isEnrolled && activeTab === "lesson" && (
          <section className="space-y-4">
            {/* Lesson / Chapter Module Selector with Internal Horizontal Scroll */}
            <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-3 space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="font-black text-purple-300 uppercase tracking-wider text-[11px] shrink-0">
                    {unit} {activeLesson.lessonNumber} of {course.lessons.length}
                  </span>
                  <span className="hidden sm:inline text-slate-500">•</span>
                  <span className="hidden sm:inline text-xs font-bold text-slate-200 truncate">
                    {activeLesson.title}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    disabled={selectedLessonIdx === 0}
                    onClick={() => {
                      setSelectedLessonIdx((p) => Math.max(0, p - 1));
                      setCurrentSlideIdx(0);
                      setQuizAnswers({});
                      setQuizSubmitted(false);
                      setCaseStudyChoice(null);
                    }}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-300 transition-colors"
                    aria-label={`Previous ${unit}`}
                    title={`Previous ${unit}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={selectedLessonIdx === course.lessons.length - 1}
                    onClick={() => {
                      setSelectedLessonIdx((p) => Math.min(course.lessons.length - 1, p + 1));
                      setCurrentSlideIdx(0);
                      setQuizAnswers({});
                      setQuizSubmitted(false);
                      setCaseStudyChoice(null);
                    }}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-300 transition-colors"
                    aria-label={`Next ${unit}`}
                    title={`Next ${unit}`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Internal Horizontal Scrollable Track */}
              <div className="relative">
                <div
                  ref={chapterScrollRef}
                  className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scroll-smooth no-scrollbar [-webkit-overflow-scrolling:touch]"
                >
                  {course.lessons.map((l, i) => {
                    const isDone = completedLessons.includes(l.lessonNumber);
                    const isSelected = selectedLessonIdx === i;
                    return (
                      <button
                        key={l.id || i}
                        ref={isSelected ? selectedButtonRef : undefined}
                        onClick={() => {
                          setSelectedLessonIdx(i);
                          setCurrentSlideIdx(0);
                          setQuizAnswers({});
                          setQuizSubmitted(false);
                          setCaseStudyChoice(null);
                        }}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-purple-600 text-white shadow-md shadow-purple-600/40 ring-2 ring-purple-400 font-black"
                            : isDone
                              ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50"
                              : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                        }`}
                        title={l.title}
                      >
                        {isDone ? (
                          <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-white" : "bg-slate-500"}`} />
                        )}
                        <span>{unit} {l.lessonNumber}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Slide Card Deck */}
            {activeLesson.slides[currentSlideIdx] && (
              <div className="rounded-3xl bg-slate-900 border border-purple-500/30 p-6 space-y-4 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-purple-300 font-bold border-b border-white/10 pb-2">
                  <span>Interactive Concept Deck</span>
                  <span>Slide {currentSlideIdx + 1} of {activeLesson.slides.length}</span>
                </div>

                <h3 className="text-lg font-black text-white">
                  {activeLesson.slides[currentSlideIdx].title}
                </h3>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {activeLesson.slides[currentSlideIdx].content || activeLesson.slides[currentSlideIdx].body}
                </p>

                {activeLesson.slides[currentSlideIdx].bullets && activeLesson.slides[currentSlideIdx].bullets!.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {activeLesson.slides[currentSlideIdx].bullets!.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-2 text-xs text-slate-200">
                        <span className="text-purple-400 font-bold shrink-0 mt-0.5">•</span>
                        <span className="leading-relaxed">{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeLesson.slides[currentSlideIdx].codeSnippet && (
                  <div className="rounded-2xl bg-slate-950 border border-white/10 p-3.5 space-y-1.5 shadow-inner">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400">
                      <Terminal className="w-3 h-3 text-emerald-400" />
                      <span>Applied Protocol / Code Specification:</span>
                    </div>
                    <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                      {activeLesson.slides[currentSlideIdx].codeSnippet}
                    </pre>
                  </div>
                )}

                {activeLesson.slides[currentSlideIdx].highlight && (
                  <div className="p-3.5 rounded-2xl bg-purple-950/50 border border-purple-400/30 text-xs text-purple-200 font-medium italic">
                    💡 &quot;{activeLesson.slides[currentSlideIdx].highlight}&quot;
                  </div>
                )}

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
                  <span className="font-bold text-amber-400">Core Takeaway: </span>
                  <span className="text-slate-300">{activeLesson.slides[currentSlideIdx].takeaway}</span>
                </div>

                {/* Slide Nav Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    disabled={currentSlideIdx === 0}
                    onClick={() => setCurrentSlideIdx((prev) => Math.max(0, prev - 1))}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  {currentSlideIdx < activeLesson.slides.length - 1 ? (
                    <button
                      onClick={() => setCurrentSlideIdx((prev) => Math.min(activeLesson.slides.length - 1, prev + 1))}
                      className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-black flex items-center gap-1 text-white shadow-md shadow-purple-600/30 transition-colors"
                    >
                      Next Slide <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={scrollToQuiz}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black flex items-center gap-1.5 text-white shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02]"
                    >
                      <span>Go to Quiz</span>
                      <span className="text-sm">↓</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Practical Lab Section */}
            {activeLesson.lab && (
              <div className="rounded-3xl bg-slate-900 border border-indigo-500/40 p-5 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-indigo-400 uppercase tracking-wider">
                    <Wrench className="w-4 h-4" />
                    <span>{unit} {activeLesson.lessonNumber} Practical Lab</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Hands-on Lab
                  </span>
                </div>

                <h4 className="text-sm font-black text-white">{activeLesson.lab.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{activeLesson.lab.brief}</p>

                <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 space-y-2 text-xs">
                  {activeLesson.lab.deliverable && (
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-indigo-300 shrink-0">Deliverable:</span>
                      <span className="text-slate-300">{activeLesson.lab.deliverable}</span>
                    </div>
                  )}
                  {activeLesson.lab.proTip && (
                    <div className="flex items-start gap-2 pt-1 border-t border-indigo-500/20 text-[11px] text-amber-300 italic">
                      <span className="font-bold shrink-0">💡 Pro Tip:</span>
                      <span>{activeLesson.lab.proTip}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Case Study Dilemma */}
            {activeLesson.caseStudy && (
              <div className="rounded-3xl bg-slate-900 border border-amber-500/30 p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Real-World Dubai Case Study</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {activeLesson.caseStudy.scenario}
                </p>

                <div className="space-y-2 pt-1">
                  {activeLesson.caseStudy.options.map((opt, oIdx) => {
                    const isSelected = caseStudyChoice === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => {
                          gameAudio.playClickSound();
                          setCaseStudyChoice(oIdx);
                        }}
                        className={`w-full text-left p-3 rounded-2xl text-xs border transition-all ${
                          isSelected
                            ? opt.correct
                              ? "bg-emerald-950/60 border-emerald-400 text-emerald-200"
                              : "bg-rose-950/60 border-rose-400 text-rose-200"
                            : "bg-white/5 border-white/10 hover:border-white/20 text-slate-300"
                        }`}
                      >
                        <div className="font-bold">{opt.text}</div>
                        {isSelected && (
                          <div className="mt-1 text-[11px] opacity-90">{opt.explanation}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5-Question Checkpoint Quiz */}
            <div ref={quizSectionRef} className="rounded-3xl bg-slate-900 border border-white/10 p-5 space-y-4 scroll-mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-black text-white">
                    {unit} {activeLesson.lessonNumber} Checkpoint Quiz ({activeLesson.quiz.length} {activeLesson.quiz.length === 1 ? "Question" : "Questions"})
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-slate-400">70% Required to Pass</span>
              </div>

              <div className="space-y-4">
                {activeLesson.quiz.map((q, qIdx) => (
                  <div key={qIdx} className="space-y-2 p-3.5 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-xs font-bold text-white leading-relaxed">
                      {qIdx + 1}. {q.question}
                    </div>

                    <div className="space-y-1.5">
                      {q.options.map((opt, oIdx) => {
                        const isChosen = quizAnswers[qIdx] === oIdx;
                        const isCorrect = q.correctIndex === oIdx;

                        let style = "bg-black/30 border-white/10 text-slate-300 hover:border-white/30";
                        if (quizSubmitted) {
                          if (isCorrect) style = "bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold";
                          else if (isChosen) style = "bg-rose-950/80 border-rose-500 text-rose-200";
                        } else if (isChosen) {
                          style = "bg-purple-900/60 border-purple-400 text-white font-bold";
                        }

                        return (
                          <button
                            key={oIdx}
                            disabled={quizSubmitted}
                            onClick={() => {
                              gameAudio.playClickSound();
                              setQuizAnswers((prev) => ({ ...prev, [qIdx]: oIdx }));
                            }}
                            className={`w-full text-left p-2.5 rounded-xl text-xs border transition-colors ${style}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {quizSubmitted && (
                      <div className="text-[11px] text-slate-300 italic pt-1 border-t border-white/5">
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {stepNote && <p className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-xs font-bold text-amber-200">{stepNote}</p>}
              {!quizSubmitted && lessonGate(activeLesson.lessonNumber) ? (
                <p className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" /> {lessonGate(activeLesson.lessonNumber)} You can still read it now.
                </p>
              ) : !quizSubmitted ? (
                <button
                  disabled={Object.keys(quizAnswers).length < activeLesson.quiz.length}
                  onClick={handleLessonQuizSubmit}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black text-xs transition-colors"
                >
                  Submit Checkpoint Quiz
                </button>
              ) : (
                <div className="space-y-2">
                  {completedLessons.includes(activeLesson.lessonNumber) ? (
                    <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 font-bold flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                      <span className="flex items-center gap-1.5 leading-snug">
                        <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>{unit} completed! You unlocked the next {unit.toLowerCase()}.</span>
                      </span>
                      {selectedLessonIdx < course.lessons.length - 1 && (
                        <button
                          onClick={() => {
                            setSelectedLessonIdx((p) => p + 1);
                            setCurrentSlideIdx(0);
                            setQuizAnswers({});
                            setQuizSubmitted(false);
                            setCaseStudyChoice(null);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-black text-xs shrink-0 self-end sm:self-auto transition-colors"
                        >
                          Next {unit} →
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 font-bold flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                      <span className="leading-snug">Score below 70%. Review slides and try again!</span>
                      <button
                        onClick={() => {
                          setQuizAnswers({});
                          setQuizSubmitted(false);
                        }}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-black text-xs shrink-0 self-end sm:self-auto transition-colors"
                      >
                        Retry Quiz
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* VIEW 3: TIMED FINAL EXAMINATION                                     */}
        {/* ==================================================================== */}
        {isEnrolled && activeTab === "exam" && (
          <section className="space-y-4">
            {!examStarted ? (
              <div className="rounded-3xl bg-slate-900 border border-amber-500/30 p-6 space-y-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-3xl mx-auto">
                  🎓
                </div>
                <h3 className="text-xl font-black text-white">Comprehensive Final Examination</h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                  Test your mastery across all course curriculum modules. The exam consists of{" "}
                  <strong>{course.finalExam.questions.length} questions</strong> with a{" "}
                  <strong>{Math.floor((course.finalExam.durationSeconds || 180) / 60)} minute</strong> countdown timer.
                </p>

                <div className="grid grid-cols-3 gap-2 text-xs py-2">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="font-bold text-white">70%+</div>
                    <div className="text-[10px] text-slate-400">Cum Laude</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="font-bold text-amber-300">85%+</div>
                    <div className="text-[10px] text-slate-400">Magna Cum Laude</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="font-bold text-emerald-400">95%+</div>
                    <div className="text-[10px] text-slate-400">Summa Cum Laude</div>
                  </div>
                </div>

                {stepNote && <p className="text-xs font-bold text-amber-300">{stepNote}</p>}
                {allLessonsCompleted && lockedUntil ? (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>The final exam unlocks in {untilText(lockedUntil)}. One new step a day.</span>
                  </div>
                ) : allLessonsCompleted ? (
                  <button
                    onClick={handleStartExam}
                    className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm tracking-wide shadow-lg transition-transform hover:scale-[1.01]"
                  >
                    Start Timed Final Exam (180s)
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400 flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>Complete all lessons first to unlock the final exam.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Exam Timer Bar */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-amber-500/40 text-xs font-black">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Clock className="w-4 h-4" />
                    <span>Time Remaining:</span>
                  </span>
                  <span className={`text-base ${examSecondsLeft < 30 ? "text-rose-400 animate-pulse" : "text-white"}`}>
                    {Math.floor(examSecondsLeft / 60)}:{String(examSecondsLeft % 60).padStart(2, "0")}
                  </span>
                </div>

                {/* Exam Questions */}
                <div className="space-y-4">
                  {course.finalExam.questions.map((q, qIdx) => (
                    <div key={qIdx} className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2.5">
                      <div className="text-xs font-black text-white">
                        {qIdx + 1}. {q.question}
                      </div>
                      <div className="space-y-1.5">
                        {q.options.map((opt, oIdx) => {
                          const isChosen = examAnswers[qIdx] === oIdx;
                          return (
                            <button
                              key={oIdx}
                              disabled={examResult !== null}
                              onClick={() => {
                                gameAudio.playClickSound();
                                setExamAnswers((prev) => ({ ...prev, [qIdx]: oIdx }));
                              }}
                              className={`w-full text-left p-2.5 rounded-xl text-xs border transition-colors ${
                                isChosen
                                  ? "bg-amber-600/80 border-amber-400 text-white font-bold"
                                  : "bg-white/5 border-white/10 text-slate-300 hover:border-white/20"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {examResult === null ? (
                  <button
                    onClick={handleFinishExam}
                    className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm tracking-wide shadow-lg"
                  >
                    Submit Final Exam
                  </button>
                ) : (
                  <div className="p-5 rounded-3xl bg-slate-900 border border-white/20 text-center space-y-3">
                    <div className="text-3xl">{examResult.passed ? "🎉" : "❌"}</div>
                    <h4 className="text-lg font-black text-white">
                      Exam Result: {examResult.score}% — {examResult.passed ? examResult.honors : "Did Not Pass"}
                    </h4>
                    {examResult.passed ? (
                      <div>
                        <p className="text-xs text-slate-300">
                          Congratulations! You have officially graduated and unlocked your degree, verified profile credential, and gameplay superpower!
                        </p>
                        <button
                          onClick={() => setShowCertificate(true)}
                          className="mt-3 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs"
                        >
                          View Certificate & Honors
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-slate-400">Passing threshold is 70%. Please review the lessons and retake the exam.</p>
                        <button
                          onClick={handleStartExam}
                          className="mt-3 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs"
                        >
                          Retake Exam
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ==================================================================== */}
      {/* GRADUATION DIPLOMA / CERTIFICATE MODAL                               */}
      {/* ==================================================================== */}
      {showCertificate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-amber-50 to-amber-100 text-slate-950 p-5 sm:p-7 shadow-2xl border-4 border-amber-500 space-y-4">
            {/* Certificate Header */}
            <div className="text-center space-y-1">
              <div className="text-3xl sm:text-4xl">{campus?.crestIcon}</div>
              <div className="text-xs font-black uppercase tracking-widest text-amber-800">{campus?.name}</div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-600">
                Come To Dubai in-game certificate
              </div>
            </div>

            <div className="text-center py-2 space-y-1 border-y border-amber-300">
              <div className="text-xs text-slate-600">This certifies that</div>
              <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight underline decoration-amber-500 underline-offset-4">
                {citizen?.name || "Distinguished Citizen"}
              </div>
              <div className="text-xs text-slate-600">has successfully completed all requirements for</div>
              <div className="text-sm sm:text-base font-black text-amber-900">{course.title}</div>
              <div className="text-xs font-bold text-amber-800">
                Honors Awarded: <span className="underline">{enrollment?.honors || examResult?.honors || "Cum Laude"}</span>
              </div>
            </div>

            {/* Superpower and Cap & Gown Unlock */}
            <div className="p-3 rounded-2xl bg-amber-200/60 border border-amber-400/60 text-xs text-slate-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <span>🎓 Academic Cap & Gown Unlocked in Wardrobe!</span>
              </div>
              <div className="text-[11px] text-slate-700">
                <strong>Superpower Active:</strong> {course.superpower.name} ({course.superpower.description})
              </div>
            </div>

            {/* Signature & Date */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-amber-300 text-slate-700">
              <div>
                <div className="font-bold">{campus?.dean.name}</div>
                <div className="text-[10px] text-slate-500">{campus?.dean.title}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">Dubai, UAE</div>
                <div className="text-[10px] text-slate-500">{new Date().toLocaleDateString()}</div>
              </div>
            </div>

            <p className="text-[10px] text-center text-slate-500">An in-game achievement from a fictional institution. Not an accredited qualification.</p>
            <ShareButton moment="graduate" v={enrollment?.examScore ?? examResult?.score ?? 0} text={`I just graduated from ${course.title} in Come To Dubai 🎓`} className="w-full h-11 rounded-xl bg-amber-500 text-slate-950 text-xs" label="Share my graduation" />

            <button
              onClick={() => setShowCertificate(false)}
              className="w-full py-3 rounded-xl bg-slate-950 text-white font-black text-xs hover:bg-slate-800 transition-colors"
            >
              Close & Continue
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
