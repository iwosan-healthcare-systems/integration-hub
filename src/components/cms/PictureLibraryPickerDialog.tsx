import { useEffect, useMemo, useState } from "react";
import { Check, ImageIcon, LayoutGrid, List } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPictureLibrary, type PictureLibraryItem } from "@/services/cmsService";

interface PictureLibraryPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (imageUrls: string[]) => void;
  // Multi mode: click toggles a checkmark, an "Add" button confirms the batch.
  // Single mode (default): clicking an image selects it immediately.
  multiple?: boolean;
}

interface FlatPhoto {
  url: string;
  albumTitle: string;
}

export function PictureLibraryPickerDialog({ open, onOpenChange, onSelect, multiple = false }: PictureLibraryPickerDialogProps) {
  const [pictures, setPictures] = useState<PictureLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (!open || loaded) return;
    setLoading(true);
    getPictureLibrary().then(({ pictures: data }) => {
      setPictures(data ?? []);
      setLoaded(true);
      setLoading(false);
    });
  }, [open, loaded]);

  // Reset selection each time the dialog is opened fresh.
  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  // Albums hold multiple photos — flatten to individually pickable images.
  const photos = useMemo<FlatPhoto[]>(
    () => pictures.flatMap((pic) => pic.images.map((url) => ({ url, albumTitle: pic.title }))),
    [pictures]
  );

  const filtered = photos.filter((p) => p.albumTitle.toLowerCase().includes(query.trim().toLowerCase()));

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function handleClick(url: string) {
    if (multiple) {
      toggle(url);
    } else {
      onSelect([url]);
    }
  }

  function confirmSelection() {
    if (selected.size === 0) return;
    onSelect(Array.from(selected));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose from Picture Library</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by album title…"
            className="flex-1"
          />
          <div className="flex items-center rounded-md border border-input p-0.5 shrink-0">
            <Button
              type="button"
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              aria-label="Thumbnail view"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              aria-label="List view"
              onClick={() => setView("list")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            view === "grid" ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            )
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              {photos.length === 0
                ? "No pictures in the library yet. Add some from the Picture Library page."
                : "No pictures match your search."}
            </p>
          ) : view === "grid" ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-2">
              {filtered.map((photo, i) => {
                const isSelected = multiple && selected.has(photo.url);
                return (
                  <button
                    key={`${photo.url}-${i}`}
                    type="button"
                    onClick={() => handleClick(photo.url)}
                    className="group text-left"
                  >
                    <div
                      className={`relative aspect-square rounded-lg overflow-hidden bg-muted border-2 transition-colors ${
                        isSelected ? "border-accent" : "border-border/60 group-hover:border-accent/60"
                      }`}
                    >
                      {photo.url ? (
                        <img src={photo.url} alt={photo.albumTitle} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                      {multiple && (
                        <div
                          className={`absolute top-1.5 right-1.5 h-5 w-5 rounded-full flex items-center justify-center border transition-colors ${
                            isSelected
                              ? "bg-accent border-accent text-accent-foreground"
                              : "bg-black/40 border-white/60 text-transparent group-hover:bg-black/60"
                          }`}
                        >
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-foreground truncate mt-1 group-hover:text-accent transition-colors">{photo.albumTitle}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="divide-y divide-border/50 border border-border/60 rounded-lg overflow-hidden py-0">
              {filtered.map((photo, i) => {
                const isSelected = multiple && selected.has(photo.url);
                return (
                  <button
                    key={`${photo.url}-${i}`}
                    type="button"
                    onClick={() => handleClick(photo.url)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      isSelected ? "bg-accent/10" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="h-10 w-10 rounded overflow-hidden bg-muted border border-border/60 shrink-0 flex items-center justify-center">
                      {photo.url ? (
                        <img src={photo.url} alt={photo.albumTitle} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </div>
                    <p className="text-sm text-foreground truncate flex-1">{photo.albumTitle}</p>
                    {multiple && (
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                          isSelected
                            ? "bg-accent border-accent text-accent-foreground"
                            : "border-border text-transparent"
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {multiple && (
          <DialogFooter className="sm:justify-between items-center pt-2 border-t border-border/60">
            <p className="text-xs text-muted-foreground">{selected.size} selected</p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="button" size="sm" disabled={selected.size === 0} onClick={confirmSelection}>
                Add {selected.size > 0 ? selected.size : ""} image{selected.size !== 1 ? "s" : ""}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
