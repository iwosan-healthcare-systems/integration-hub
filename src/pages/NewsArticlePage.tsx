import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Clock } from "lucide-react";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { getNews, type NewsItem } from "@/services/cmsService";

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
      <section className="py-14 px-6 sm:px-8 lg:px-16 max-w-3xl mx-auto space-y-6">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="h-8 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-72 rounded-xl bg-muted animate-pulse" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 w-full rounded bg-muted animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (notFound || !item) {
    return <Navigate to="/news" replace />;
  }

  return (
    <section className="py-14 px-6 sm:px-8 lg:px-16 max-w-3xl mx-auto">
      <AnimateOnScroll>
        <Link
          to="/news"
          className="inline-flex items-center gap-1.5 text-xs font-sans text-muted-foreground hover:text-accent transition-colors mb-6 group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to News
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] font-sans uppercase tracking-widest text-accent font-medium">{item.category}</span>
          <span className="text-xs font-sans text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> {item.date}
          </span>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold mb-6 leading-tight">{item.title}</h1>

        {item.image && (
          <div className="rounded-2xl overflow-hidden mb-8">
            <img src={item.image} alt={item.title} className="w-full h-auto object-cover" loading="eager" />
          </div>
        )}

        {item.content ? (
          <div className="font-sans text-foreground/90 leading-relaxed text-[15px] whitespace-pre-line space-y-4">
            {item.content}
          </div>
        ) : (
          <p className="font-sans text-muted-foreground leading-relaxed">{item.excerpt}</p>
        )}

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-8 text-sm font-sans font-medium text-accent hover:underline underline-offset-4 transition-colors"
          >
            Read the original source
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </AnimateOnScroll>
    </section>
  );
};

export default NewsArticlePage;
