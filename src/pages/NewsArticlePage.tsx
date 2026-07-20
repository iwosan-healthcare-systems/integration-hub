import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Clock } from "lucide-react";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { ArticleLink } from "@/components/ArticleLink";
import { slugify } from "@/lib/utils";
import { getNews, type NewsItem } from "@/services/cmsService";

const RECENT_POSTS_COUNT = 3;
const PARAGRAPHS_PER_GROUP = 4;
const IMAGES_PER_BATCH = 3;

function toParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

type ArticleBlock =
  | { type: "paragraphs"; items: string[] }
  | { type: "images"; items: string[]; startIndex: number };

// Groups the body into ~3-4 paragraph chunks, dropping a batch of up to 3
// gallery images after each chunk until images run out. Any images left
// over once paragraphs run out are appended as a final block.
function buildArticleBlocks(paragraphs: string[], images: string[]): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  let imgIdx = 0;

  if (paragraphs.length === 0) {
    if (images.length > 0) blocks.push({ type: "images", items: images, startIndex: 0 });
    return blocks;
  }

  for (let i = 0; i < paragraphs.length; i += PARAGRAPHS_PER_GROUP) {
    blocks.push({ type: "paragraphs", items: paragraphs.slice(i, i + PARAGRAPHS_PER_GROUP) });
    if (imgIdx < images.length) {
      blocks.push({ type: "images", items: images.slice(imgIdx, imgIdx + IMAGES_PER_BATCH), startIndex: imgIdx });
      imgIdx += IMAGES_PER_BATCH;
    }
  }

  if (imgIdx < images.length) {
    blocks.push({ type: "images", items: images.slice(imgIdx), startIndex: imgIdx });
  }

  return blocks;
}

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

  const paragraphs = toParagraphs(item.content);
  const blocks = buildArticleBlocks(paragraphs, item.images);
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
          {blocks.length > 0 ? (
            <div className="space-y-8">
              {blocks.map((block, bi) =>
                block.type === "paragraphs" ? (
                  <div key={bi} className="font-sans text-foreground/90 leading-relaxed text-[15px] sm:text-base space-y-5">
                    {block.items.map((p, i) => (
                      <p key={i} className="whitespace-pre-line text-justify">{p}</p>
                    ))}
                  </div>
                ) : (
                  <div
                    key={bi}
                    className={`grid gap-3 sm:gap-4 ${block.items.length > 1 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 max-w-md"}`}
                  >
                    {block.items.map((src, i) => (
                      <div key={i} className="rounded-xl overflow-hidden aspect-[4/3] bg-muted">
                        <img
                          src={src}
                          alt={`${item.title} — photo ${block.startIndex + i + 2}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="font-sans text-muted-foreground leading-relaxed text-justify">{item.excerpt}</p>
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

        {/* Recent posts */}
        {recentPosts.length > 0 && (
          <AnimateOnScroll delay={0.1}>
            <div className="mt-14 pt-10 border-t border-border/60">
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
      </div>
    </article>
  );
};

export default NewsArticlePage;
