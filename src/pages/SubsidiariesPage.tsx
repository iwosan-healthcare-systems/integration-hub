import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { subsidiaries } from "@/data/hub-data";
import { subsidiaryPortals } from "@/data/subsidiary-data";
import innovationImg from "@/assets/innovation-bg.webp";
import { Seo } from "@/components/Seo";

const categories = ["All", ...Array.from(new Set(subsidiaries.map((s) => s.category)))];

// map hub-data name → slug for internal routing
const slugByName: Record<string, string> = Object.fromEntries(
  subsidiaryPortals.map((p) => [p.name, p.slug])
);

const SubsidiariesPage = () => {
  const [filter, setFilter] = useState("All");
  const filtered =
    filter === "All" ? subsidiaries : subsidiaries.filter((s) => s.category === filter);

  return (
    <>
      <Seo
        title="Subsidiaries & Platforms"
        description="Explore the hospitals and platforms across the Iwosan Healthcare network."
        path="/subsidiaries"
      />
      {/* Hero */}
      <section className="relative min-h-[220px] sm:min-h-[240px] flex items-center py-14 sm:py-16 px-6 sm:px-8 lg:px-16 overflow-hidden">
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
        <div className="relative z-10 w-full max-w-6xl mx-auto">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">
              Network
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              Subsidiaries & Platforms
            </h1>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="py-16 px-8 lg:px-16 max-w-6xl mx-auto">
        <AnimateOnScroll>
          <p className="font-sans text-muted-foreground max-w-2xl mb-8 leading-relaxed">
            Explore the Iwosan network of healthcare services, facilities, and platforms driving
            excellence across Nigeria.
          </p>
          <div className="flex flex-wrap gap-2 mb-12">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`px-5 py-2 rounded-full font-sans text-sm font-medium transition-all duration-300 ${
                  filter === cat
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map((sub, i) => {
            const slug = slugByName[sub.name];

            return (
              <AnimateOnScroll key={sub.name} delay={i * 0.1}>
                <div className="group block rounded-xl border border-border/60 bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:border-accent/40">
                  <div className="flex gap-4 items-start">
                    {/* logo */}
                    <div
                      className={`w-24 h-16 sm:w-32 sm:h-20 rounded-xl overflow-hidden shrink-0 relative border border-border/40 ${sub.logoBg ?? "bg-muted"}`}
                    >
                      {sub.logo ? (
                        <img
                          src={sub.logo}
                          alt={`${sub.name} logo`}
                          className="absolute inset-0 w-full h-full object-contain p-3"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </div>

                    {/* info */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-sans uppercase tracking-widest text-accent font-medium">
                          {sub.category}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="font-serif font-semibold text-lg text-foreground group-hover:text-accent transition-colors mb-1">
                        {sub.name}
                      </h3>
                      <p className="text-sm font-sans text-muted-foreground leading-relaxed line-clamp-2">
                        {sub.description}
                      </p>
                    </div>
                  </div>

                  {/* footer row */}
                  {slug && (
                    <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-end">
                      <Link
                        to={`/subsidiaries/${slug}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3.5 py-1.5 text-xs font-sans font-semibold text-accent hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
                      >
                        Learn more <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              </AnimateOnScroll>
            );
          })}
        </div>
      </section>
    </>
  );
};

export default SubsidiariesPage;
