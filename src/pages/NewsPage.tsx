import { HubLayout } from "@/layouts/HubLayout";
import { newsItems } from "@/data/hub-data";
import { Clock } from "lucide-react";
import { useState } from "react";

const categories = ["All", ...Array.from(new Set(newsItems.map((n) => n.category)))];

const NewsPage = () => {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? newsItems : newsItems.filter((n) => n.category === filter);

  return (
    <HubLayout>
      <div className="hub-section max-w-5xl mx-auto">
        <span className="hub-badge mb-3 inline-block">Stay Updated</span>
        <h1 className="text-3xl font-bold mb-2">News & Announcements</h1>
        <p className="text-muted-foreground mb-8">Internal updates, industry news, and organizational highlights.</p>

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

        <div className="grid md:grid-cols-2 gap-5">
          {filtered.map((item) => (
            <div key={item.title} className={`hub-card p-6 ${item.featured ? "md:col-span-2" : ""}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="hub-badge">{item.category}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {item.date}
                </span>
                {item.featured && (
                  <span className="ml-auto text-xs font-medium text-accent">Featured</span>
                )}
              </div>
              <h3 className="font-semibold text-lg text-card-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.excerpt}</p>
            </div>
          ))}
        </div>
      </div>
    </HubLayout>
  );
};

export default NewsPage;
