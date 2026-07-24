import { useRef, useState } from "react";
import { Plus, Upload, X, ImageIcon, ExternalLink, Library, Images } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadImage } from "@/services/cmsService";
import { isOwnUploadUrl } from "@/lib/utils";
import { compressImageFile } from "@/lib/imageCompression";
import { mapWithConcurrency } from "@/lib/concurrency";
import { PictureLibraryPickerDialog } from "./PictureLibraryPickerDialog";

const MAX_UPLOAD_BATCH = 50;
const UPLOAD_CONCURRENCY = 6;
// Once this many real images are present, switch from an editable row list
// (one per image) to a compact thumbnail grid — a bulk upload of dozens of
// photos otherwise turns into a very long scroll of near-identical rows.
const COMPACT_VIEW_THRESHOLD = 10;

interface GalleryFieldProps {
  value: string[];
  onChange: (v: string[]) => void;
  label?: string;
  hint?: string;
  addButtonLabel?: string;
  // Off for the Picture Library's own form — picking "from the library" to
  // build a library entry would be circular.
  enableLibraryPicker?: boolean;
}

interface FailedUpload {
  name: string;
  error: string;
}

export function GalleryField({
  value,
  onChange,
  label = "Additional Images",
  hint = "optional — extra photos shown within the article",
  addButtonLabel = "Upload image",
  enableLibraryPicker = true,
}: GalleryFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [batchError, setBatchError] = useState("");
  const [failedUploads, setFailedUploads] = useState<FailedUpload[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  function updateAt(i: number, v: string) {
    onChange(value.map((u, idx) => (idx === i ? v : u)));
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function handleUpload(files: FileList) {
    const fileList = Array.from(files);
    if (fileList.length > MAX_UPLOAD_BATCH) {
      const message = `You can only upload ${MAX_UPLOAD_BATCH} images at a time. You selected ${fileList.length}.`;
      setBatchError(message);
      toast.error(message);
      return;
    }
    setUploading(true);
    setUploadTotal(fileList.length);
    setUploadDone(0);
    setBatchError("");
    setFailedUploads([]);

    const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
    let current = [...value];
    const newlyFailed: FailedUpload[] = [];

    await mapWithConcurrency(
      fileList,
      UPLOAD_CONCURRENCY,
      async (file) => {
        try {
          const compressed = await compressImageFile(file);
          const base64 = await readAsDataUrl(compressed);
          const result = await uploadImage(base64);
          return { file, ...result };
        } catch {
          return { file, url: null, error: "Failed to read file" };
        }
      },
      (result) => {
        setUploadDone((d) => d + 1);
        if (result.url) {
          current = [...current, `${apiBase}${result.url}`];
          onChange(current);
        } else {
          newlyFailed.push({ name: result.file.name, error: result.error || "Upload failed" });
        }
      }
    );

    setUploading(false);
    if (newlyFailed.length > 0) {
      setFailedUploads(newlyFailed);
      toast.error(`${newlyFailed.length} of ${fileList.length} image${fileList.length !== 1 ? "s" : ""} failed to upload — see details below.`);
    } else {
      toast.success(`${fileList.length} image${fileList.length !== 1 ? "s" : ""} uploaded.`);
    }
  }

  const filled = value.map((url, i) => ({ url, i })).filter((e) => !!e.url);
  const empty = value.map((url, i) => ({ url, i })).filter((e) => !e.url);
  const useCompactView = filled.length >= COMPACT_VIEW_THRESHOLD;

  function renderRow(url: string, i: number) {
    const external = !!url && !isOwnUploadUrl(url);
    return (
      <div key={i} className="flex items-center gap-2">
        <div className="h-9 w-9 rounded overflow-hidden bg-muted/30 border border-border/60 shrink-0 flex items-center justify-center">
          {external
            ? <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60" />
            : url
              ? <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              : <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/40" />}
        </div>
        <Input
          value={url}
          onChange={(e) => updateAt(i, e.target.value)}
          placeholder="https://… (e.g. a Drive share link)"
          className="flex-1"
        />
        {external && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open link in new tab"
            title="Open link in new tab"
            className="h-8 w-8 shrink-0 flex items-center justify-center text-muted-foreground hover:text-accent"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <Button type="button" aria-label="Remove image" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeAt(i)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {hint && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">{hint}</span>}
      </Label>

      {(filled.length > 0 || empty.length > 0) && (
        <div className="space-y-2">
          {useCompactView ? (
            <Button type="button" variant="outline" size="sm" className="gap-2 text-xs" onClick={() => setViewerOpen(true)}>
              <Images className="h-3.5 w-3.5" />View uploaded images ({filled.length})
            </Button>
          ) : (
            filled.map((e) => renderRow(e.url, e.i))
          )}
          {empty.map((e) => renderRow(e.url, e.i))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" className="gap-2 text-xs" onClick={() => onChange([...value, ""])}>
          <Plus className="h-3.5 w-3.5" />Add image URL
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading
            ? <><span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />Uploading {uploadTotal > 1 ? `${uploadDone}/${uploadTotal}…` : "…"}</>
            : <><Upload className="h-3.5 w-3.5" />{addButtonLabel}</>}
        </Button>
        {enableLibraryPicker && (
          <Button type="button" variant="outline" size="sm" className="gap-2 text-xs" onClick={() => setPickerOpen(true)}>
            <Library className="h-3.5 w-3.5" />Choose from library
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          title="Upload additional images"
          aria-label="Upload additional images"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) handleUpload(files);
            e.target.value = "";
          }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">Large photos are automatically resized before upload — up to 20MB per file.</p>
      {batchError && <p className="text-xs text-destructive">{batchError}</p>}

      {failedUploads.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-destructive">
              {failedUploads.length} image{failedUploads.length !== 1 ? "s" : ""} didn't upload — re-select {failedUploads.length !== 1 ? "them" : "it"} to try again:
            </p>
            <button type="button" aria-label="Dismiss" onClick={() => setFailedUploads([])} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="text-xs text-destructive/90 space-y-0.5 max-h-32 overflow-y-auto">
            {failedUploads.map((f, i) => (
              <li key={i} className="truncate">
                <span className="font-medium">{f.name}</span> — {f.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {enableLibraryPicker && (
        <PictureLibraryPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          multiple
          onSelect={(urls) => { onChange([...value, ...urls]); setPickerOpen(false); }}
        />
      )}

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Uploaded images ({filled.length})</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 pt-1">
            {filled.map((e) => (
              <div key={e.i} className="relative group aspect-square rounded-md overflow-hidden bg-muted border border-border/60">
                {isOwnUploadUrl(e.url)
                  ? <img src={e.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center"><ExternalLink className="h-4 w-4 text-muted-foreground/40" /></div>}
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => removeAt(e.i)}
                  className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 hover:bg-destructive text-white flex items-center justify-center transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
