import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Play, Video as VideoIcon, Clock, FolderOpen, Images, Link as LinkIcon, PictureInPicture2 } from "lucide-react";
import { toast } from "sonner";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getVideos, getVideoAlbums, getVideoPlayUrl, type Video, type VideoAlbum } from "@/services/cmsService";
import { slugify } from "@/lib/utils";
import innovationImg from "@/assets/innovation-bg.webp";
import { Seo } from "@/components/Seo";

function copyLink(path: string, label: string) {
  navigator.clipboard.writeText(`${window.location.origin}${path}`).then(
    () => toast.success(`${label} link copied to clipboard`),
    () => toast.error("Could not copy link")
  );
}

// ── Video card (used in the standalone grid and inside an album dialog) ────
// Hovering briefly loads a muted, looping preview of the video itself in
// place of the thumbnail — the signed URL is fetched lazily (after a short
// delay, so a quick mouse pass-over doesn't fire a request) and cached per
// card so re-hovering doesn't refetch it.

function VideoCard({ video, onClick, delay = 0 }: { video: Video; onClick: () => void; delay?: number }) {
  const [hovering, setHovering] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const cachedPreviewUrl = useRef<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startHover() {
    setHovering(true);
    if (cachedPreviewUrl.current) { setPreviewUrl(cachedPreviewUrl.current); return; }
    hoverTimer.current = setTimeout(() => {
      getVideoPlayUrl(video.id).then(({ url }) => {
        if (url) { cachedPreviewUrl.current = url; setPreviewUrl(url); }
      });
    }, 350);
  }

  function endHover() {
    setHovering(false);
    setPreviewUrl(null);
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
  }

  const showingPreview = hovering && !!previewUrl;

  return (
    <AnimateOnScroll delay={delay}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={startHover}
        onMouseLeave={endHover}
        className="group block w-full text-left"
      >
        <div className="relative aspect-video rounded-xl overflow-hidden mb-3 img-zoom bg-muted transition-shadow duration-300 group-hover:shadow-lg">
          {video.thumbnail
            ? <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center"><VideoIcon className="h-6 w-6 text-muted-foreground/40" /></div>}
          {showingPreview && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={previewUrl!}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              onLoadedMetadata={(e) => { e.currentTarget.currentTime = Math.min(1.5, e.currentTarget.duration || 0); }}
            />
          )}
          {!showingPreview && (
            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="h-11 w-11 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="h-4 w-4 text-iwosan-navy fill-current ml-0.5" />
              </div>
            </div>
          )}
          {video.duration && (
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5">
              <Clock className="h-3 w-3" />{video.duration}
            </span>
          )}
        </div>
        <h3 className="font-serif font-semibold text-sm leading-snug mb-1 group-hover:text-accent transition-colors line-clamp-1">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-xs font-sans text-muted-foreground leading-relaxed line-clamp-2">
            {video.description}
          </p>
        )}
      </button>
    </AnimateOnScroll>
  );
}

// ── Video player dialog (own URL, deep-linkable, with a PiP button) ────────

function VideoPlayerDialog({
  video, backLabel, onClose, onCopyLink,
}: {
  video: Video | null; backLabel?: string; onClose: () => void; onCopyLink: () => void;
}) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [playError, setPlayError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipSupported = typeof document !== "undefined" && "pictureInPictureEnabled" in document;

  useEffect(() => {
    if (!video) { setPlayUrl(null); setPlayError(""); return; }
    setPlayUrl(null);
    setPlayError("");
    getVideoPlayUrl(video.id).then(({ url, error }) => {
      if (error || !url) setPlayError(error || "Could not load this video.");
      else setPlayUrl(url);
    });
  }, [video]);

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
    <Dialog open={!!video} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {video && (
          <>
            <DialogTitle className="sr-only">{video.title}</DialogTitle>
            <div className="relative bg-black flex items-center justify-center aspect-video">
              {playError ? (
                <p className="text-sm text-white/70 px-6 text-center">{playError}</p>
              ) : playUrl ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video ref={videoRef} src={playUrl} controls autoPlay className="w-full h-full" />
                  {pipSupported && (
                    <button
                      type="button"
                      aria-label="Picture in picture"
                      title="Picture in picture"
                      onClick={togglePip}
                      className="absolute top-3 right-14 h-9 w-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                    >
                      <PictureInPicture2 className="h-4 w-4" />
                    </button>
                  )}
                </>
              ) : (
                <span className="h-8 w-8 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <div className="p-6 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-serif text-xl font-bold mb-1">{video.title}</h2>
                  {backLabel && <p className="text-xs text-muted-foreground">From the album "{backLabel}"</p>}
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={onCopyLink}>
                  <LinkIcon className="h-3.5 w-3.5" />Copy link
                </Button>
              </div>
              {video.description && (
                <p className="font-sans text-sm text-muted-foreground leading-relaxed">{video.description}</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main page — also mounted at /video-albums/:slug and /videos/:slug so ───
// albums and individual videos each get their own shareable, deep-linkable
// URL, while browsing itself stays a simple in-page dialog rather than a
// dedicated gallery page.

const VideoLibraryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const isAlbumRoute = location.pathname.startsWith("/video-albums/");

  const [albums, setAlbums] = useState<VideoAlbum[]>([]);
  const [standalone, setStandalone] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getVideoAlbums(), getVideos()]).then(([a, v]) => {
      setAlbums(a.albums ?? []);
      setStandalone(v.videos ?? []);
      setLoading(false);
    });
  }, []);

  const allVideos = useMemo(() => [...standalone, ...albums.flatMap((a) => a.videos)], [standalone, albums]);

  const openAlbum = isAlbumRoute ? albums.find((a) => slugify(a.title) === slug) ?? null : null;
  const openVideo = !isAlbumRoute && slug ? allVideos.find((v) => slugify(v.title) === slug) ?? null : null;
  const openVideoAlbum = openVideo?.albumId ? albums.find((a) => a.id === openVideo.albumId) ?? null : null;

  const notFound = !loading && !!slug && (isAlbumRoute ? !openAlbum : !openVideo);

  function closeAlbum() { navigate("/videos"); }
  function closeVideo() {
    if (openVideoAlbum) navigate(`/video-albums/${slugify(openVideoAlbum.title)}`);
    else navigate("/videos");
  }

  if (notFound) return <Navigate to="/videos" replace />;

  return (
    <>
      <Seo
        title={openVideo ? openVideo.title : openAlbum ? openAlbum.title : "Video Library"}
        description={openVideo?.description || openAlbum?.description || "Training videos and recordings from across the Iwosan network."}
        path={openVideo ? `/videos/${slug}` : openAlbum ? `/video-albums/${slug}` : "/videos"}
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
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">Media</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">Video Library</h1>
            <p className="font-sans text-white/60 max-w-xl">
              Training videos and recordings from across the Iwosan network.
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Videos */}
      <section className="py-12 px-6 sm:px-8 lg:px-16 max-w-6xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-video rounded-xl bg-muted animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : albums.length === 0 && standalone.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No videos have been added yet.</p>
        ) : (
          <div className="space-y-14">
            {albums.length > 0 && (
              <div>
                <h2 className="font-serif text-xl font-bold mb-6">Albums</h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                  {albums.map((album, i) => {
                    const cover = album.videos[0]?.thumbnail;
                    return (
                      <AnimateOnScroll key={album.id} delay={(i % 8) * 0.06}>
                        <button
                          type="button"
                          onClick={() => navigate(`/video-albums/${slugify(album.title)}`)}
                          className="group block w-full text-left"
                        >
                          <div className="relative aspect-video rounded-xl overflow-hidden mb-4 img-zoom bg-muted transition-shadow duration-300 group-hover:shadow-lg">
                            {cover
                              ? <img src={cover} alt={album.title} className="w-full h-full object-cover" loading="lazy" />
                              : <div className="w-full h-full flex items-center justify-center"><FolderOpen className="h-6 w-6 text-muted-foreground/40" /></div>}
                            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5">
                              <Images className="h-3 w-3" />{album.videos.length}
                            </span>
                          </div>
                          <h3 className="font-serif font-semibold text-base leading-snug mb-1.5 group-hover:text-accent transition-colors line-clamp-1">
                            {album.title}
                          </h3>
                          {album.description && (
                            <p className="text-sm font-sans text-muted-foreground leading-relaxed line-clamp-3">
                              {album.description}
                            </p>
                          )}
                        </button>
                      </AnimateOnScroll>
                    );
                  })}
                </div>
              </div>
            )}

            {standalone.length > 0 && (
              <div>
                {albums.length > 0 && <h2 className="font-serif text-xl font-bold mb-6">Videos</h2>}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                  {standalone.map((video, i) => (
                    <VideoCard key={video.id} video={video} delay={(i % 8) * 0.06} onClick={() => navigate(`/videos/${slugify(video.title)}`)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Album dialog */}
      <Dialog open={!!openAlbum} onOpenChange={(v) => { if (!v) closeAlbum(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          {openAlbum && (
            <>
              <DialogTitle className="flex items-center justify-between gap-3 pr-6">
                <span className="font-serif">{openAlbum.title}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0 font-sans font-normal"
                  onClick={() => copyLink(`/video-albums/${slugify(openAlbum.title)}`, "Album")}
                >
                  <LinkIcon className="h-3.5 w-3.5" />Copy link
                </Button>
              </DialogTitle>
              {openAlbum.description && <p className="text-sm text-muted-foreground -mt-1">{openAlbum.description}</p>}
              {openAlbum.videos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No videos in this album yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                  {openAlbum.videos.map((video) => (
                    <VideoCard key={video.id} video={video} onClick={() => navigate(`/videos/${slugify(video.title)}`)} />
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Video player dialog */}
      <VideoPlayerDialog
        video={openVideo}
        backLabel={openVideoAlbum?.title}
        onClose={closeVideo}
        onCopyLink={() => openVideo && copyLink(`/videos/${slugify(openVideo.title)}`, "Video")}
      />
    </>
  );
};

export default VideoLibraryPage;
