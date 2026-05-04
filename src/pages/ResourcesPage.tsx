import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { subsidiaries } from "@/data/hub-data";
import { ArrowRight, Building2, FileText, Shield, Users } from "lucide-react";

const sopFolderUrl = "https://iwosan.sharepoint.com/sites/IWOSAN-HEALTHCARE-SYSTEMS/Shared%20Documents/Forms/AllItems.aspx";

const sopFocusAreas = [
  {
    title: "Clinical & Operational Standards",
    description: "Aligned procedures for day-to-day care delivery, service quality, documentation, and operational handoffs across the network.",
    icon: Shield,
  },
  {
    title: "People & Department Workflows",
    description: "Clear process references for teams, departments, and support functions so work is consistent, auditable, and easy to follow.",
    icon: Users,
  },
  {
    title: "Governance & Compliance",
    description: "Controlled SOP access for policies, approvals, reviews, and updates that support safe healthcare operations.",
    icon: FileText,
  },
];

const ResourcesPage = () => {
  return (
    <>
      {/* Header */}
      <section className="bg-resources-header min-h-[220px] sm:min-h-[240px] flex items-center py-14 sm:py-16 px-6 sm:px-8 lg:px-16 relative overflow-hidden">
        <div className="w-full max-w-6xl mx-auto">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">Knowledge Base</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
              Subsidiary SOP Repository
            </h1>
            <p className="font-sans text-primary-foreground/60 max-w-xl">
              A single access point for standard operating procedures across the Iwosan network, helping every subsidiary work from consistent, approved, and up-to-date process documents.
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="px-6 py-14 sm:px-8 lg:px-16">
        <div className="max-w-5xl mx-auto">
          <AnimateOnScroll>
            <div className="mb-10 max-w-3xl">
              <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-2">Purpose</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                One source for how work gets done
              </h2>
              <p className="font-sans text-muted-foreground leading-relaxed">
                The SOP folder brings together approved procedures for Iwosan Healthcare Systems Limited and its subsidiaries. It is designed to help teams find the right guidance quickly, follow common standards, and maintain reliable service delivery across clinical, administrative, and operational functions.
              </p>
            </div>
          </AnimateOnScroll>

          <div className="grid gap-5 md:grid-cols-3 mb-14">
            {sopFocusAreas.map((area, i) => (
              <AnimateOnScroll key={area.title} delay={i * 0.08}>
                <div className="h-full rounded-lg border border-border/60 bg-background p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                    <area.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-foreground mb-2">{area.title}</h3>
                  <p className="font-sans text-sm text-muted-foreground leading-relaxed">{area.description}</p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <AnimateOnScroll direction="left">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-sans uppercase tracking-[0.2em] text-accent text-[10px] font-medium">Coverage</p>
                    <h2 className="text-xl font-bold text-foreground">All subsidiaries</h2>
                  </div>
                </div>

                <div className="space-y-3">
                  {subsidiaries.map((subsidiary) => (
                    <div
                      key={subsidiary.name}
                      className="flex items-center gap-4 rounded-lg border border-border/50 bg-background px-4 py-3"
                    >
                      <div className={`relative h-12 w-20 shrink-0 overflow-hidden rounded-md ${subsidiary.logoBg ?? "bg-muted"}`}>
                        <img
                          src={subsidiary.logo}
                          alt={`${subsidiary.name} logo`}
                          className="absolute inset-0 h-full w-full object-contain p-2"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-sans text-sm font-semibold text-foreground">{subsidiary.name}</p>
                        <p className="font-sans text-xs text-muted-foreground">{subsidiary.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll direction="right" delay={0.1}>
              <div className="rounded-lg bg-primary p-6 sm:p-8 text-primary-foreground">
                <p className="font-sans uppercase tracking-[0.2em] text-accent text-[10px] font-medium mb-3">SharePoint Access</p>
                <h2 className="text-2xl font-bold mb-4">Open the SOP folder</h2>
                <p className="font-sans text-sm text-primary-foreground/65 leading-relaxed mb-6">
                  Use the SharePoint folder to view SOP documents, review current process guidance, and access subsidiary-specific procedure files when needed.
                </p>
                <a
                  href={sopFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex w-full items-center justify-between rounded-full bg-accent px-5 py-3 text-sm font-sans font-semibold text-accent-foreground transition-opacity hover:opacity-90 sm:w-auto sm:min-w-56"
                >
                  See SOP files
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>
    </>
  );
};

export default ResourcesPage;
