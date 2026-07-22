import { useParams, Link, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Clock,
  FileText,
  Globe,
  Headphones,
  Mail,
  Users,
} from "lucide-react";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { getSubsidiaryBySlug, type SubsidiaryPortal } from "@/data/subsidiary-data";
import innovationImg from "@/assets/innovation-bg.webp";
import { Seo } from "@/components/Seo";

// ── Resource card ─────────────────────────────────────────────────────────────

interface ResourceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: { url: string | null; available: boolean; label: string };
  theme: SubsidiaryPortal["theme"];
}

function ResourceCard({ icon, title, description, link, theme }: ResourceCardProps) {
  const base = `group relative flex flex-col gap-4 rounded-xl border p-5 h-full transition-all duration-300 ${theme.cardBg} ${theme.cardBorder} ${theme.cardBorderHover} hover:-translate-y-0.5 hover:shadow-lg ${theme.glow}`;

  const inner = (
    <>
      <div className={`inline-flex w-fit rounded-lg p-2.5 ${theme.cardBg} border ${theme.cardBorder}`}>
        <span className={theme.iconColor}>{icon}</span>
      </div>

      <div className="flex-1">
        <p className="text-xs font-sans font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          {title}
        </p>
        <p className="text-sm font-sans text-foreground leading-relaxed">{description}</p>
      </div>

      <div className="flex items-center justify-end">
        {link.available ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-sans font-semibold transition-colors duration-200 ${theme.badge}`}
          >
            Open <ArrowUpRight className="h-3 w-3" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-sans text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Coming soon
          </span>
        )}
      </div>
    </>
  );

  if (link.available && link.url) {
    return (
      <a href={link.url} target="_blank" rel="noopener noreferrer" className={base}>
        {inner}
      </a>
    );
  }

  return <div className={`${base} opacity-70 cursor-default`}>{inner}</div>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SubsidiaryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const entity = slug ? getSubsidiaryBySlug(slug) : undefined;

  if (!entity) return <Navigate to="/subsidiaries" replace />;

  const { theme } = entity;

  return (
    <>
      <Seo
        title={entity.shortName}
        description={entity.overview.length > 160 ? `${entity.overview.slice(0, 157)}...` : entity.overview}
        path={`/subsidiaries/${slug}`}
      />
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[260px] sm:min-h-[300px] flex items-end py-12 sm:py-16 px-6 sm:px-8 lg:px-16 overflow-hidden">
        {/* background image */}
        <div className="absolute inset-0">
          <img
            src={innovationImg}
            alt=""
            className="w-full h-full object-cover"
            fetchPriority="high"
            loading="eager"
            decoding="async"
          />
          <div className="overlay-gradient absolute inset-0" />
        </div>

        {/* colored accent strip */}
        <div className={`absolute inset-x-0 bottom-0 h-1 ${theme.stripe}`} />

        <div className="relative z-10 w-full max-w-6xl mx-auto">
          <AnimateOnScroll>
            {/* back nav */}
            <Link
              to="/subsidiaries"
              className="inline-flex items-center gap-1.5 text-xs font-sans text-white/70 hover:text-white transition-colors mb-5 group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              All Subsidiaries
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {/* logo */}
              <div className={`shrink-0 w-28 h-20 sm:w-36 sm:h-24 rounded-xl overflow-hidden border border-white/20 shadow-xl ${entity.logoBg}`}>
                <img
                  src={entity.logo}
                  alt={entity.shortName}
                  className="w-full h-full object-contain p-3"
                />
              </div>

              <div>
                <span
                  className={`inline-block text-[10px] font-sans uppercase tracking-[0.2em] font-semibold px-3 py-1 rounded-full mb-2 ${theme.badge}`}
                >
                  {entity.category}
                </span>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
                  {entity.shortName}
                </h1>
                <p className="text-sm font-sans text-white/70 mt-1">{entity.tagline}</p>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-16 py-14 space-y-14">

        {/* Overview */}
        <AnimateOnScroll>
          <div className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 bg-gradient-to-br ${theme.heroBg}`}>
            <div className={`absolute top-0 left-0 w-1 h-full ${theme.stripe} rounded-l-2xl`} />
            <p className={`text-xs font-sans font-semibold uppercase tracking-widest mb-3 ${theme.accentText}`}>
              About {entity.shortName}
            </p>
            <p className="font-sans text-foreground/90 leading-relaxed text-[15px]">{entity.overview}</p>
            <a
              href={entity.website}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 mt-5 text-sm font-sans font-medium ${theme.accentText} hover:underline underline-offset-4 transition-colors`}
            >
              <Globe className="h-4 w-4" />
              {entity.website.replace(/^https?:\/\//, "")}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </AnimateOnScroll>

        {/* Staff Resources */}
        <div>
          <AnimateOnScroll>
            <p className={`text-xs font-sans font-semibold uppercase tracking-widest mb-1 ${theme.accentText}`}>
              Staff Resources
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">
              Quick Access
            </h2>
          </AnimateOnScroll>

          <div className="grid sm:grid-cols-3 gap-4 items-stretch">
            <AnimateOnScroll delay={0} className="h-full">
              <ResourceCard
                icon={<Mail className="h-5 w-5" />}
                title="Email Portal"
                description="Access your staff email account and stay connected with your team."
                link={entity.emailPortal}
                theme={theme}
              />
            </AnimateOnScroll>

            <AnimateOnScroll delay={0.08} className="h-full">
              <ResourceCard
                icon={<Users className="h-5 w-5" />}
                title="HR Portal"
                description="Manage leave requests, payslips, HR policies, and employee records."
                link={entity.hrPortal}
                theme={theme}
              />
            </AnimateOnScroll>

            <AnimateOnScroll delay={0.16} className="h-full">
              <ResourceCard
                icon={<FileText className="h-5 w-5" />}
                title="EMR System"
                description="Access the Electronic Medical Records system for patient data and clinical workflows."
                link={entity.emr}
                theme={theme}
              />
            </AnimateOnScroll>
          </div>
        </div>

        {/* IT Support */}
        <AnimateOnScroll>
          <div className="rounded-2xl border border-border/60 overflow-hidden shadow-sm">
            {/* header strip */}
            <div className={`${theme.stripe} px-6 sm:px-8 py-4 flex items-center gap-3`}>
              <Headphones className="h-5 w-5 text-white" />
              <h3 className="text-base font-semibold text-white">IT Support</h3>
            </div>

            <div className="bg-card px-6 sm:px-8 py-7">
              <p className="text-sm font-sans text-muted-foreground mb-6 leading-relaxed">
                For technical assistance — system access issues, software support, network problems,
                or device queries — contact the {entity.shortName} IT team directly.
              </p>

              <div className="grid sm:grid-cols-3 gap-4">
                {/* Email */}
                <div className={`flex items-start gap-3 rounded-xl border p-4 ${theme.cardBg} ${theme.cardBorder}`}>
                  <span className={`mt-0.5 ${theme.iconColor}`}>
                    <Mail className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-sans font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      Email
                    </p>
                    <a
                      href={`mailto:${entity.itSupport.email}`}
                      className={`text-sm font-sans font-medium ${theme.accentText} hover:underline underline-offset-4 break-all`}
                    >
                      {entity.itSupport.email}
                    </a>
                  </div>
                </div>

                {/* Helpdesk */}
                <div className={`flex items-start gap-3 rounded-xl border p-4 ${theme.cardBg} ${theme.cardBorder}`}>
                  <span className={`mt-0.5 ${theme.iconColor}`}>
                    <Headphones className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-sans font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      Helpdesk
                    </p>
                    {entity.itSupport.helpdeskUrl ? (
                      <a
                        href={entity.itSupport.helpdeskUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 text-sm font-sans font-medium ${theme.accentText} hover:underline underline-offset-4`}
                      >
                        Open portal <ArrowUpRight className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-sm font-sans text-muted-foreground">Contact via email</span>
                    )}
                  </div>
                </div>

                {/* Hours */}
                <div className={`flex items-start gap-3 rounded-xl border p-4 ${theme.cardBg} ${theme.cardBorder}`}>
                  <span className={`mt-0.5 ${theme.iconColor}`}>
                    <Clock className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-sans font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      Support Hours
                    </p>
                    <p className="text-sm font-sans text-foreground">{entity.itSupport.hours}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimateOnScroll>

      </div>
    </>
  );
}
