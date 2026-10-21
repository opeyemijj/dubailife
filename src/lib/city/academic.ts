"use client";

// Academic City: Dubai's premier higher education and skills ecosystem.
// Combines elite academic institutions (AUD, UD, Dubai College, GEMS Wellington)
// with Brain University — the high-impact new-economy accelerator for AI, Crypto, Forex and Coding, and its
// library of best-selling motivational books, each chapter summarised as a module.
// Course content is strictly separated from the database and loaded from dedicated JSON files in @/data/courses/.

import type { Citizen } from "@/lib/citizenStore";

// Import all 15 comprehensive course curricula stored in JSON
import audBusinessJson from "@/data/courses/aud-business.json";
import audRealEstateJson from "@/data/courses/aud-real-estate.json";
import dcUaeStudiesJson from "@/data/courses/dc-uae-studies.json";
import gemsArabicJson from "@/data/courses/gems-arabic.json";
import onebrainAiJson from "@/data/courses/onebrain-ai.json";
import onebrainContentJson from "@/data/courses/onebrain-content.json";
import onebrainCryptoJson from "@/data/courses/onebrain-crypto.json";
import onebrainCyberJson from "@/data/courses/onebrain-cyber.json";
import onebrainDataJson from "@/data/courses/onebrain-data.json";
import onebrainEcommerceJson from "@/data/courses/onebrain-ecommerce.json";
import onebrainForexJson from "@/data/courses/onebrain-forex.json";
import onebrainMarketingJson from "@/data/courses/onebrain-marketing.json";
import onebrainProgrammingJson from "@/data/courses/onebrain-programming.json";
import onebrainSalesJson from "@/data/courses/onebrain-sales.json";
import udCybersecurityJson from "@/data/courses/ud-cybersecurity.json";
// Brain University book library: one JSON file per book (src/data/books), each chapter a module.
import bookAtomicHabits from "@/data/books/atomic-habits.json";
import bookSevenHabits from "@/data/books/seven-habits.json";
import bookHowToWinFriends from "@/data/books/how-to-win-friends.json";
import bookThinkAndGrowRich from "@/data/books/think-and-grow-rich.json";
import bookRichDadPoorDad from "@/data/books/rich-dad-poor-dad.json";
import bookPsychologyOfMoney from "@/data/books/psychology-of-money.json";
import bookMindset from "@/data/books/mindset.json";
import bookDeepWork from "@/data/books/deep-work.json";
import bookMansSearch from "@/data/books/mans-search-for-meaning.json";
import bookPowerOfHabit from "@/data/books/power-of-habit.json";

export type AcademicTier = "accelerator" | "university" | "secondary";

export interface AcademicInstitution {
  id: string;
  name: string;
  shortName: string;
  tier: AcademicTier;
  crestIcon: string;
  badge: string;
  tagline: string;
  description?: string;
  motto: string;
  color: string;
  accentBg: string;
  tuitionStandard: number;
  location: string;
  dean: {
    name: string;
    title: string;
    avatar: string;
    quote: string;
  };
  features: string[];
}

export interface SlideDef {
  title: string;
  content: string;
  body?: string;
  bullets?: string[];
  codeSnippet?: string;
  highlight?: string;
  takeaway?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CaseStudyOption {
  text: string;
  correct: boolean;
  explanation: string;
}

export interface CaseStudy {
  scenario: string;
  options: CaseStudyOption[];
}

export interface CourseLab {
  title: string;
  brief: string;
  deliverable?: string;
  proTip?: string;
}

export interface CourseWeek {
  week: number;
  title: string;
  objective: string;
  slides: SlideDef[];
  lab?: CourseLab;
  caseStudy?: CaseStudy;
  quiz: QuizQuestion[];
}

export interface LessonDef {
  id: string;
  lessonNumber: number;
  title: string;
  readTimeMinutes: number;
  slides: SlideDef[];
  lab?: CourseLab;
  caseStudy?: CaseStudy;
  quiz: QuizQuestion[];
}

export interface ExamDef {
  durationSeconds: number;
  passingScore: number; // e.g. 70
  questions: QuizQuestion[];
}

export interface SuperpowerBuff {
  id: string;
  name: string;
  icon: string;
  description: string;
  badgeText: string;
  perkType: "venue_discount" | "property_discount" | "ad_multiplier" | "crypto_yield" | "salik_free" | "arabic_dialogue" | "trading_desk" | "ai_copilot" | "commission_boost" | "general";
}

export interface AcademicCourse {
  id: string;
  institutionId: string;
  title: string;
  tagline: string;
  category: string;
  icon: string;
  level: "accelerator" | "bachelor_degree" | "secondary_diploma";
  duration?: string;
  tuitionFee: number;
  superpower: SuperpowerBuff;
  syllabus?: string[];
  weeks: CourseWeek[];
  lessons: LessonDef[];
  finalExam: ExamDef;
  /** What one module is called: "Week" for courses, "Chapter" for books. */
  unitLabel?: string;
  /** Books: who wrote it. */
  author?: string;
}

export const ACADEMIC_CAMPUSES: Record<string, AcademicInstitution> = {
  onebrain: {
    id: "onebrain",
    name: "Brain University",
    shortName: "Brain U",
    tier: "accelerator",
    crestIcon: "⚡",
    badge: "NextGen Skills Accelerator",
    tagline: "Skip the theory. Master the modern market.",
    motto: "Direct Market Access · Real Wealth Skills",
    color: "#8b5cf6",
    accentBg: "from-purple-900/80 via-indigo-950 to-slate-950",
    tuitionStandard: 15000,
    location: "Academic City · Innovation District",
    dean: {
      name: "Dr. Kaelen Vance",
      title: "Chief Academic Officer & AI Lab Lead",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      quote: "The economy doesn't care about dusty textbooks. We train builders, traders, and founders to win in Dubai's real marketplace.",
    },
    features: [
      "AI Command Labs & Live Multi-Model Agents",
      "VARA-Compliant Web3 & Crypto Staking Terminal",
      "Forex & Algorithmic Day Trading Desks",
      "Full-Stack Silicon Oasis Venture Studio",
    ],
  },
  aud: {
    id: "aud",
    name: "American University in Dubai",
    shortName: "AUD",
    tier: "university",
    crestIcon: "🦅",
    badge: "Ranked #1 University in Dubai (QS 2026)",
    tagline: "Global leadership, American liberal arts excellence, and Dubai innovation.",
    motto: "Excellence in Education, Leadership in Society",
    color: "#d97706",
    accentBg: "from-amber-950/80 via-slate-900 to-slate-950",
    tuitionStandard: 25000,
    location: "Academic City · West Quad",
    dean: {
      name: "Dr. Lance de Masi",
      title: "President Emeritus & Dean of Business",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      quote: "AUD is where the leaders of Dubai's iconic enterprises cut their teeth and turn vision into sustainable industry.",
    },
    features: [
      "Accredited by SACSCOC (USA) and UAE Ministry of Education",
      "DLD Real Estate Investment Clinic",
      "Media City Integrated Digital Studio",
      "Sustainable Architecture & Desert Urbanism Pavilion",
    ],
  },
  ud: {
    id: "ud",
    name: "University of Dubai",
    shortName: "UD",
    tier: "university",
    crestIcon: "🏛️",
    badge: "Established by Dubai Chamber of Commerce",
    tagline: "Pioneering business acumen, enterprise cybersecurity, and global trade corridors.",
    motto: "Advancing Knowledge, Driving Dubai's Economy",
    color: "#0284c7",
    accentBg: "from-sky-950/80 via-slate-900 to-slate-950",
    tuitionStandard: 25000,
    location: "Academic City · South Quad",
    dean: {
      name: "Dr. Eesa Bastaki",
      title: "President & Professor of Engineering",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
      quote: "Rooted in Dubai Chamber, we connect academia directly with the titans of international commerce and cybersecurity.",
    },
    features: [
      "Center for Executive Development & Sovereign Wealth",
      "Zero-Trust Enterprise Cyber Lab",
      "Jebel Ali Global Supply Chain Simulation",
      "Dubai Commercial Arbitration Moot Court",
    ],
  },
  dc: {
    id: "dc",
    name: "Dubai College",
    shortName: "Dubai College",
    tier: "secondary",
    crestIcon: "🦁",
    badge: "KHDA Outstanding (15+ Consecutive Years)",
    tagline: "Pure academic excellence and holistic British secondary education.",
    motto: "Excellence, Integrity, Community",
    color: "#15803d",
    accentBg: "from-emerald-950/80 via-slate-900 to-slate-950",
    tuitionStandard: 5000,
    location: "Academic City · Heritage Green",
    dean: {
      name: "Michael Lambert",
      title: "Headmaster & Fellow of the College",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
      quote: "Dubai College graduates embody rigor, deep understanding of our host nation's history, and the highest standards of scholarship.",
    },
    features: [
      "Top British A-Level examination results globally",
      "Comprehensive UAE Heritage & Trucial History Archives",
      "Championship STEM Olympiad & Desert Ecology Team",
      "20% University Scholarship Voucher awarded to all graduates",
    ],
  },
  "gems-wellington": {
    id: "gems-wellington",
    name: "GEMS Wellington International School",
    shortName: "GEMS Wellington",
    tier: "secondary",
    crestIcon: "👑",
    badge: "KHDA Outstanding Flagship Academy",
    tagline: "Empowering global citizens through world-class IB & British dual pathways.",
    motto: "Knowledge Through Integrity",
    color: "#2563eb",
    accentBg: "from-blue-950/80 via-slate-900 to-slate-950",
    tuitionStandard: 5000,
    location: "Academic City · Sheikh Zayed Pavilion",
    dean: {
      name: "Maryssa O'Connor",
      title: "Principal & CEO",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
      quote: "From fluent Arabic communication to financial independence, we instill skills that make our students thrive across the globe.",
    },
    features: [
      "World-class Arabic & Islamic Cultural Integration Lab",
      "Personal Wealth & Youth Venture Incubator",
      "International Baccalaureate World School Accreditation",
      "20% University Scholarship Voucher awarded to all graduates",
    ],
  },
};

// ============================================================================
// COURSE BUILDER / JSON ADAPTER
// ============================================================================

function mapCourseJson(raw: any): AcademicCourse {
  const weeks: CourseWeek[] = (raw.weeks || []).map((w: any) => ({
    week: w.week,
    title: w.title,
    objective: w.objective,
    slides: (w.slides || []).map((s: any) => ({
      title: s.title,
      content: s.body || s.content || "",
      body: s.body,
      bullets: s.bullets,
      codeSnippet: s.codeSnippet,
      takeaway: s.takeaway,
    })),
    lab: w.lab,
    caseStudy: w.caseStudy
      ? {
          scenario: w.caseStudy.scenario,
          options: (w.caseStudy.options || []).map((opt: any) => ({
            text: opt.text,
            correct: !!opt.correct,
            explanation: opt.explanation || opt.rationale || "",
          })),
        }
      : undefined,
    quiz: w.quiz || [],
  }));

  const lessons: LessonDef[] = weeks.map((w) => ({
    id: `${raw.id}-w${w.week}`,
    lessonNumber: w.week,
    title: w.title,
    readTimeMinutes: 5,
    slides: w.slides,
    lab: w.lab,
    caseStudy: w.caseStudy,
    quiz: w.quiz,
  }));

  return {
    id: raw.id,
    institutionId: raw.institutionId === "gems" ? "gems-wellington" : raw.institutionId,
    title: raw.title,
    tagline: raw.tagline,
    category: raw.category,
    icon: raw.icon,
    level: raw.level as "accelerator" | "bachelor_degree" | "secondary_diploma",
    duration: raw.duration || "4 Weeks",
    tuitionFee: raw.tuitionFee || raw.tuition || 15000,
    superpower: raw.superpower as SuperpowerBuff,
    syllabus: raw.syllabus || [],
    weeks,
    lessons,
    finalExam: raw.finalExam || {
      durationSeconds: 180,
      passingScore: 70,
      questions: [],
    },
  };
}

// ============================================================================
// BRAIN UNIVERSITY BOOK LIBRARY (one JSON file per book, each chapter a module)
// ============================================================================

interface BookChapterJson { number: number; part?: string; title: string; summary: string; keyIdeas: string[]; tryThis: string; quiz: QuizQuestion[] }
interface BookJson {
  id: string; institutionId: string; title: string; author: string; published: number; icon: string; category: string;
  tagline: string; tuitionFee: number; superpower: SuperpowerBuff; overview: string; chapters: BookChapterJson[];
}

/** A book as a course: each chapter is a module (summary, key ideas, an exercise and a quiz). */
function mapBookJson(raw: BookJson): AcademicCourse {
  const lessons: LessonDef[] = raw.chapters.map((ch) => ({
    id: `${raw.id}-ch${ch.number}`,
    lessonNumber: ch.number,
    title: ch.title,
    readTimeMinutes: 3,
    slides: [
      { title: ch.part ? `${ch.part} · Summary` : "Summary", content: ch.summary },
      { title: "Key ideas", content: "", bullets: ch.keyIdeas },
      { title: "Try this", content: ch.tryThis, takeaway: ch.keyIdeas[0] },
    ],
    quiz: ch.quiz,
  }));
  const weeks: CourseWeek[] = lessons.map((l, i) => ({ week: l.lessonNumber, title: l.title, objective: raw.chapters[i].part ?? raw.title, slides: l.slides, quiz: l.quiz }));
  // The final exam draws one question from across the book (up to 15).
  const all = raw.chapters.flatMap((ch) => ch.quiz);
  const step = Math.max(1, Math.floor(all.length / 15));
  const questions = all.filter((_, i) => i % step === 0).slice(0, 15);
  return {
    id: raw.id,
    institutionId: raw.institutionId,
    title: raw.title,
    tagline: raw.tagline,
    category: raw.category,
    icon: raw.icon,
    level: "accelerator",
    duration: `${raw.chapters.length} chapters`,
    tuitionFee: raw.tuitionFee,
    superpower: raw.superpower,
    syllabus: [`${raw.title} by ${raw.author} (${raw.published})`, raw.overview],
    weeks,
    lessons,
    finalExam: { durationSeconds: Math.max(180, questions.length * 20), passingScore: 70, questions },
    unitLabel: "Chapter",
    author: raw.author,
  };
}

export const BOOK_COURSES: AcademicCourse[] = [
  bookAtomicHabits, bookSevenHabits, bookHowToWinFriends, bookThinkAndGrowRich, bookRichDadPoorDad,
  bookPsychologyOfMoney, bookMindset, bookDeepWork, bookMansSearch, bookPowerOfHabit,
].map((b) => mapBookJson(b as BookJson));

// ============================================================================
// COURSES CATALOG WITH COMPREHENSIVE CURRICULA (LOADED FROM JSON FILES)
// ============================================================================

export const ACADEMIC_COURSES: AcademicCourse[] = [
  // 10 Brain University Accelerator Courses
  mapCourseJson(onebrainAiJson),
  mapCourseJson(onebrainCryptoJson),
  mapCourseJson(onebrainForexJson),
  mapCourseJson(onebrainProgrammingJson),
  mapCourseJson(onebrainMarketingJson),
  mapCourseJson(onebrainEcommerceJson),
  mapCourseJson(onebrainCyberJson),
  mapCourseJson(onebrainContentJson),
  mapCourseJson(onebrainDataJson),
  mapCourseJson(onebrainSalesJson),

  // American University in Dubai (AUD) Degrees
  mapCourseJson(audBusinessJson),
  mapCourseJson(audRealEstateJson),

  // University of Dubai (UD) Degree
  mapCourseJson(udCybersecurityJson),

  // Secondary School Diplomas
  mapCourseJson(dcUaeStudiesJson),
  mapCourseJson(gemsArabicJson),

  // Brain University book library
  ...BOOK_COURSES,
];

// ============================================================================
// ACADEMIC TILES ON THE WEST COAST MAP PLOT
// ============================================================================

export const ACADEMIC_MAP_CENTER = { x: 165, y: 467 };

export const ACADEMIC_TILES = [
  // --- 3D Higher Education & Skills Institutions ---
  {
    id: "academic-aud",
    name: "American University in Dubai (AUD)",
    type: "academic-tile",
    campus: "aud",
    virtualX: ACADEMIC_MAP_CENTER.x - 300,
    virtualY: ACADEMIC_MAP_CENTER.y + 190,
    width: 280,
    height: 200,
    generated: true as const,
    interactive: true,
  },
  {
    id: "academic-onebrain",
    name: "Brain University · NextGen Hub",
    type: "academic-tile",
    campus: "onebrain",
    virtualX: ACADEMIC_MAP_CENTER.x + 190,
    virtualY: ACADEMIC_MAP_CENTER.y + 210,
    width: 280,
    height: 200,
    generated: true as const,
    interactive: true,
  },
  {
    id: "academic-ud",
    name: "University of Dubai (UD)",
    type: "academic-tile",
    campus: "ud",
    virtualX: ACADEMIC_MAP_CENTER.x - 60,
    virtualY: ACADEMIC_MAP_CENTER.y + 10,
    width: 280,
    height: 200,
    generated: true as const,
    interactive: true,
  },
  {
    id: "academic-dc",
    name: "Dubai College (DC)",
    type: "academic-tile",
    campus: "dc",
    virtualX: ACADEMIC_MAP_CENTER.x - 310,
    virtualY: ACADEMIC_MAP_CENTER.y - 190,
    width: 280,
    height: 200,
    generated: true as const,
    interactive: true,
  },
  {
    id: "academic-gems",
    name: "GEMS Wellington International School",
    type: "academic-tile",
    campus: "gems-wellington",
    virtualX: ACADEMIC_MAP_CENTER.x + 180,
    virtualY: ACADEMIC_MAP_CENTER.y - 180,
    width: 280,
    height: 200,
    generated: true as const,
    interactive: true,
  },

  // --- Academic City Digital LED Ad Billboards ---
  {
    id: "academic-billboard-north",
    name: "Academic Boulevard Mega-LED Billboard",
    type: "giant-billboard",
    billboardStyle: "mega-led",
    virtualX: ACADEMIC_MAP_CENTER.x - 60,
    virtualY: ACADEMIC_MAP_CENTER.y + 350,
    width: 140,
    height: 95,
    scale: 1.85,
    generated: true as const,
    interactive: true,
  },
  {
    id: "academic-billboard-south",
    name: "Innovation Hub Curved 4K Billboard",
    type: "giant-billboard",
    billboardStyle: "luxury-curved",
    virtualX: ACADEMIC_MAP_CENTER.x - 60,
    virtualY: ACADEMIC_MAP_CENTER.y - 330,
    width: 140,
    height: 95,
    scale: 1.85,
    generated: true as const,
    interactive: true,
  },
];

// ============================================================================
// HELPER UTILITIES & SCHOLARSHIP CALCULATOR
// ============================================================================

export function getCampus(id: string): AcademicInstitution | undefined {
  return ACADEMIC_CAMPUSES[id];
}

export function getCourse(id: string): AcademicCourse | undefined {
  return ACADEMIC_COURSES.find((c) => c.id === id);
}

export function getCoursesByCampus(campusId: string): AcademicCourse[] {
  return ACADEMIC_COURSES.filter((c) => c.institutionId === campusId);
}

/** Check if citizen is eligible for the 20% Secondary School Diploma Scholarship */
export function hasSecondaryDiplomaScholarship(citizen: Citizen | null): boolean {
  if (!citizen?.academic?.diplomas) return false;
  return citizen.academic.diplomas.length > 0;
}

/** Calculate tuition with scholarship applied */
export function calculateTuition(course: AcademicCourse, citizen: Citizen | null): { original: number; final: number; hasDiscount: boolean; discountPercent: number } {
  const original = course.tuitionFee;
  if (course.level === "secondary_diploma") {
    return { original, final: original, hasDiscount: false, discountPercent: 0 };
  }
  const hasDiscount = hasSecondaryDiplomaScholarship(citizen);
  const discountPercent = hasDiscount ? 20 : 0;
  const final = hasDiscount ? Math.round(original * 0.8) : original;
  return { original, final, hasDiscount, discountPercent };
}
