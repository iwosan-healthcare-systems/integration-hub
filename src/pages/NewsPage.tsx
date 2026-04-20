import { HubLayout } from "@/layouts/HubLayout";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { newsItems } from "@/data/hub-data";
import { Clock } from "lucide-react";
import { useState } from "react";
const categories = ["All", ...Array.from(new Set(newsItems.map((n) => n.category)))];

const NewsPage = () => {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? newsItems : newsItems.filter((n) => n.category === filter);

  return (
    <HubLayout>
      <section className="bg-news-header py-16 px-8 lg:px-16 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">Stay Updated</p>
            <h1 className="text-4xl font-bold text-primary-foreground mb-3">News & Announcements</h1>
            <p className="font-sans text-primary-foreground/60 max-w-xl">
              Internal updates, industry news, and organizational highlights.
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="py-12 px-8 lg:px-16 max-w-6xl mx-auto">
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

        {/* Featured article */}
        {filtered.length > 0 && filtered[0].featured && (
          <AnimateOnScroll>
            <a href={filtered[0].url} target="_blank" rel="noopener noreferrer" className="grid lg:grid-cols-2 gap-8 mb-14 group">
              <div className="rounded-2xl overflow-hidden img-zoom h-72 lg:h-auto">
                <img src={filtered[0].image} alt={filtered[0].title} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-sans uppercase tracking-widest text-accent font-medium">{filtered[0].category}</span>
                  <span className="text-xs font-sans text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {filtered[0].date}
                  </span>
                </div>
                <h2 className="font-serif text-2xl lg:text-3xl font-bold mb-3 group-hover:text-accent transition-colors">
                  {filtered[0].title}
                </h2>
                <p className="font-sans text-muted-foreground leading-relaxed">{filtered[0].excerpt}</p>
              </div>
            </a>
          </AnimateOnScroll>
        )}

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.slice(1).map((item, i) => (
            <AnimateOnScroll key={item.title} delay={i * 0.1}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block">
                <div className="h-48 rounded-xl overflow-hidden mb-4 img-zoom">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-sans uppercase tracking-widest text-accent font-medium">{item.category}</span>
                  <span className="text-xs font-sans text-muted-foreground">{item.date}</span>
                </div>
                <h3 className="font-serif font-semibold text-lg mb-2 group-hover:text-accent transition-colors">{item.title}</h3>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed line-clamp-2">{item.excerpt}</p>
              </a>
            </AnimateOnScroll>
          ))}
        </div>
      </section>
    </HubLayout>
  );
};

export default NewsPage;
