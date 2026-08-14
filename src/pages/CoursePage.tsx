import { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { ArrowLeft, Clock, BookOpen, Users, GraduationCap, Stethoscope, Monitor, ShieldAlert, AlertCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { ArticleVideoPlayer } from "@/components/ArticleVideoPlayer";
import { getCourses, type Course } from "@/services/cmsService";
import { slugify } from "@/lib/utils";
import { Seo } from "@/components/Seo";

// Mirrors the maps in LearningCentrePage.tsx so this page matches the card
// styling exactly.
const categoryIcon: Record<string, LucideIcon> = {
  Onboarding: Users,
  Clinical: Stethoscope,
  Compliance: ShieldAlert,
  "IT & Digital": Monitor,
  Leadership: GraduationCap,
  "Soft Skills": BookOpen,
};

const levelStyle: Record<string, string> = {
  Beginner: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Intermediate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Advanced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// Dedicated page for a course that has an uploaded video (no external
// courseUrl) — a simple Udemy/Alison-style layout: video up front, course
// facts alongside it, rather than the dialog player used elsewhere.
const CoursePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getCourses().then(({ courses }) => {
      const found = courses?.find((c) => slugify(c.title) === slug) ?? null;
      if (!found) setNotFound(true);
      setCourse(found);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-16 py-10 space-y-6">
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        <div className="h-8 w-2/3 rounded bg-muted animate-pulse" />
        <div className="aspect-video rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  // Also bounces back for courses with no video (e.g. an external-link
  // course whose URL was later removed) — this page has nothing to show them.
  if (notFound || !course || !course.video) {
    return <Navigate to="/learning" replace />;
  }

  const CatIcon = categoryIcon[course.category] ?? BookOpen;

  return (
    <article className="pb-16">
      <Seo title={course.title} description={course.description} path={`/courses/${slug}`} />

      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-16 pt-8 pb-6">
        <Link
          to="/learning"
          className="inline-flex items-center gap-1.5 text-xs font-sans text-muted-foreground hover:text-accent transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Learning Centre
        </Link>
      </div>

      <AnimateOnScroll>
        <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-16">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-sans font-semibold">
              <CatIcon className="h-3 w-3" />{course.category}
            </span>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-sans font-semibold ${levelStyle[course.level] ?? ""}`}>
              {course.level}
            </span>
            {course.mandatory && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-0.5 text-[11px] font-semibold">
                Mandatory
              </span>
            )}
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold mb-3 leading-tight">
            {course.title}
          </h1>
          {course.description && (
            <p className="font-sans text-muted-foreground max-w-2xl">{course.description}</p>
          )}
        </div>
      </AnimateOnScroll>

      <AnimateOnScroll delay={0.05}>
        <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-16 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ArticleVideoPlayer videoKey={course.video} title={course.title} />
          </div>

          <aside className="lg:col-span-1">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 lg:sticky lg:top-24">
              <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Course Details
              </h2>
              <div className="space-y-3 text-sm font-sans">
                <div className="flex items-center gap-2 text-foreground/80">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground/80">
                  <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{course.modules} module{course.modules !== 1 ? "s" : ""}</span>
                </div>
                {course.audience && (
                  <div className="flex items-center gap-2 text-foreground/80">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{course.audience}</span>
                  </div>
                )}
              </div>
              {course.mandatory && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    This course is mandatory for applicable staff.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </AnimateOnScroll>
    </article>
  );
};

export default CoursePage;
