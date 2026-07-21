import { ArrowUpRight, Clock } from "lucide-react";

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

export interface ArticleBodyProps {
  title: string;
  image: string;
  category: string;
  date: string;
  excerpt: string;
  content: string;
  images: string[];
  url?: string;
}

// Full article rendering — cover image, title, meta, interleaved body/gallery
// blocks, and the external-source link. Shared by the public article page and
// the CMS "Preview" dialog so what an editor sees before publishing is exactly
// what readers see after.
export function ArticleBody({ title, image, category, date, excerpt, content, images, url }: ArticleBodyProps) {
  const paragraphs = toParagraphs(content);
  const blocks = buildArticleBlocks(paragraphs, images);

  return (
    <>
      {image && (
        <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-16 mb-8 sm:mb-10">
          <div className="rounded-2xl overflow-hidden bg-muted">
            <img
              src={image}
              alt={title}
              className="w-full max-h-[520px] object-cover"
              loading="eager"
            />
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-16">
        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold mb-4 leading-tight">
          {title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 pb-6 mb-8 border-b border-border/60">
          <span className="text-[10px] font-sans uppercase tracking-widest text-accent font-semibold">
            {category}
          </span>
          <span className="text-muted-foreground/40">&middot;</span>
          <span className="text-xs font-sans text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> {date}
          </span>
        </div>

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
                        alt={`${title} — photo ${block.startIndex + i + 2}`}
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
          <p className="font-sans text-muted-foreground leading-relaxed text-justify">{excerpt}</p>
        )}

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-10 text-sm font-sans font-medium text-accent hover:underline underline-offset-4 transition-colors"
          >
            Read the original source
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </>
  );
}
