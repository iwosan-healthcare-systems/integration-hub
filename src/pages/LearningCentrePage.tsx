import { useEffect, useState } from "react";
import {
  BookOpen,
  Clock,
  GraduationCap,
  Layers,
  Monitor,
  Rocket,
  Stethoscope,
  Users,
  Video,
  MapPin,
  CalendarDays,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { getCourses, getLearningPaths, getSessions, type Course, type LearningPath, type LiveSession } from "@/services/cmsService";
import { Seo } from "@/components/Seo";

// ─── Config maps ────────────────────────────────────────────────────────────

const formatConfig: Record<
  "Virtual" | "In-Person" | "Hybrid",
  { icon: LucideIcon; color: string }
> = {
  Virtual:     { icon: Video,  color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400" },
  "In-Person": { icon: MapPin, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  Hybrid:      { icon: Layers, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
};

const pathIconMap: Record<string, LucideIcon> = {
  Rocket, Stethoscope, Monitor, Users,
};

const COURSE_CATEGORIES = ['All', 'Onboarding', 'Clinical', 'Compliance', 'IT & Digital', 'Leadership', 'Soft Skills'] as const;

const categoryIcon: Record<string, LucideIcon> = {
  Onboarding: Users,
  Clinical: Stethoscope,
  Compliance: ShieldAlert,
  'IT & Digital': Monitor,
  Leadership: GraduationCap,
  'Soft Skills': BookOpen,
};

const levelStyle: Record<string, string> = {
  Beginner:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Advanced:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ─── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded ${className}`} />;
}

// ─── Page ───────────────────────────────────────────────────────────────────

const LearningCentrePage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    Promise.all([getCourses(), getLearningPaths(), getSessions()]).then(
      ([c, lp, s]) => {
        setCourses(c.courses ?? []);
        setLearningPaths(lp.learningPaths ?? []);
        setSessions(s.sessions ?? []);
        setLoading(false);
      }
    );
  }, []);

  const mandatoryCount = courses.filter((c) => c.mandatory).length;

  return (
    <>
      <Seo
        title="Learning Centre"
        description="Your hub for professional development across the Iwosan network — structured courses, guided learning paths, and live training sessions."
        path="/learning"
      />
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
              Use the search bar above to find any course by name, category, or topic.
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6">
              {[
                { label: "Courses", value: loading ? "—" : courses.length.toString() },
                { label: "Categories", value: "6" },
                { label: "Learning Paths", value: loading ? "—" : learningPaths.length.toString() },
                { label: "Upcoming Sessions", value: loading ? "—" : sessions.length.toString() },
              ].map((s) => (
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
      {!loading && mandatoryCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 sm:px-8 lg:px-16 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="font-sans text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">{mandatoryCount} courses are mandatory</span> for all
              applicable staff. Search for a course above or contact HR to enrol.
            </p>
          </div>
        </div>
      )}

      {/* ── Learning Paths ── */}
      <section className="px-6 py-14 sm:px-8 lg:px-16">
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

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-56" />)}
            </div>
          ) : learningPaths.length === 0 ? (
            <p className="text-muted-foreground text-sm">No learning paths available.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {learningPaths.map((path, i) => {
                const Icon = pathIconMap[path.icon] ?? GraduationCap;
                const pathCourseList = path.courseIds
                  .map((id) => courses.find((c) => c.id === id))
                  .filter(Boolean) as Course[];

                return (
                  <AnimateOnScroll key={path.id} delay={i * 0.1}>
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
                            {c.courseUrl ? (
                              <a
                                href={c.courseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-foreground/80 hover:text-accent hover:underline transition-colors"
                              >
                                {c.title}
                              </a>
                            ) : (
                              <span className="text-foreground/80">{c.title}</span>
                            )}
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
          )}
        </div>
      </section>

      {/* ── Courses ── */}
      <section className="px-6 py-14 sm:px-8 lg:px-16 bg-muted/30 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-2">
              Course Library
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              All courses
            </h2>
            <p className="font-sans text-muted-foreground max-w-xl mb-6">
              Browse the full catalogue of courses available across the Iwosan network.
              Click any course to open it directly.
            </p>

            {/* Category filter tabs */}
            {!loading && (
              <div className="flex flex-wrap gap-2 mb-8">
                {COURSE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors ${
                      activeCategory === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {cat}
                    {cat !== 'All' && (
                      <span className="ml-1.5 opacity-60">
                        {courses.filter((c) => c.category === cat).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </AnimateOnScroll>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52" />)}
            </div>
          ) : courses.length === 0 ? (
            <p className="text-muted-foreground text-sm">No courses available.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses
                .filter((c) => activeCategory === 'All' || c.category === activeCategory)
                .map((course, i) => {
                  const CatIcon = categoryIcon[course.category] ?? BookOpen;
                  const cardContent = (
                    <div className="flex flex-col h-full rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-md group">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <CatIcon className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {course.mandatory && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 text-[10px] font-semibold">
                              Mandatory
                            </span>
                          )}
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${levelStyle[course.level]}`}>
                            {course.level}
                          </span>
                        </div>
                      </div>

                      {/* Title + description */}
                      <h3 className="font-serif text-base font-semibold text-foreground leading-snug mb-1.5 group-hover:text-accent transition-colors">
                        {course.title}
                      </h3>
                      <p className="font-sans text-xs text-muted-foreground leading-relaxed flex-1 mb-4">
                        {course.description}
                      </p>

                      {/* Footer meta */}
                      <div className="flex items-center justify-between pt-3 border-t border-border text-[11px] font-sans text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />{course.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />{course.modules} module{course.modules !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {course.courseUrl && (
                          <span className="flex items-center gap-1 text-accent font-semibold">
                            Open <ExternalLink className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  );

                  return (
                    <AnimateOnScroll key={course.id} delay={(i % 6) * 0.07}>
                      {course.courseUrl ? (
                        <a href={course.courseUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
                          {cardContent}
                        </a>
                      ) : (
                        <div className="h-full">{cardContent}</div>
                      )}
                    </AnimateOnScroll>
                  );
                })}
            </div>
          )}
        </div>
      </section>

      {/* ── Upcoming Live Sessions ── */}
      <section className="px-6 py-14 sm:px-8 lg:px-16 bg-muted/30 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-2">
              Live Training
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Upcoming sessions
            </h2>
            <p className="font-sans text-muted-foreground max-w-xl mb-8">
              Instructor-led sessions open to all eligible staff. Click "Join" to open the session
              link, or contact HR to register for in-person events.
            </p>
          </AnimateOnScroll>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-52" />)}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No upcoming sessions scheduled.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session, i) => {
                const fmtCfg = formatConfig[session.format];
                const FmtIcon = fmtCfg.icon;
                const [month, day, year] = session.date.replace(",", "").split(" ");

                return (
                  <AnimateOnScroll key={session.id} delay={i * 0.1}>
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

                      {session.meetingUrl ? (
                        <a
                          href={session.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-sans font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          Join
                        </a>
                      ) : (
                        <a
                          href="mailto:HumanResources@iwosanhealth.com?subject=Live Session Registration"
                          className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-border bg-muted/50 px-4 py-2 text-sm font-sans font-semibold text-muted-foreground transition-colors hover:bg-muted"
                        >
                          Contact HR
                        </a>
                      )}
                    </div>
                  </AnimateOnScroll>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default LearningCentrePage;
