import { HubLayout } from "@/layouts/HubLayout";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { resources } from "@/data/hub-data";
import { FileText, Shield, TrendingUp, GraduationCap, Search, Download, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const iconMap: Record<string, any> = { FileText, Shield, TrendingUp, GraduationCap };
const categories = ["All", ...Array.from(new Set(resources.map((r) => r.category)))];

const ResourcesPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = resources.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = filter === "All" || r.category === filter;
    return matchSearch && matchCat;
  });

  return (
    <HubLayout>
      {/* Header */}
      <section className="bg-primary py-16 px-8 lg:px-16">
        <div className="max-w-4xl mx-auto">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">Knowledge Base</p>
            <h1 className="text-4xl font-bold text-primary-foreground mb-4">Resources & Documents</h1>
            <p className="font-sans text-primary-foreground/60 mb-8 max-w-xl">
              Access policies, training materials, and organizational documents.
            </p>
          </AnimateOnScroll>
          <AnimateOnScroll delay={0.15}>
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/40" />
              <Input
                placeholder="Search resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40 h-12 rounded-full font-sans"
              />
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="py-12 px-8 lg:px-16 max-w-4xl mx-auto">
        <div className="flex flex-wrap gap-2 mb-10">
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

        <div className="space-y-1">
          {filtered.map((resource, i) => {
            const Icon = iconMap[resource.icon] || FileText;
            return (
              <AnimateOnScroll key={resource.title} delay={i * 0.06}>
                <div className="flex items-center gap-4 py-4 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group border-b border-border/50 last:border-0">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-sans font-medium text-foreground text-sm group-hover:text-accent transition-colors">{resource.title}</h3>
                    <p className="text-xs font-sans text-muted-foreground mt-0.5">
                      {resource.category} · {resource.type} · {resource.date}
                    </p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </AnimateOnScroll>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center font-sans text-muted-foreground py-16">No resources found.</p>
          )}
        </div>
      </section>
    </HubLayout>
  );
};

export default ResourcesPage;
