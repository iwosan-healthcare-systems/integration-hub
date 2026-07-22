import { useEffect, useRef, useState } from "react";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { ArticleLink } from "@/components/ArticleLink";
import { getNews, type NewsItem } from "@/services/cmsService";
import { Clock } from "lucide-react";
import { Seo } from "@/components/Seo";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const NEWS_SEO = (
  <Seo
    title="News & Announcements"
    description="Internal updates, industry news, and organizational highlights from across the Iwosan network."
    path="/news"
  />
);

const PAGE_SIZE = 9;

// Builds a compact page list with ellipses, e.g. [1, "ellipsis", 4, 5, 6, "ellipsis", 10]
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

const NewsPage = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    getNews().then(({ news: data }) => {
      setNews(data ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const categories = ["All", ...Array.from(new Set(news.map((n) => n.category)))];
  const filtered = filter === "All" ? news : news.filter((n) => n.category === filter);
  const hasFeatured = Boolean(filtered[0]?.featured);
  const rest = hasFeatured ? filtered.slice(1) : filtered;
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = rest.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === currentPage) return;
    setPage(p);
    const container = document.getElementById("main-scroll");
    if (container && sectionRef.current) {
      const containerTop = container.getBoundingClientRect().top;
      const sectionTop = sectionRef.current.getBoundingClientRect().top;
      container.scrollTo({ top: container.scrollTop + (sectionTop - containerTop), behavior: "smooth" });
    } else {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) {
    return (
      <>
        {NEWS_SEO}
        <section className="bg-news-header min-h-[220px] sm:min-h-[240px] flex items-center py-14 sm:py-16 px-6 sm:px-8 lg:px-16 relative overflow-hidden">
          <div className="w-full max-w-6xl mx-auto">
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">Stay Updated</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">News & Announcements</h1>
            <p className="font-sans text-white/60 max-w-xl">Internal updates, industry news, and organizational highlights.</p>
          </div>
        </section>
        <section className="py-12 px-6 sm:px-8 lg:px-16 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-48 rounded-xl bg-muted animate-pulse" />
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-5 w-full rounded bg-muted animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {NEWS_SEO}
      <section className="bg-news-header min-h-[220px] sm:min-h-[240px] flex items-center py-14 sm:py-16 px-6 sm:px-8 lg:px-16 relative overflow-hidden">
        <div className="w-full max-w-6xl mx-auto">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">Stay Updated</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">News & Announcements</h1>
            <p className="font-sans text-white/60 max-w-xl">
              Internal updates, industry news, and organizational highlights.
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      <section ref={sectionRef} className="py-12 px-6 sm:px-8 lg:px-16 max-w-6xl mx-auto scroll-mt-24">
        <div className="flex flex-wrap gap-2 mb-10">
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

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-16">No news articles found.</p>
        )}

        {/* Featured article — only on the first page */}
        {currentPage === 1 && filtered.length > 0 && filtered[0].featured && (
          <AnimateOnScroll>
            <ArticleLink item={filtered[0]} className="grid lg:grid-cols-2 gap-8 mb-14 group">
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
            </ArticleLink>
          </AnimateOnScroll>
        )}

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pageItems.map((item, i) => (
            <AnimateOnScroll key={item.id} delay={i * 0.1}>
              <ArticleLink item={item} className="group block">
                {item.image && (
                  <div className="h-48 rounded-xl overflow-hidden mb-4 img-zoom">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-sans uppercase tracking-widest text-accent font-medium">{item.category}</span>
                  <span className="text-xs font-sans text-muted-foreground">{item.date}</span>
                </div>
                <h3 className="font-serif font-semibold text-lg mb-2 group-hover:text-accent transition-colors">{item.title}</h3>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed line-clamp-2">{item.excerpt}</p>
              </ArticleLink>
            </AnimateOnScroll>
          ))}
        </div>

        {totalPages > 1 && (
          <Pagination className="mt-12">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(currentPage - 1);
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-40" : ""}
                />
              </PaginationItem>
              {getPageNumbers(currentPage, totalPages).map((p, i) =>
                p === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      isActive={p === currentPage}
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(p);
                      }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(currentPage + 1);
                  }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-40" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </section>
    </>
  );
};

export default NewsPage;
