import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Images } from "lucide-react";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { getPictureLibrary, type PictureLibraryItem } from "@/services/cmsService";
import { slugify, isOwnUploadUrl } from "@/lib/utils";
import innovationImg from "@/assets/innovation-bg.webp";
import { Seo } from "@/components/Seo";

const PictureLibraryPage = () => {
  const navigate = useNavigate();
  const [pictures, setPictures] = useState<PictureLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPictureLibrary().then(({ pictures: data }) => {
      setPictures(data ?? []);
      setLoading(false);
    });
  }, []);

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
            {pictures.map((pic, i) => {
              const cover = pic.images.find(isOwnUploadUrl);
              return (
                <AnimateOnScroll key={pic.id} delay={(i % 8) * 0.06}>
                  <button
                    type="button"
                    onClick={() => navigate(`/album/${slugify(pic.title)}`)}
                    className="group block w-full text-left"
                  >
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 img-zoom bg-muted transition-shadow duration-300 group-hover:shadow-lg">
                      {cover
                        ? <img src={cover} alt={pic.title} className="w-full h-full object-cover" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center"><ExternalLink className="h-6 w-6 text-muted-foreground/40" /></div>}
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
              );
            })}
          </div>
        )}
      </section>
    </>
  );
};

export default PictureLibraryPage;
