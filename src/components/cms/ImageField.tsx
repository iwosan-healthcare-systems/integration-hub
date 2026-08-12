import { useRef, useState } from "react";
import { Upload, X, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage } from "@/services/cmsService";
import { compressImageFile } from "@/lib/imageCompression";
import { PictureLibraryPickerDialog } from "./PictureLibraryPickerDialog";

interface ImageFieldProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  // Lets editors reuse an image already in the Picture Library instead of
  // re-uploading. Off by default so the Picture Library's own form (where
  // picking "from the library" would be circular) doesn't show it.
  enableLibraryPicker?: boolean;
}

export function ImageField({ label = "Image", value, onChange, enableLibraryPicker = false }: ImageFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const compressed = await compressImageFile(file);
      const base64 = await readAsDataUrl(compressed);
      const { url, error: uploadError } = await uploadImage(base64);
      setUploading(false);
      if (uploadError) { setError(`Image upload failed: ${uploadError}`); return; }
      if (url) {
        // Server returns a relative path — prepend the API base so the preview works
        const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
        onChange(`${apiBase}${url}`);
      }
    } catch {
      setUploading(false);
      setError("Failed to read file");
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {/* URL input */}
      <Input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://… (paste URL or upload below)"
      />
      {/* Upload / library buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading
            ? <><span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />Uploading…</>
            : <><Upload className="h-3.5 w-3.5" />Upload image</>}
        </Button>
        {enableLibraryPicker && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => setPickerOpen(true)}
          >
            <Library className="h-3.5 w-3.5" />Choose from library
          </Button>
        )}
        <span className="text-[10px] text-muted-foreground">JPG, PNG, WebP or GIF · resized automatically · max 20 MB</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          title="Upload image"
          aria-label="Upload image"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>
      {/* Preview */}
      {value && (
        <div className="relative w-full h-36 rounded-lg border border-border/60 overflow-hidden bg-muted/30">
          <img
            src={value}
            alt="preview"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <button
            type="button"
            aria-label="Remove image"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {enableLibraryPicker && (
        <PictureLibraryPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={([url]) => { onChange(url); setPickerOpen(false); }}
        />
      )}
    </div>
  );
}
