"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Award, CheckCircle, ChevronRight, Coins, Zap, Shield, Sparkles } from "lucide-react";
import { useCitizen, enrollInCourse } from "@/lib/citizenStore";
import { BottomNav } from "@/components/layout/BottomNav";
import { getCampus, getCoursesByCampus, calculateTuition, hasSecondaryDiplomaScholarship } from "@/lib/city/academic";
import { gameAudio } from "@/utils/gameAudio";

export default function CampusHubPage({ params }: { params: Promise<{ campusId: string }> }) {
  const { campusId } = use(params);
  const campus = getCampus(campusId);
  const { citizen } = useCitizen();

  if (!campus) {
    notFound();
  }

  const courses = getCoursesByCampus(campusId);
  const enrolledMap = citizen?.academic?.enrolled ?? {};
  const hasScholarship = hasSecondaryDiplomaScholarship(citizen);

  return (
    <main className="relative min-h-[100dvh] bg-slate-950 text-white pb-32">
      {/* Background ambient gradient */}
      <div className={`absolute top-0 inset-x-0 h-96 bg-gradient-to-b ${campus.accentBg} opacity-60 pointer-events-none`} />

      <div className="relative max-w-xl mx-auto px-4 pt-6 space-y-6">
        {/* Navigation Bar */}
        <header className="flex items-center justify-between">
          <Link
            href="/academics"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Back to Academic City"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black text-amber-300">{(citizen?.balance ?? 0).toLocaleString()} AED</span>
          </div>
        </header>

        {/* Campus Hero Card */}
        <div className="rounded-3xl bg-slate-900 border border-white/10 p-6 space-y-4 shadow-2xl relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/20 flex items-center justify-center text-4xl shadow-lg shrink-0">
              {campus.crestIcon}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                  {campus.badge}
                </span>
              </div>
              <h1 className="text-2xl font-black text-white">{campus.name}</h1>
              <p className="text-xs text-slate-300 italic">&quot;{campus.motto}&quot;</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{campus.description || campus.tagline}</p>

          {/* Dean Profile Banner */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={campus.dean.avatar}
              alt={campus.dean.name}
              className="w-12 h-12 rounded-full object-cover border border-white/20 shrink-0"
            />
            <div className="space-y-0.5">
              <div className="text-xs font-black text-white">{campus.dean.name}</div>
              <div className="text-[11px] text-purple-300">{campus.dean.title}</div>
              <p className="text-[11px] text-slate-400 italic line-clamp-2">&quot;{campus.dean.quote}&quot;</p>
            </div>
          </div>

          {/* Campus Features */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Campus Facilities & Honors</div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              {campus.features.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-amber-400">•</span>
                  <span className="line-clamp-1">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 20% Scholarship Banner if Applicable */}
        {hasScholarship && campus.tier !== "secondary" && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
              🎓
            </div>
            <div className="text-slate-200">
              <strong className="text-emerald-300">20% High School Scholarship Applied:</strong> Tuition on all degrees at this campus has been reduced by 20% for you!
            </div>
          </div>
        )}

        {/* Programs / Courses Header */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <span>Academic Programs ({courses.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Certified by Dubai Academic Authority</span>
        </div>

        {/* Courses Listing */}
        <div className="space-y-3">
          {courses.map((course) => {
            const tuition = calculateTuition(course, citizen);
            const enrollment = enrolledMap[course.id];
            const isEnrolled = !!enrollment;
            const isGraduated = !!enrollment?.examPassed;
            const completedLessons = enrollment?.completedLessons?.length ?? 0;
            const totalLessons = course.lessons.length;

            return (
              <div
                key={course.id}
                className="rounded-2xl bg-slate-900 border border-white/10 hover:border-white/20 p-4 space-y-3 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shrink-0">
                      {course.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {course.category}
                        </span>
                        {isGraduated && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {enrollment.honors || "Graduated"}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-white mt-1">{course.title}</h3>
                      <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">{course.tagline}</p>
                    </div>
                  </div>
                </div>

                {/* Superpower Buff Award */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs">
                  <span className="text-lg">{course.superpower.icon}</span>
                  <div className="truncate">
                    <span className="font-bold text-purple-300">Graduate Superpower: </span>
                    <span className="text-slate-300">{course.superpower.name} — {course.superpower.description}</span>
                  </div>
                </div>

                {/* Footer with Tuition & Enrollment Button */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Tuition Fee</div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-amber-300 text-sm">
                        {tuition.final === 0 ? "Free" : `${tuition.final.toLocaleString()} AED`}
                      </span>
                      {tuition.hasDiscount && (
                        <span className="text-[10px] text-slate-400 line-through">
                          {tuition.original.toLocaleString()} AED
                        </span>
                      )}
                      {tuition.hasDiscount && (
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded">
                          -20%
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    {isGraduated ? (
                      <Link
                        href={`/academics/course/${course.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black transition-colors"
                      >
                        <Award className="w-4 h-4" />
                        <span>View Diploma</span>
                      </Link>
                    ) : isEnrolled ? (
                      <Link
                        href={`/academics/course/${course.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black transition-colors"
                      >
                        <span>Study ({completedLessons}/{totalLessons})</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <Link
                        href={`/academics/course/${course.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-slate-950 hover:bg-slate-200 font-black transition-colors"
                      >
                        <span>Enroll & Start</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
