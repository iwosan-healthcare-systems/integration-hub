import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Download, ExternalLink, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { useZoomPan } from "@/hooks/useZoomPan";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getPictureLibrary, type PictureLibraryItem } from "@/services/cmsService";
import { slugify, isOwnUploadUrl } from "@/lib/utils";
import { downloadUrl, downloadImagesAsZip, filenameFromUrl } from "@/lib/download";
import { Seo } from "@/components/Seo";

const AlbumPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<PictureLibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setSelected(new Set());
    getPictureLibrary().then(({ pictures }) => {
      const found = pictures?.find((p) => slugify(p.title) === slug) ?? null;
      if (!found) setNotFound(true);
      setAlbum(found);
      setLoading(false);
    });
  }, [slug]);

  const containerRef = useRef<HTMLDivElement>(null);
  const { scale, pos, reset: resetZoom, bind } = useZoomPan(containerRef);

  useEffect(() => {
    resetZoom();
  }, [activeIndex, resetZoom]);

  const step = useCallback(
    (delta: number) => {
      if (!album) return;
      setActiveIndex((i) => (i === null ? 0 : (i + delta + album.images.length) % album.images.length));
    },
    [album]
  );

  useEffect(() => {
    if (activeIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, step]);

  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const selectAll = () => album && setSelected(new Set(album.images.map((_, i) => i)));
  const clearSelection = () => setSelected(new Set());

  const copyAlbumLink = () => {
    if (!album) return;
    const url = `${window.location.origin}/album/${slugify(album.title)}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Album link copied to clipboard"),
      () => toast.error("Could not copy link")
    );
  };

  const handleDownloadSelected = async () => {
    if (!album) return;
    const chosen = Array.from(selected).map((i) => album.images[i]);
    const urls = chosen.filter(isOwnUploadUrl);
    const externalCount = chosen.length - urls.length;
    if (urls.length === 0) {
      toast.error("Selected images are external links and can't be bundled for download.");
      return;
    }
    setZipping(true);
    const { succeeded, failed } = await downloadImagesAsZip(urls, slugify(album.title));
    setZipping(false);
    if (succeeded > 0) toast.success(`Downloaded ${succeeded} image${succeeded !== 1 ? "s" : ""} as a zip file.`);
    const skipped = failed + externalCount;
    if (skipped > 0) toast.error(`${skipped} image${skipped !== 1 ? "s" : ""} couldn't be included${externalCount ? " (external links)" : ""}.`);
  };

  const handleDownloadOne = async () => {
    if (!album || activeIndex === null) return;
    const url = album.images[activeIndex];
    if (!isOwnUploadUrl(url)) return;
    try {
      await downloadUrl(url, filenameFromUrl(url, `${slugify(album.title)}-${activeIndex + 1}.jpg`));
    } catch {
      toast.error("Could not download image");
    }
  };

  if (loading) {
    return (
      <section className="py-12 px-6 sm:px-8 lg:px-16 max-w-6xl mx-auto">
        <div className="h-4 w-32 rounded bg-muted animate-pulse mb-6" />
        <div className="h-8 w-64 rounded bg-muted animate-pulse mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (notFound || !album) {
    return <Navigate to="/picture-library" replace />;
  }

  return (
    <>
      <Seo
        title={album.title}
        description={album.description || `Photos from ${album.title}`}
        path={`/album/${slug}`}
      />

      <section className="py-10 px-6 sm:px-8 lg:px-16 max-w-6xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/picture-library")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />Picture Library
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold mb-2">{album.title}</h1>
            {album.description && <p className="text-muted-foreground max-w-2xl">{album.description}</p>}
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={copyAlbumLink}>
            <LinkIcon className="h-3.5 w-3.5" />Copy link
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm text-muted-foreground">
            {album.images.length} photo{album.images.length !== 1 ? "s" : ""}
            {selected.size > 0 ? ` · ${selected.size} selected` : ""}
          </p>
          <div className="flex items-center gap-2">
            {selected.size > 0 ? (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
                <Button type="button" size="sm" className="gap-1.5" onClick={handleDownloadSelected} disabled={zipping}>
                  {zipping
                    ? <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <Download className="h-3.5 w-3.5" />}
                  Download {selected.size}
                </Button>
              </>
            ) : (
              album.images.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={selectAll}>Select all</Button>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {album.images.map((src, i) => {
            const own = isOwnUploadUrl(src);
            const isSelected = selected.has(i);
            return (
              <AnimateOnScroll key={i} delay={(i % 8) * 0.04} className="relative group">
                <button
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className="block w-full aspect-square rounded-xl overflow-hidden bg-muted border border-border/60 img-zoom"
                >
                  {own
                    ? <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center"><ExternalLink className="h-6 w-6 text-muted-foreground/40" /></div>}
                </button>
                <button
                  type="button"
                  aria-label={isSelected ? "Deselect image" : "Select image"}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(i); }}
                  className={`absolute top-2 left-2 h-6 w-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isSelected ? "bg-accent border-accent" : "bg-black/45 border-white/85 group-hover:bg-black/60"
                  }`}
                >
                  {isSelected && <Check className="h-4 w-4 text-white" />}
                </button>
              </AnimateOnScroll>
            );
          })}
        </div>
      </section>

      {/* Single-image viewer */}
      <Dialog open={activeIndex !== null} onOpenChange={(v) => { if (!v) setActiveIndex(null); }}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] p-0 gap-0 overflow-hidden">
          {activeIndex !== null && (
            <>
              <DialogTitle className="sr-only">{`${album.title} — photo ${activeIndex + 1}`}</DialogTitle>
              <div
                ref={containerRef}
                className="relative bg-black flex items-center justify-center h-[75vh] overflow-hidden touch-none select-none"
                {...bind}
              >
                {isOwnUploadUrl(album.images[activeIndex]) ? (
                  <img
                    src={album.images[activeIndex]}
                    alt={album.title}
                    draggable={false}
                    className="max-w-full max-h-full object-contain"
                    style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, cursor: scale > 1 ? "grab" : "default" }}
                  />
                ) : (
                  <a
                    href={album.images[activeIndex]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 text-white/80 hover:text-white py-16 transition-colors"
                  >
                    <ExternalLink className="h-8 w-8" />
                    <span className="text-sm font-medium">View image</span>
                  </a>
                )}

                {album.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous photo"
                      onClick={() => step(-1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next photo"
                      onClick={() => step(1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5">
                      {activeIndex + 1} / {album.images.length}
                    </span>
                  </>
                )}

                {isOwnUploadUrl(album.images[activeIndex]) && (
                  <button
                    type="button"
                    aria-label="Download image"
                    title="Download image"
                    onClick={handleDownloadOne}
                    className="absolute top-3 right-14 h-9 w-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AlbumPage;
