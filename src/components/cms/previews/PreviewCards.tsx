import {
  BookOpen, Clock, GraduationCap, Layers, Monitor, Rocket, Stethoscope,
  Users, Video, MapPin, CalendarDays, ExternalLink, ShieldAlert, ImageIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Course, CourseInput, SessionInput, LearningPathInput, PictureLibraryInput } from "@/services/cmsService";
import { fmtFormDate } from "@/lib/utils";

// Mirrors the style maps in LearningCentrePage.tsx / SessionsManagePage.tsx so
// previews match production exactly.

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

const formatConfig: Record<string, { icon: LucideIcon; color: string }> = {
  Virtual: { icon: Video, color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400" },
  "In-Person": { icon: MapPin, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  Hybrid: { icon: Layers, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
};

const pathIconMap: Record<string, LucideIcon> = { Rocket, Stethoscope, Monitor, Users, GraduationCap, BookOpen };

// ── Course ───────────────────────────────────────────────────────────────

export function CoursePreviewCard({ course }: { course: CourseInput }) {
  const CatIcon = categoryIcon[course.category] ?? BookOpen;
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
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
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${levelStyle[course.level] ?? ""}`}>
            {course.level}
          </span>
        </div>
      </div>

      <h3 className="font-serif text-base font-semibold text-foreground leading-snug mb-1.5">
        {course.title || "Untitled Course"}
      </h3>
      <p className="font-sans text-xs text-muted-foreground leading-relaxed flex-1 mb-4">
        {course.description || "No description yet."}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-border text-[11px] font-sans text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.duration || "—"}</span>
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{course.modules} module{course.modules !== 1 ? "s" : ""}</span>
        </div>
        {course.courseUrl && (
          <span className="flex items-center gap-1 text-accent font-semibold">
            Open <ExternalLink className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  );
}

// ── Live Session ─────────────────────────────────────────────────────────

export function SessionPreviewCard({ session }: { session: SessionInput }) {
  const fmtCfg = formatConfig[session.format];
  const FmtIcon = fmtCfg.icon;
  const displayDate = fmtFormDate(session.date);
  const [month, day, year] = displayDate.replace(",", "").split(" ");

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-4 mb-5">
        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary text-primary-foreground shrink-0">
          <span className="text-[10px] font-sans font-semibold uppercase tracking-wide opacity-70 leading-none">{month}</span>
          <span className="text-2xl font-bold leading-tight">{day ?? "—"}</span>
          <span className="text-[10px] font-sans opacity-60 leading-none">{year}</span>
        </div>
        <div>
          <h3 className="font-serif text-base font-semibold text-foreground leading-snug">
            {session.title || "Untitled Session"}
          </h3>
          <span className={`inline-flex items-center gap-1 mt-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-sans font-semibold ${fmtCfg.color}`}>
            <FmtIcon className="h-3 w-3" />
            {session.format}
          </span>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-2 text-sm font-sans text-muted-foreground">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>{displayDate} · {session.time || "—"}</span>
        </div>
        <div className="flex items-start gap-2 text-sm font-sans text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{session.venue || "No venue set"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-sans text-muted-foreground">
          <Users className="h-4 w-4 shrink-0" />
          <span>{session.host || "No host set"}</span>
        </div>
      </div>

      <div className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-sans font-semibold text-accent">
        {session.meetingUrl ? "Join" : "Contact HR"}
      </div>
    </div>
  );
}

// ── Learning Path ────────────────────────────────────────────────────────

export function LearningPathPreviewCard({ path, courses }: { path: LearningPathInput; courses: Course[] }) {
  const Icon = pathIconMap[path.icon] ?? GraduationCap;
  const pathCourses = path.courseIds.map((id) => courses.find((c) => c.id === id)).filter(Boolean) as Course[];

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-serif text-lg font-semibold text-foreground leading-snug">
            {path.title || "Untitled Path"}
          </h3>
          <span className="inline-block mt-1 rounded-full bg-accent/10 text-accent px-2.5 py-0.5 text-[11px] font-sans font-semibold">
            {path.audience || "No audience set"}
          </span>
        </div>
      </div>

      <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-4">
        {path.description || "No description yet."}
      </p>

      <ul className="space-y-2 mb-4 flex-1">
        {pathCourses.length === 0 ? (
          <li className="text-sm font-sans text-muted-foreground/60 italic">No courses selected yet.</li>
        ) : (
          pathCourses.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm font-sans">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
              <span className="text-foreground/80">{c.title}</span>
            </li>
          ))
        )}
      </ul>

      <div className="flex items-center gap-4 pt-4 border-t border-border text-xs font-sans text-muted-foreground">
        <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{path.courseIds.length} courses</span>
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{path.totalDuration || "—"}</span>
      </div>
    </div>
  );
}

// ── Picture Library ──────────────────────────────────────────────────────

export function PicturePreviewCard({ picture }: { picture: PictureLibraryInput }) {
  const cover = picture.images[0];
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card">
      <div className="relative aspect-[4/3] bg-muted flex items-center justify-center">
        {cover ? (
          <img src={cover} alt={picture.title} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
        )}
        {picture.images.length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5">
            {picture.images.length} photos
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-serif font-semibold text-base text-foreground mb-1">
          {picture.title || "Untitled Album"}
        </h3>
        <p className="text-sm font-sans text-muted-foreground leading-relaxed line-clamp-3">
          {picture.description || "No description yet."}
        </p>
      </div>
    </div>
  );
}
