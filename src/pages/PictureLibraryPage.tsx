import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getPictureLibrary, type PictureLibraryItem } from "@/services/cmsService";
import innovationImg from "@/assets/innovation-bg.webp";
import { Seo } from "@/components/Seo";

const PictureLibraryPage = () => {
  const [pictures, setPictures] = useState<PictureLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<PictureLibraryItem | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    getPictureLibrary().then(({ pictures: data }) => {
      setPictures(data ?? []);
      setLoading(false);
    });
  }, []);

  const openAlbum = (pic: PictureLibraryItem) => {
    setActive(pic);
    setActiveIndex(0);
  };

  const step = (delta: number) => {
    if (!active) return;
    setActiveIndex((i) => (i + delta + active.images.length) % active.images.length);
  };

  return (
    <>
      <Seo
        title="Picture Library"
        description="Moments, events, and milestones from across the Iwosan network."
        path="/picture-library"
      />
      {/* Hero */}
      <section className="relative min-h-[220px] sm:min-h-[240px] flex items-center py-14 sm:py-16 px-6 sm:px-8 lg:px-16 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={innovationImg}
            alt=""
            className="w-full h-full object-cover"
            fetchPriority="high"
            loading="eager"
            decoding="async"
          />
          <div className="overlay-gradient absolute inset-0" />
        </div>
        <div className="relative z-10 w-full max-w-6xl mx-auto">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">Gallery</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">Picture Library</h1>
            <p className="font-sans text-white/60 max-w-xl">
              Moments, events, and milestones from across the Iwosan network.
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-12 px-6 sm:px-8 lg:px-16 max-w-6xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[4/3] rounded-xl bg-muted animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : pictures.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No pictures have been added yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {pictures.map((pic, i) => (
              <AnimateOnScroll key={pic.id} delay={(i % 8) * 0.06}>
                <button
                  type="button"
                  onClick={() => openAlbum(pic)}
                  className="group block w-full text-left"
                >
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 img-zoom bg-muted">
                    <img src={pic.images[0]} alt={pic.title} className="w-full h-full object-cover" loading="lazy" />
                    {pic.images.length > 1 && (
                      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5">
                        <Images className="h-3 w-3" />{pic.images.length}
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif font-semibold text-sm leading-snug mb-1 group-hover:text-accent transition-colors line-clamp-1">
                    {pic.title}
                  </h3>
                  {pic.description && (
                    <p className="text-xs font-sans text-muted-foreground leading-relaxed line-clamp-2">
                      {pic.description}
                    </p>
                  )}
                </button>
              </AnimateOnScroll>
            ))}
          </div>
        )}
      </section>

      {/* Lightbox */}
      <Dialog open={!!active} onOpenChange={(v) => { if (!v) setActive(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          {active && (
            <>
              <div className="relative bg-black flex items-center justify-center max-h-[60vh] overflow-hidden">
                <img
                  src={active.images[activeIndex]}
                  alt={active.title}
                  className="w-full h-full max-h-[60vh] object-contain"
                />
                {active.images.length > 1 && (
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
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5">
                      {activeIndex + 1} / {active.images.length}
                    </span>
                  </>
                )}
              </div>
              <div className="p-6">
                <DialogTitle className="font-serif text-xl font-bold mb-2">{active.title}</DialogTitle>
                {active.description && (
                  <p className="font-sans text-sm text-muted-foreground leading-relaxed">{active.description}</p>
                )}
                {active.images.length > 1 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                    {active.images.map((src, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`View image ${i + 1}`}
                        title={`View image ${i + 1}`}
                        onClick={() => setActiveIndex(i)}
                        className={`shrink-0 h-14 w-14 rounded-lg overflow-hidden border-2 transition-colors ${
                          i === activeIndex ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PictureLibraryPage;
