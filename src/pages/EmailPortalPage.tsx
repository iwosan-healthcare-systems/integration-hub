import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { subsidiaries } from "@/data/hub-data";
import { ArrowUpRight, Clock, Mail } from "lucide-react";
import innovationImg from "@/assets/innovation-bg.webp";

const portalUrls: Partial<Record<string, string>> = {
  "Iwosan Healthcare Systems Limited": "https://outlook.office365.com/mail/",
  "Iwosan Lagoon Hospitals Limited": "https://mail.lagoonhospitals.com/",
  "Eurapharma Care Services Nigeria Limited": "https://outlook.office365.com/mail/",
  "Paelon Memorial Hospital Limited": "https://webmail.paelonmemorial.com/",
  "IASO Medipark Limited": "https://outlook.office365.com/mail/",
};

const emailPortalSubsidiaries = subsidiaries;

const portalStyles: Record<string, { accent: string; badge: string; logoHalo: string; surface: string }> = {
  "Iwosan Healthcare Systems Limited": {
    accent: "bg-accent",
    badge: "bg-accent/10 text-accent",
    logoHalo: "bg-accent/20",
    surface: "from-accent/10 via-background to-background",
  },
  "Iwosan Lagoon Hospitals Limited": {
    accent: "bg-sky-500",
    badge: "bg-sky-500/10 text-sky-700",
    logoHalo: "bg-sky-500/20",
    surface: "from-sky-500/10 via-background to-background",
  },
  "Eurapharma Care Services Nigeria Limited": {
    accent: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700",
    logoHalo: "bg-emerald-500/20",
    surface: "from-emerald-500/10 via-background to-background",
  },
  "Paelon Memorial Hospital Limited": {
    accent: "bg-rose-500",
    badge: "bg-rose-500/10 text-rose-700",
    logoHalo: "bg-rose-500/20",
    surface: "from-rose-500/10 via-background to-background",
  },
  "IASO Medipark Limited": {
    accent: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700",
    logoHalo: "bg-amber-500/20",
    surface: "from-amber-500/10 via-background to-background",
  },
  default: {
    accent: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground",
    logoHalo: "bg-muted-foreground/10",
    surface: "from-muted/70 via-background to-background",
  },
};

const EmailPortalPage = () => {
  return (
    <>
      {/* Header */}
      <section className="relative h-[40vh] min-h-[300px] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img src={innovationImg} alt="" className="w-full h-full object-cover" fetchPriority="high" loading="eager" decoding="async" />
          <div className="overlay-gradient absolute inset-0" />
        </div>
        <div className="relative z-10 px-6 sm:px-8 lg:px-16 pb-10 md:pb-12">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">Tools</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground">
              Email Portal
            </h1>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="py-16 px-8 lg:px-16 max-w-6xl mx-auto">
        <AnimateOnScroll>
          <p className="font-sans text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            Access subsidiary webmail portals across the Iwosan network.
          </p>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-2 gap-8">
          {emailPortalSubsidiaries.map((subsidiary, i) => {
            const portalUrl = portalUrls[subsidiary.name];
            const style = portalStyles[subsidiary.name] ?? portalStyles.default;
            const content = (
              <>
                <div className={`absolute inset-x-0 top-0 h-1 ${style.accent}`} />
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="relative shrink-0">
                    <div className={`absolute -inset-1 rounded-lg ${style.logoHalo} opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100`} />
                    <div className={`relative h-24 w-full overflow-hidden rounded-lg border border-border/60 shadow-sm sm:w-40 ${subsidiary.logoBg ?? "bg-muted"}`}>
                      <img
                        src={subsidiary.logo}
                        alt={`${subsidiary.name} logo`}
                        className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-sans uppercase tracking-widest text-accent font-medium">{subsidiary.category}</span>
                        {portalUrl ? (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-sans font-semibold ${style.badge}`}>
                            <Mail className="h-3.5 w-3.5" />
                            Webmail
                          </span>
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <h3 className={`font-serif text-xl font-semibold leading-snug transition-colors ${portalUrl ? "text-foreground group-hover:text-accent" : "text-foreground/70"}`}>
                        {subsidiary.name}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-sans text-muted-foreground leading-relaxed">
                        {portalUrl ? "Secure mail access for your team." : "Portal link coming soon."}
                      </p>
                      {portalUrl && (
                        <span className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-xs font-sans font-semibold text-primary-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                          Open
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            );

            return (
              <AnimateOnScroll key={subsidiary.name} delay={i * 0.1}>
                {portalUrl ? (
                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group relative block overflow-hidden rounded-lg border border-border/60 bg-gradient-to-br ${style.surface} p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`}
                  >
                    {content}
                  </a>
                ) : (
                  <div className={`relative overflow-hidden rounded-lg border border-border/60 bg-gradient-to-br ${style.surface} p-5 opacity-80`}>
                    {content}
                  </div>
                )}
              </AnimateOnScroll>
            );
          })}
        </div>
      </section>
    </>
  );
};

export default EmailPortalPage;
