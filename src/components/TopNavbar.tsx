import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { newsItems } from "@/data/hub-data";
import iwosanIcon from "@/assets/iwosan_icon.png";

const navItems = [
  { title: "Home", url: "/" },
  { title: "About Iwosan", url: "/about" },
  { title: "Subsidiaries", url: "/subsidiaries" },
  { title: "Resources", url: "/resources" },
  { title: "News & Updates", url: "/news" },
  { title: "Leadership", url: "/leadership" },
];

export function TopNavbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const searchableItems = useMemo(
    () => [
      ...navItems.map((item) => ({ type: "page" as const, title: item.title, url: item.url })),
      ...newsItems.map((item) => ({
        type: "news" as const,
        title: item.title,
        url: "/news",
        description: item.excerpt,
      })),
    ],
    [],
  );

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    return searchableItems.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized),
    );
  }, [query, searchableItems]);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (results.length > 0) {
      navigate(results[0].url);
      setSearchOpen(false);
      setQuery("");
    }
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
            onClick={() => setSearchOpen((open) => !open)}
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
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 border-b border-border/70 bg-background/95 p-4">
              <Input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages and news..."
                className="flex-1"
              />
              <Button type="submit" className="px-4">
                Search
              </Button>
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
            <div className="max-h-72 overflow-y-auto p-4">
              {query.trim() ? (
                results.length > 0 ? (
                  <div className="grid gap-2">
                    {results.slice(0, 6).map((result) => (
                      <button
                        key={`${result.type}-${result.title}`}
                        type="button"
                        onClick={() => {
                          navigate(result.url);
                          setSearchOpen(false);
                          setQuery("");
                        }}
                        className="w-full rounded-2xl border border-border/70 bg-background p-4 text-left transition hover:border-accent hover:bg-accent/5"
                      >
                        <span className="block text-sm font-semibold text-foreground">{result.title}</span>
                        <span className="mt-2 inline-flex text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          {result.type === "page" ? "Page" : "News"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No results found for &ldquo;{query}&rdquo;.</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">Search by page title or news headline.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
