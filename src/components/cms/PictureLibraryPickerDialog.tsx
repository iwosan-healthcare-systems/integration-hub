import { useEffect, useMemo, useState } from "react";
import { ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getPictureLibrary, type PictureLibraryItem } from "@/services/cmsService";

interface PictureLibraryPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (imageUrl: string) => void;
}

interface FlatPhoto {
  url: string;
  albumTitle: string;
}

export function PictureLibraryPickerDialog({ open, onOpenChange, onSelect }: PictureLibraryPickerDialogProps) {
  const [pictures, setPictures] = useState<PictureLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || loaded) return;
    setLoading(true);
    getPictureLibrary().then(({ pictures: data }) => {
      setPictures(data ?? []);
      setLoaded(true);
      setLoading(false);
    });
  }, [open, loaded]);

  // Albums hold multiple photos — flatten to individually pickable images,
  // since this picker returns a single image URL.
  const photos = useMemo<FlatPhoto[]>(
    () => pictures.flatMap((pic) => pic.images.map((url) => ({ url, albumTitle: pic.title }))),
    [pictures]
  );

  const filtered = photos.filter((p) => p.albumTitle.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose from Picture Library</DialogTitle>
        </DialogHeader>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by album title…"
        />

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              {photos.length === 0
                ? "No pictures in the library yet. Add some from the Picture Library page."
                : "No pictures match your search."}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-2">
              {filtered.map((photo, i) => (
                <button
                  key={`${photo.url}-${i}`}
                  type="button"
                  onClick={() => onSelect(photo.url)}
                  className="group text-left"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border/60 group-hover:border-accent transition-colors">
                    {photo.url ? (
                      <img src={photo.url} alt={photo.albumTitle} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-foreground truncate mt-1 group-hover:text-accent transition-colors">{photo.albumTitle}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
