import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { subsidiaries } from "@/data/hub-data";
import { ExternalLink, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import innovationImg from "@/assets/innovation-bg.webp";

const categories = ["All", ...Array.from(new Set(subsidiaries.map((s) => s.category)))];

const SubsidiariesPage = () => {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? subsidiaries : subsidiaries.filter((s) => s.category === filter);

  return (
    <>

      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img src={innovationImg} alt="" className="w-full h-full object-cover" fetchPriority="high" loading="eager" decoding="async" />
          <div className="overlay-gradient absolute inset-0" />
        </div>
        <div className="relative z-10 px-8 lg:px-16 pb-12">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">Network</p>
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground">
              Subsidiaries & Platforms
            </h1>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="py-16 px-8 lg:px-16 max-w-6xl mx-auto">
        <AnimateOnScroll>
          <p className="font-sans text-muted-foreground max-w-2xl mb-8 leading-relaxed">
            Explore the Iwosan network of healthcare services, facilities, and platforms
            driving excellence across Nigeria.
          </p>
          <div className="flex flex-wrap gap-2 mb-12">
            {categories.map((cat) => (
              <button
                key={cat}
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

        <div className="grid md:grid-cols-2 gap-8">
          {filtered.map((sub, i) => (
            <AnimateOnScroll key={sub.name} delay={i * 0.1}>
              <a
                href={sub.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block hover-lift"
              >
                <div className="flex gap-5 items-start">
                  <div className={`w-36 h-20 rounded-xl overflow-hidden shrink-0 relative ${sub.logoBg ?? "bg-muted"}`}>
                    {sub.logo ? (
                      <img
                        src={sub.logo}
                        alt={`${sub.name} logo`}
                        className="absolute inset-0 w-full h-full object-contain p-3"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-sans uppercase tracking-widest text-accent font-medium">{sub.category}</span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="font-serif font-semibold text-lg text-foreground group-hover:text-accent transition-colors mb-1">{sub.name}</h3>
                    <p className="text-sm font-sans text-muted-foreground leading-relaxed line-clamp-2">{sub.description}</p>
                  </div>
                </div>
              </a>
            </AnimateOnScroll>
          ))}
        </div>
      </section>

    </>
  );
};

export default SubsidiariesPage;
