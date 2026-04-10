import { HubLayout } from "@/layouts/HubLayout";
import { subsidiaries } from "@/data/hub-data";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

const categories = ["All", ...Array.from(new Set(subsidiaries.map((s) => s.category)))];

const SubsidiariesPage = () => {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? subsidiaries : subsidiaries.filter((s) => s.category === filter);

  return (
    <HubLayout>
      <div className="hub-section max-w-5xl mx-auto">
        <span className="hub-badge mb-3 inline-block">Platforms</span>
        <h1 className="text-3xl font-bold mb-2">Subsidiaries & Platforms</h1>
        <p className="text-muted-foreground mb-8">Explore the Iwosan network of healthcare services and platforms.</p>

        <div className="flex flex-wrap gap-2 mb-8">
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((sub) => (
            <a
              key={sub.name}
              href={sub.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hub-card p-6 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                  <span className="text-accent-foreground font-bold text-lg">
                    {sub.name.split(" ").pop()?.[0]}
                  </span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="hub-badge mb-2 inline-block">{sub.category}</span>
              <h3 className="font-semibold text-card-foreground mb-1">{sub.name}</h3>
              <p className="text-sm text-muted-foreground">{sub.description}</p>
            </a>
          ))}
        </div>
      </div>
    </HubLayout>
  );
};

export default SubsidiariesPage;
