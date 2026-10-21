"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, Sparkles, GraduationCap, BookOpen, CheckCircle, ChevronRight, Coins } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { BottomNav } from "@/components/layout/BottomNav";
import { ACADEMIC_CAMPUSES, ACADEMIC_COURSES, hasSecondaryDiplomaScholarship } from "@/lib/city/academic";

export default function AcademicDistrictPage() {
  const { citizen } = useCitizen();
  const [filter, setFilter] = useState<"all" | "accelerator" | "university" | "secondary">("all");

  const hasScholarship = hasSecondaryDiplomaScholarship(citizen);
  const enrolledMap = citizen?.academic?.enrolled ?? {};
  const degrees = citizen?.academic?.degrees ?? [];
  const diplomas = citizen?.academic?.diplomas ?? [];
  const activeBuffs = citizen?.academic?.activeBuffs ?? [];

  const campuses = Object.values(ACADEMIC_CAMPUSES).filter((c) => {
    if (filter === "all") return true;
    return c.tier === filter;
  });

  return (
    <main className="relative min-h-[100dvh] bg-slate-950 text-white pb-32">
      {/* Background radial glows */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-purple-900/20 via-indigo-950/20 to-transparent pointer-events-none" />

      <div className="relative max-w-xl mx-auto px-4 pt-6 space-y-6">
        {/* Navigation Bar */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/explore"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Back to Map"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <span>Academic City</span>
                <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Dubai West Coast
                </span>
              </h1>
              <p className="text-xs text-slate-400">Higher Education, Skills Accelerators & Elite Academies</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black text-amber-300">{(citizen?.balance ?? 0).toLocaleString()} AED</span>
          </div>
        </header>

        {/* 20% Scholarship Notice Banner if Secondary Diploma Owned */}
        {hasScholarship ? (
          <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-emerald-900/60 via-teal-900/60 to-slate-900 border border-emerald-500/40 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-xl shrink-0">
                🎓
              </div>
              <div className="space-y-1">
                <div className="text-sm font-black text-emerald-300 flex items-center gap-2">
                  <span>20% High School Scholarship Active!</span>
                  <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.2 rounded-full">VOUCHER</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  As an Outstanding Secondary School graduate, you receive a guaranteed 20% tuition discount on all Brain University Accelerator and University degrees!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-purple-900/40 via-indigo-950/40 to-slate-900 border border-purple-500/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-xl shrink-0">
                💡
              </div>
              <div>
                <div className="text-xs font-black text-purple-300 uppercase tracking-wider">Academic Pathway Tip</div>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Complete a secondary diploma at Dubai College or GEMS Wellington first to unlock a permanent <strong className="text-white">20% scholarship</strong> on all university and accelerator courses!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Citizen Academic Credentials / Superpowers */}
        {(degrees.length > 0 || diplomas.length > 0 || activeBuffs.length > 0) && (
          <section className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Your Academic Credentials & Superpowers</span>
              </h2>
              <span className="text-[11px] text-amber-400 font-bold">{degrees.length + diplomas.length} Graduated</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {activeBuffs.map((buffId) => {
                const course = ACADEMIC_COURSES.find((c) => c.superpower.id === buffId);
                const buff = course?.superpower;
                if (!buff) return null;
                return (
                  <div key={buffId} className="flex items-center gap-2 p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs">
                    <span className="text-base">{buff.icon}</span>
                    <div className="truncate">
                      <div className="font-bold text-white truncate">{buff.name}</div>
                      <div className="text-[10px] text-purple-300 truncate">{buff.badgeText}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* District Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              filter === "all" ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            All Institutions (5)
          </button>
          <button
            onClick={() => setFilter("accelerator")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              filter === "accelerator" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            ⚡ Brain University Accelerator
          </button>
          <button
            onClick={() => setFilter("university")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              filter === "university" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            🏛️ Top Universities
          </button>
          <button
            onClick={() => setFilter("secondary")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              filter === "secondary" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            🎓 Secondary Schools
          </button>
        </div>

        {/* Campuses List */}
        <div className="space-y-4">
          {campuses.map((campus) => {
            const campusCourses = ACADEMIC_COURSES.filter((c) => c.institutionId === campus.id);
            const completedCount = campusCourses.filter((c) => enrolledMap[c.id]?.examPassed).length;

            return (
              <Link
                key={campus.id}
                href={`/academics/${campus.id}`}
                className="block group rounded-3xl bg-slate-900 border border-white/10 hover:border-white/30 overflow-hidden transition-all shadow-xl hover:scale-[1.01]"
              >
                {/* Header Banner */}
                <div className={`p-5 bg-gradient-to-r ${campus.accentBg} relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />

                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/20 flex items-center justify-center text-3xl shadow-lg">
                        {campus.crestIcon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                            {campus.badge}
                          </span>
                        </div>
                        <h2 className="text-xl font-black text-white mt-1 group-hover:text-purple-300 transition-colors">
                          {campus.name}
                        </h2>
                        <p className="text-xs text-slate-300 italic mt-0.5">&quot;{campus.motto}&quot;</p>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

                {/* Body details */}
                <div className="p-4 bg-slate-900/90 space-y-3">
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{campus.tagline}</p>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10 text-slate-400">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 font-bold text-white">
                        <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                        {campusCourses.length} {campusCourses.length === 1 ? "Program" : "Programs"}
                      </span>
                      {completedCount > 0 && (
                        <span className="flex items-center gap-1 font-bold text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {completedCount} Graduated
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-black text-amber-300">
                      Standard Tuition: {campus.tuitionStandard.toLocaleString()} AED
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Dean's List & Graduation Perks Footer */}
        <section className="rounded-3xl bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-purple-500/20 p-5 space-y-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-2xl mx-auto">
            🎓
          </div>
          <h3 className="text-base font-black text-white">Dubai Academic Honors & Wardrobe Unlocks</h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            Every course completed awards an official verified certificate of completion on your Citizen Profile, unlocks the exclusive <strong className="text-white">Academic Cap & Gown</strong> in your Wardrobe, and permanently activates in-game superpowers!
          </p>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
