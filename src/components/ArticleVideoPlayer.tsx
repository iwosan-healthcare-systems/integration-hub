import { useEffect, useRef, useState } from "react";
import { PictureInPicture2 } from "lucide-react";
import { toast } from "sonner";
import { getVideoPlayUrlByKey } from "@/services/cmsService";

interface ArticleVideoPlayerProps {
  videoKey: string;
  title: string;
  className?: string;
}

// Inline player for a video attached to a News article or Course — resolves
// a fresh signed URL for the given S3 key and embeds a native <video>
// (picture-in-picture works out of the box via the browser's own controls;
// this adds an explicit button too since support for that control varies).
export function ArticleVideoPlayer({ videoKey, title, className = "rounded-2xl" }: ArticleVideoPlayerProps) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipSupported = typeof document !== "undefined" && "pictureInPictureEnabled" in document;

  useEffect(() => {
    setPlayUrl(null);
    setError("");
    getVideoPlayUrlByKey(videoKey).then(({ url, error: err }) => {
      if (err || !url) setError(err || "Could not load this video.");
      else setPlayUrl(url);
    });
  }, [videoKey]);

  async function togglePip() {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await videoRef.current.requestPictureInPicture();
    } catch {
      toast.error("Picture-in-picture isn't available for this video.");
    }
  }

  return (
    <div className={`relative overflow-hidden bg-black aspect-video ${className}`}>
      {error ? (
        <p className="text-sm text-white/70 px-6 text-center h-full flex items-center justify-center">{error}</p>
      ) : playUrl ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} src={playUrl} controls className="w-full h-full" aria-label={title} />
          {pipSupported && (
            <button
              type="button"
              aria-label="Picture in picture"
              title="Picture in picture"
              onClick={togglePip}
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            >
              <PictureInPicture2 className="h-4 w-4" />
            </button>
          )}
        </>
      ) : (
        <div className="h-full flex items-center justify-center">
          <span className="h-8 w-8 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
