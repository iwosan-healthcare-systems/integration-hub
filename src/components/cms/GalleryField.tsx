import { useRef, useState } from "react";
import { Plus, Upload, X, ImageIcon, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage } from "@/services/cmsService";
import { PictureLibraryPickerDialog } from "./PictureLibraryPickerDialog";

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
  const [uploadTotal, setUploadTotal] = useState(0);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

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
    setUploading(true);
    setUploadTotal(fileList.length);
    setError("");

    const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
    const results = await Promise.all(
      fileList.map(async (file) => {
        try {
          const base64 = await readAsDataUrl(file);
          return await uploadImage(base64);
        } catch {
          return { url: null, error: "Failed to read file" };
        }
      })
    );

    setUploading(false);
    const uploaded = results.filter((r): r is { url: string; error: null } => !!r.url).map((r) => `${apiBase}${r.url}`);
    if (uploaded.length > 0) onChange([...value, ...uploaded]);

    const failedCount = results.length - uploaded.length;
    if (failedCount > 0) {
      setError(`${failedCount} of ${results.length} image${results.length !== 1 ? "s" : ""} failed to upload.`);
    }
  }

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {hint && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">{hint}</span>}
      </Label>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-9 w-9 rounded overflow-hidden bg-muted/30 border border-border/60 shrink-0 flex items-center justify-center">
                {url
                  ? <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  : <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/40" />}
              </div>
              <Input
                value={url}
                onChange={(e) => updateAt(i, e.target.value)}
                placeholder="https://…"
                className="flex-1"
              />
              <Button type="button" aria-label="Remove image" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeAt(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
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
            ? <><span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />Uploading {uploadTotal > 1 ? `${uploadTotal} images…` : "…"}</>
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
      {error && <p className="text-xs text-destructive">{error}</p>}

      {enableLibraryPicker && (
        <PictureLibraryPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          multiple
          onSelect={(urls) => { onChange([...value, ...urls]); setPickerOpen(false); }}
        />
      )}
    </div>
  );
}
