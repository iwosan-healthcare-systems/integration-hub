import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Search, X, FileText, Newspaper, Building2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { newsItems, subsidiaries } from "@/data/hub-data";
import iwosanIcon from "@/assets/iwosan_icon.webp";

const navItems = [
  { title: "Home", url: "/" },
  { title: "About Iwosan", url: "/about" },
  { title: "Subsidiaries", url: "/subsidiaries" },
  { title: "Resources", url: "/resources" },
  { title: "News & Updates", url: "/news" },
  { title: "Leadership", url: "/leadership" },
];

type SearchItem = {
  type: "page" | "news" | "subsidiary";
  title: string;
  url: string;
  external: boolean;
  meta?: string;
  description?: string;
};

export function TopNavbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const searchableItems = useMemo<SearchItem[]>(
    () => [
      ...navItems.map((item) => ({
        type: "page" as const,
        title: item.title,
        url: item.url,
        external: false,
      })),
      ...newsItems.map((item) => ({
        type: "news" as const,
        title: item.title,
        url: item.url,
        external: true,
        meta: `${item.category} · ${item.date}`,
        description: item.excerpt,
      })),
      ...subsidiaries.map((sub) => ({
        type: "subsidiary" as const,
        title: sub.name,
        url: sub.url,
        external: true,
        meta: sub.category,
        description: sub.description,
      })),
    ],
    [],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchableItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.meta?.toLowerCase().includes(q),
    );
  }, [query, searchableItems]);

  const open = useCallback((url: string, external: boolean) => {
    if (external) {
      window.open(url, "_blank", "noopener noreferrer");
    } else {
      navigate(url);
    }
    setSearchOpen(false);
    setQuery("");
  }, [navigate]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results.length > 0) open(results[0].url, results[0].external);
  };

  const typeIcon = (type: SearchItem["type"]) => {
    if (type === "news") return <Newspaper className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
    if (type === "subsidiary") return <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
    return <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  };

  return (
    <header className="relative z-30">
      <div className="h-16 flex items-center justify-between border-b border-border/50 bg-background/90 backdrop-blur-md px-4 md:px-6 sticky top-0">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
          <div className="hidden md:flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Iwosan Innovation Hub</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:border-accent"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search className="h-4 w-4" />
          </Button>

          <div className="hidden md:flex items-center gap-2 rounded-full border border-border/60 bg-muted px-3 py-2">
            <img src={iwosanIcon} alt="Iwosan Healthcare" className="h-7 w-auto" />
            <span className="text-xs font-medium text-foreground">Iwosan</span>
          </div>
        </div>
      </div>

      {searchOpen && (
        <div className="absolute inset-x-0 top-full z-40 mt-3 px-4 md:px-6">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-border/70 bg-popover shadow-xl ring-1 ring-border/10">
            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-b border-border/70 bg-background/95 p-4">
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages, news, subsidiaries…"
                className="flex-1"
              />
              <Button type="submit" className="px-4">Search</Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setSearchOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </form>

            <div className="max-h-80 overflow-y-auto p-3">
              {query.trim() ? (
                results.length > 0 ? (
                  <div className="grid gap-1.5">
                    {results.slice(0, 8).map((result) => (
                      <button
                        key={`${result.type}-${result.url}`}
                        type="button"
                        onClick={() => open(result.url, result.external)}
                        className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-left transition hover:border-accent hover:bg-accent/5"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {typeIcon(result.type)}
                          <span className="text-sm font-semibold text-foreground leading-snug">{result.title}</span>
                        </div>
                        {result.meta && (
                          <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-medium">
                            {result.meta}
                          </span>
                        )}
                        {result.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {result.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground px-1 py-2">No results found for &ldquo;{query}&rdquo;.</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground px-1 py-2">Search pages, news articles, and subsidiaries.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
