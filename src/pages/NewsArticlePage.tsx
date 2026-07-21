import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { ArticleLink } from "@/components/ArticleLink";
import { ArticleBody } from "@/components/ArticleBody";
import { slugify } from "@/lib/utils";
import { getNews, type NewsItem } from "@/services/cmsService";

const RECENT_POSTS_COUNT = 3;

const NewsArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getNews().then(({ news }) => {
      const found = news?.find((n) => slugify(n.title) === slug) ?? null;
      if (!found) setNotFound(true);
      setItem(found);
      setAllNews(news ?? []);
      setLoading(false);
    });
  }, [slug]);

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

  const recentPosts = allNews.filter((n) => n.id !== item.id).slice(0, RECENT_POSTS_COUNT);

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

      <AnimateOnScroll>
        <ArticleBody
          title={item.title}
          image={item.image}
          category={item.category}
          date={item.date}
          excerpt={item.excerpt}
          content={item.content}
          images={item.images}
          url={item.url}
        />
      </AnimateOnScroll>

      {/* Recent posts */}
      {recentPosts.length > 0 && (
        <AnimateOnScroll delay={0.1}>
          <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-16 mt-14 pt-10 border-t border-border/60">
            <h2 className="font-serif text-lg sm:text-xl font-bold mb-6">Recent Posts</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {recentPosts.map((post) => (
                <ArticleLink key={post.id} item={post} className="group block">
                  {post.image && (
                    <div className="h-32 rounded-lg overflow-hidden mb-3 img-zoom">
                      <img src={post.image} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-sans uppercase tracking-widest text-accent font-medium">{post.category}</span>
                    <span className="text-[10px] font-sans text-muted-foreground">{post.date}</span>
                  </div>
                  <h3 className="font-serif font-semibold text-sm leading-snug group-hover:text-accent transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                </ArticleLink>
              ))}
            </div>
          </div>
        </AnimateOnScroll>
      )}
    </article>
  );
};

export default NewsArticlePage;
