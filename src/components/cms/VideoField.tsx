import { useRef, useState } from "react";
import { Upload, X, Video as VideoIcon, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { requestVideoUploadUrl, uploadVideoToS3, getVideoPlayUrlByKey } from "@/services/cmsService";
import { getVideoDurationSeconds } from "@/lib/videoDuration";

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

interface VideoFieldProps {
  label?: string;
  // The uploaded video's S3 key, or "" if none is attached.
  value: string;
  onChange: (key: string) => void;
  // Reports the selected file's actual length (in seconds) once read
  // client-side, so callers can derive a duration field from the video
  // itself rather than leaving it free-typed. Fires as soon as the file is
  // chosen — doesn't wait for the upload to finish.
  onDurationDetected?: (seconds: number) => void;
}

export function VideoField({ label = "Video", value, onChange, onDurationDetected }: VideoFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  async function handleUpload(file: File) {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setError("Unsupported format. Use MP4, WebM, or MOV.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`Video is too large — max 500MB (this file is ${(file.size / (1024 * 1024)).toFixed(0)}MB).`);
      return;
    }
    setError("");
    if (onDurationDetected) getVideoDurationSeconds(file).then((s) => { if (s) onDurationDetected(s); });
    setUploading(true);
    setProgress(0);
    const { uploadUrl, key, error: urlErr } = await requestVideoUploadUrl(file.type, file.size);
    if (urlErr || !uploadUrl || !key) {
      setUploading(false);
      setError(urlErr || "Could not start upload.");
      return;
    }
    const { error: uploadErr } = await uploadVideoToS3(uploadUrl, file, setProgress);
    setUploading(false);
    if (uploadErr) { setError(uploadErr); return; }
    onChange(key);
  }

  async function openPreview() {
    if (!value) return;
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewUrl(null);
    const { url, error: err } = await getVideoPlayUrlByKey(value);
    setPreviewLoading(false);
    if (err || !url) setPreviewError(err || "Could not load this video.");
    else setPreviewUrl(url);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
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
            ? <><span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />Uploading… {progress}%</>
            : <><Upload className="h-3.5 w-3.5" />{value ? "Replace video" : "Upload video"}</>}
        </Button>
        {value && !uploading && (
          <Button type="button" variant="outline" size="sm" className="gap-2 text-xs" onClick={openPreview}>
            <Play className="h-3.5 w-3.5" />Preview
          </Button>
        )}
        <span className="text-[10px] text-muted-foreground">MP4, WebM, or MOV · max 500MB</span>
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          title="Upload video"
          aria-label="Upload video"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
        />
      </div>

      {uploading && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {value && !uploading && (
        <div className="flex items-center gap-2 text-sm rounded-md border border-input px-3 py-2 bg-muted/30">
          <VideoIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate flex-1 text-muted-foreground">Video attached</span>
          <button
            type="button"
            aria-label="Remove video"
            onClick={() => onChange("")}
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Dialog open={!!previewUrl || previewLoading || !!previewError} onOpenChange={(v) => { if (!v) { setPreviewUrl(null); setPreviewError(""); } }}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
          <DialogTitle className="sr-only">Video preview</DialogTitle>
          <div className="relative bg-black flex items-center justify-center aspect-video">
            {previewError ? (
              <p className="text-sm text-white/70 px-6 text-center">{previewError}</p>
            ) : previewUrl ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={previewUrl} controls autoPlay className="w-full h-full" />
            ) : (
              <span className="h-8 w-8 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
