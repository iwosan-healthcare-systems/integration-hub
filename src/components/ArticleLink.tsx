import { Link } from "react-router-dom";
import type { NewsItem } from "@/services/cmsService";

// Original articles (no external url) link to the in-app article page; others open the source in a new tab.
export function ArticleLink({ item, className, children }: { item: NewsItem; className?: string; children: React.ReactNode }) {
  if (item.url) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={`/news/${item.id}`} className={className}>
      {children}
    </Link>
  );
}
