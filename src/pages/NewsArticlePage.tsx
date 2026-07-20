import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Clock } from "lucide-react";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { getNews, type NewsItem } from "@/services/cmsService";

function toParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const NewsArticlePage = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getNews().then(({ news }) => {
      const found = news?.find((n) => String(n.id) === id) ?? null;
      if (!found) setNotFound(true);
      setItem(found);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-16 py-10 space-y-6">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="h-80 sm:h-96 rounded-2xl bg-muted animate-pulse" />
        <div className="h-8 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
        <div className="space-y-3 pt-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 w-full rounded bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !item) {
    return <Navigate to="/news" replace />;
  }

  const paragraphs = toParagraphs(item.content);

  return (
    <article className="pb-16">
      {/* Back nav */}
      <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-16 pt-8 pb-4">
        <Link
          to="/news"
          className="inline-flex items-center gap-1.5 text-xs font-sans text-muted-foreground hover:text-accent transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to News
        </Link>
      </div>

      {/* Full-bleed cover image */}
      {item.image && (
        <AnimateOnScroll>
          <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-16 mb-8 sm:mb-10">
            <div className="rounded-2xl overflow-hidden bg-muted">
              <img
                src={item.image}
                alt={item.title}
                className="w-full max-h-[520px] object-cover"
                loading="eager"
              />
            </div>
          </div>
        </AnimateOnScroll>
      )}

      <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-16">
        <AnimateOnScroll>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold mb-4 leading-tight">
            {item.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 pb-6 mb-8 border-b border-border/60">
            <span className="text-[10px] font-sans uppercase tracking-widest text-accent font-semibold">
              {item.category}
            </span>
            <span className="text-muted-foreground/40">&middot;</span>
            <span className="text-xs font-sans text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {item.date}
            </span>
          </div>

          {/* Body */}
          {paragraphs.length > 0 ? (
            <div className="font-sans text-foreground/90 leading-relaxed text-[15px] sm:text-base space-y-5">
              {paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line">{p}</p>
              ))}
            </div>
          ) : (
            <p className="font-sans text-muted-foreground leading-relaxed">{item.excerpt}</p>
          )}

          {/* Additional photos */}
          {item.images.length > 0 && (
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {item.images.map((src, i) => (
                <div key={i} className="rounded-xl overflow-hidden aspect-[4/3] bg-muted">
                  <img
                    src={src}
                    alt={`${item.title} — photo ${i + 2}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-10 text-sm font-sans font-medium text-accent hover:underline underline-offset-4 transition-colors"
            >
              Read the original source
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </AnimateOnScroll>
      </div>
    </article>
  );
};

export default NewsArticlePage;
