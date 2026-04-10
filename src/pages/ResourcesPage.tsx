import { HubLayout } from "@/layouts/HubLayout";
import { resources } from "@/data/hub-data";
import { FileText, Shield, TrendingUp, GraduationCap, Search, Download } from "lucide-react";
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
      <div className="hub-section max-w-5xl mx-auto">
        <span className="hub-badge mb-3 inline-block">Knowledge Base</span>
        <h1 className="text-3xl font-bold mb-2">Resources & Documents</h1>
        <p className="text-muted-foreground mb-8">Access policies, training materials, and organizational documents.</p>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === cat
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((resource) => {
            const Icon = iconMap[resource.icon] || FileText;
            return (
              <div key={resource.title} className="hub-card p-4 flex items-center gap-4 group cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-card-foreground text-sm">{resource.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {resource.category} · {resource.type} · {resource.date}
                  </p>
                </div>
                <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No resources found.</p>
          )}
        </div>
      </div>
    </HubLayout>
  );
};

export default ResourcesPage;
