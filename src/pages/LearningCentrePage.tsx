import { useState } from "react";
import {
  BookOpen,
  Clock,
  GraduationCap,
  Heart,
  Layers,
  Monitor,
  Rocket,
  Shield,
  Stethoscope,
  TrendingUp,
  Users,
  Video,
  MapPin,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import {
  courses,
  learningPaths,
  liveSessions,
  type CourseCategory,
  type CourseLevel,
} from "@/data/hub-data";

// ─── Config maps ────────────────────────────────────────────────────────────

const categoryConfig: Record<
  CourseCategory | "All",
  { icon: LucideIcon; color: string; bg: string; border: string }
> = {
  All:           { icon: BookOpen,    color: "text-slate-600",   bg: "bg-slate-100 dark:bg-slate-800",   border: "border-slate-200 dark:border-slate-700" },
  Onboarding:    { icon: Rocket,      color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-900/30", border: "border-violet-200 dark:border-violet-800" },
  Clinical:      { icon: Stethoscope, color: "text-sky-600",     bg: "bg-sky-50 dark:bg-sky-900/30",     border: "border-sky-200 dark:border-sky-800" },
  Compliance:    { icon: Shield,      color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-900/30", border: "border-amber-200 dark:border-amber-800" },
  "IT & Digital":{ icon: Monitor,     color: "text-cyan-600",    bg: "bg-cyan-50 dark:bg-cyan-900/30",   border: "border-cyan-200 dark:border-cyan-800" },
  Leadership:    { icon: TrendingUp,  color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/30", border: "border-emerald-200 dark:border-emerald-800" },
  "Soft Skills": { icon: Heart,       color: "text-rose-600",    bg: "bg-rose-50 dark:bg-rose-900/30",   border: "border-rose-200 dark:border-rose-800" },
};

const levelColors: Record<CourseLevel, string> = {
  Beginner:     "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  Intermediate: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  Advanced:     "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
};

const formatConfig: Record<
  "Virtual" | "In-Person" | "Hybrid",
  { icon: LucideIcon; color: string }
> = {
  Virtual:    { icon: Video,     color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400" },
  "In-Person":{ icon: MapPin,    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  Hybrid:     { icon: Layers,    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
};

const pathIconMap: Record<string, LucideIcon> = {
  Rocket, Stethoscope, Monitor, Users,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const allCategories: (CourseCategory | "All")[] = [
  "All", "Onboarding", "Clinical", "Compliance", "IT & Digital", "Leadership", "Soft Skills",
];

const stats = [
  { label: "Courses", value: courses.length.toString() },
  { label: "Categories", value: "6" },
  { label: "Learning Paths", value: learningPaths.length.toString() },
  { label: "Upcoming Sessions", value: liveSessions.length.toString() },
];

// ─── Page ───────────────────────────────────────────────────────────────────

const LearningCentrePage = () => {
  const [activeCategory, setActiveCategory] = useState<CourseCategory | "All">("All");

  const filteredCourses =
    activeCategory === "All"
      ? courses
      : courses.filter((c) => c.category === activeCategory);

  const mandatoryCount = courses.filter((c) => c.mandatory).length;

  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-learning-header min-h-[240px] sm:min-h-[260px] flex items-center py-14 sm:py-16 px-6 sm:px-8 lg:px-16 relative overflow-hidden">
        <div className="w-full max-w-6xl mx-auto">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">
              Learning Centre
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
              Grow. Learn. Excel.
            </h1>
            <p className="font-sans text-primary-foreground/60 max-w-xl mb-8">
              Your hub for professional development across the Iwosan network — structured courses,
              guided learning paths, and live training sessions to help every team member thrive.
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-bold text-primary-foreground">{s.value}</p>
                  <p className="font-sans text-xs text-primary-foreground/50 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ── Mandatory notice ── */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 sm:px-8 lg:px-16 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="font-sans text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">{mandatoryCount} courses are mandatory</span> for all
            applicable staff. Contact HR or your department manager to enrol.
          </p>
        </div>
      </div>

      {/* ── Course Catalogue ── */}
      <section className="px-6 py-14 sm:px-8 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-2">
              Course Catalogue
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
              Browse all courses
            </h2>
          </AnimateOnScroll>

          {/* Category filter tabs */}
          <AnimateOnScroll delay={0.05}>
            <div className="flex flex-wrap gap-2 mb-8">
              {allCategories.map((cat) => {
                const cfg = categoryConfig[cat];
                const Icon = cfg.icon;
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-sans font-medium transition-all duration-200 border ${
                      isActive
                        ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm`
                        : "bg-background text-muted-foreground border-border hover:border-border/80 hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat}
                    {cat !== "All" && (
                      <span className={`text-[10px] rounded-full px-1.5 py-0 font-semibold ${isActive ? "bg-white/40 dark:bg-black/20" : "bg-muted"}`}>
                        {courses.filter((c) => c.category === cat).length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </AnimateOnScroll>

          {/* Course grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course, i) => {
              const cfg = categoryConfig[course.category];
              const Icon = cfg.icon;
              return (
                <AnimateOnScroll key={course.id} delay={Math.min(i * 0.06, 0.3)}>
                  <div className="group relative flex flex-col h-full rounded-2xl border border-border bg-card hover:shadow-md transition-all duration-200 overflow-hidden">
                    {/* Top stripe */}
                    <div className={`h-1 w-full ${cfg.bg.split(" ")[0].replace("bg-", "bg-").replace("-50", "-400").replace("-900/30", "-500")}`} />

                    <div className="flex flex-col flex-1 p-5">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-sans font-semibold ${cfg.bg} ${cfg.color}`}>
                          <Icon className="h-3 w-3" />
                          {course.category}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-sans font-semibold ${levelColors[course.level]}`}>
                          {course.level}
                        </span>
                        {course.mandatory && (
                          <span className="rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 px-2.5 py-0.5 text-[11px] font-sans font-semibold">
                            Required
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-serif text-base font-semibold text-foreground mb-2 leading-snug">
                        {course.title}
                      </h3>

                      {/* Description */}
                      <p className="font-sans text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4 flex-1">
                        {course.description}
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center gap-4 text-xs font-sans text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {course.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {course.modules} modules
                        </span>
                      </div>

                      {/* Audience */}
                      <div className="flex items-center gap-1.5 text-xs font-sans text-muted-foreground/70 mb-4">
                        <Users className="h-3.5 w-3.5" />
                        <span>{course.audience}</span>
                      </div>

                      {/* Enroll CTA */}
                      <a
                        href="mailto:hr@iwosanhealth.com?subject=Course Enrolment Request"
                        className="mt-auto inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-sans font-semibold text-accent-foreground transition-opacity hover:opacity-85"
                      >
                        Enrol in Course
                      </a>
                    </div>
                  </div>
                </AnimateOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Learning Paths ── */}
      <section className="px-6 py-14 sm:px-8 lg:px-16 bg-muted/30 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-2">
              Guided Paths
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Learning paths
            </h2>
            <p className="font-sans text-muted-foreground max-w-xl mb-8">
              Curated sequences of courses tailored to your role and goals — the fastest way to
              build the skills that matter most.
            </p>
          </AnimateOnScroll>

          <div className="grid gap-5 sm:grid-cols-2">
            {learningPaths.map((path, i) => {
              const Icon = pathIconMap[path.icon] ?? GraduationCap;
              const pathCourseList = path.courseIds
                .map((id) => courses.find((c) => c.id === id))
                .filter(Boolean) as typeof courses;

              return (
                <AnimateOnScroll key={path.title} delay={i * 0.1}>
                  <div className="flex flex-col h-full rounded-2xl border border-border bg-card p-6 hover:shadow-md transition-all duration-200">
                    {/* Icon + title */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-semibold text-foreground leading-snug">
                          {path.title}
                        </h3>
                        <span className="inline-block mt-1 rounded-full bg-accent/10 text-accent px-2.5 py-0.5 text-[11px] font-sans font-semibold">
                          {path.audience}
                        </span>
                      </div>
                    </div>

                    <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-4">
                      {path.description}
                    </p>

                    {/* Course list */}
                    <ul className="space-y-2 mb-4 flex-1">
                      {pathCourseList.map((c) => (
                        <li key={c.id} className="flex items-center gap-2 text-sm font-sans">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                          <span className="text-foreground/80">{c.title}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Footer meta */}
                    <div className="flex items-center gap-4 pt-4 border-t border-border text-xs font-sans text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {path.courseIds.length} courses
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {path.totalDuration}
                      </span>
                    </div>
                  </div>
                </AnimateOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Upcoming Live Sessions ── */}
      <section className="px-6 py-14 sm:px-8 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-2">
              Live Training
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Upcoming sessions
            </h2>
            <p className="font-sans text-muted-foreground max-w-xl mb-8">
              Instructor-led sessions open to all eligible staff. Contact your department manager
              or HR to register.
            </p>
          </AnimateOnScroll>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {liveSessions.map((session, i) => {
              const fmtCfg = formatConfig[session.format];
              const FmtIcon = fmtCfg.icon;
              const [month, day, year] = session.date.replace(",", "").split(" ");

              return (
                <AnimateOnScroll key={session.title} delay={i * 0.1}>
                  <div className="flex flex-col h-full rounded-2xl border border-border bg-card p-6 hover:shadow-md transition-all duration-200">
                    {/* Date block */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary text-primary-foreground shrink-0">
                        <span className="text-[10px] font-sans font-semibold uppercase tracking-wide opacity-70 leading-none">
                          {month}
                        </span>
                        <span className="text-2xl font-bold leading-tight">{day}</span>
                        <span className="text-[10px] font-sans opacity-60 leading-none">{year}</span>
                      </div>
                      <div>
                        <h3 className="font-serif text-base font-semibold text-foreground leading-snug">
                          {session.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-sans font-semibold ${fmtCfg.color}`}>
                            <FmtIcon className="h-3 w-3" />
                            {session.format}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 text-sm font-sans text-muted-foreground">
                        <CalendarDays className="h-4 w-4 shrink-0" />
                        <span>{session.date} · {session.time}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm font-sans text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{session.venue}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-sans text-muted-foreground">
                        <Users className="h-4 w-4 shrink-0" />
                        <span>{session.host}</span>
                      </div>
                    </div>

                    <a
                      href="mailto:hr@iwosanhealth.com?subject=Live Session Registration"
                      className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-sans font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      Register Interest
                    </a>
                  </div>
                </AnimateOnScroll>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default LearningCentrePage;
