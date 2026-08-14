import { useEffect, useRef, useState } from 'react';
import {
  Plus, Pencil, Trash2, RefreshCw, X, Video as VideoIcon, Upload, Clock,
  Link as LinkIcon, ArrowLeft, FolderOpen, Images,
} from 'lucide-react';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ImageField } from '@/components/cms/ImageField';
import { CmsSearchBar } from '@/components/cms/CmsSearchBar';
import {
  getVideos, getVideoAlbums, requestVideoUploadUrl, uploadVideoToS3, createVideo, updateVideo, deleteVideo,
  createVideoAlbum, updateVideoAlbum, deleteVideoAlbum, uploadImage,
  type Video, type VideoInput, type VideoAlbum, type VideoAlbumInput,
} from '@/services/cmsService';

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

function detectVideoDuration(file: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const total = Math.round(video.duration);
      if (!isFinite(total) || total <= 0) { resolve(''); return; }
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      resolve(h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`);
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
    video.src = url;
  });
}

// Grabs a frame partway into the video (1-3s in, or the midpoint for very
// short clips) and returns it as a JPEG data URL — used to auto-fill the
// thumbnail when the editor hasn't uploaded one of their own.
function captureVideoFrame(file: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const cleanup = () => URL.revokeObjectURL(url);
    video.onloadedmetadata = () => {
      const d = video.duration;
      video.currentTime = isFinite(d) && d > 0 ? Math.min(3, Math.max(1, d * 0.1)) : 0;
    };
    video.onseeked = () => {
      try {
        const maxWidth = 640;
        const scale = video.videoWidth > maxWidth ? maxWidth / video.videoWidth : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(video.videoWidth * scale) || 640;
        canvas.height = Math.round(video.videoHeight * scale) || 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) { cleanup(); resolve(''); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        cleanup();
        resolve(dataUrl);
      } catch {
        cleanup();
        resolve('');
      }
    };
    video.onerror = () => { cleanup(); resolve(''); };
    video.src = url;
  });
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '—';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function copyVideoLink(video: Video) {
  const url = `${window.location.origin}/videos/${slugify(video.title)}`;
  navigator.clipboard.writeText(url).then(
    () => toast.success('Video link copied to clipboard'),
    () => toast.error('Could not copy link')
  );
}

function copyAlbumLink(album: VideoAlbum) {
  const url = `${window.location.origin}/video-albums/${slugify(album.title)}`;
  navigator.clipboard.writeText(url).then(
    () => toast.success('Album link copied to clipboard'),
    () => toast.error('Could not copy link')
  );
}

// ── Video Form Modal ────────────────────────────────────────────────────────
// albumId is fixed context for a *new* video (null = standalone); editing an
// existing video never moves it between albums here.

interface VideoFormProps {
  item?: Video;
  albumId: number | null;
  onClose: () => void;
  onSaved: (item: Video) => void;
}

function VideoFormModal({ item, albumId, onClose, onSaved }: VideoFormProps) {
  const isEdit = !!item;
  const [form, setForm] = useState<VideoInput>({
    title: item?.title ?? '',
    description: item?.description ?? '',
    thumbnail: item?.thumbnail ?? '',
    duration: item?.duration ?? '',
    sortOrder: item?.sortOrder ?? 0,
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoThumbLoading, setAutoThumbLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof VideoInput>(field: K, value: VideoInput[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleFileSelect(f: File) {
    if (!ALLOWED_VIDEO_TYPES.includes(f.type)) {
      setError('Unsupported format. Use MP4, WebM, or MOV.');
      return;
    }
    if (f.size > MAX_VIDEO_BYTES) {
      setError(`Video is too large — max 500MB (this file is ${(f.size / (1024 * 1024)).toFixed(0)}MB).`);
      return;
    }
    setError('');
    setFile(f);
    const duration = await detectVideoDuration(f);
    if (duration) set('duration', duration);

    // Auto-fill the thumbnail from a video frame, but only if the editor
    // hasn't already chosen one themselves.
    let alreadyHasThumbnail = false;
    setForm((cur) => { alreadyHasThumbnail = !!cur.thumbnail; return cur; });
    if (alreadyHasThumbnail) return;

    setAutoThumbLoading(true);
    const frameDataUrl = await captureVideoFrame(f);
    if (frameDataUrl) {
      const { url, error: upErr } = await uploadImage(frameDataUrl);
      if (url && !upErr) {
        const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
        setForm((cur) => (cur.thumbnail ? cur : { ...cur, thumbnail: `${apiBase}${url}` }));
      }
    }
    setAutoThumbLoading(false);
  }

  const busy = uploading || loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEdit && !file) { setError('Select a video file to upload.'); return; }
    setError('');

    if (!isEdit && file) {
      setUploading(true);
      setProgress(0);
      const { uploadUrl, key, error: urlErr } = await requestVideoUploadUrl(file.type, file.size);
      if (urlErr || !uploadUrl || !key) {
        setUploading(false);
        setError(urlErr || 'Could not start upload.');
        return;
      }
      const { error: uploadErr } = await uploadVideoToS3(uploadUrl, file, setProgress);
      setUploading(false);
      if (uploadErr) { setError(uploadErr); return; }

      setLoading(true);
      const result = await createVideo({ ...form, key, fileSize: file.size, albumId });
      setLoading(false);
      if (result.error) { setError(result.error); return; }
      onSaved(result.video!);
      onClose();
      return;
    }

    setLoading(true);
    const result = await updateVideo(item!.id, form);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    onSaved(result.video!);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Video' : 'Add Video'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="v-title">Title</Label>
            <Input id="v-title" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-desc">Description</Label>
            <textarea
              id="v-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Short summary shown under the video…"
            />
          </div>

          <ImageField label="Thumbnail" value={form.thumbnail} onChange={(v) => set('thumbnail', v)} enableLibraryPicker />
          {autoThumbLoading && (
            <p className="text-xs text-muted-foreground -mt-2.5 flex items-center gap-1.5">
              <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Generating a thumbnail from your video…
            </p>
          )}
          {!isEdit && !form.thumbnail && !autoThumbLoading && (
            <p className="text-[10px] text-muted-foreground -mt-2.5">Leave blank and choose a video below — we'll grab a frame automatically.</p>
          )}

          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Video File</Label>
              {!file ? (
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" />Choose video
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-sm rounded-md border border-input px-3 py-2">
                  <VideoIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                  {!uploading && (
                    <Button type="button" aria-label="Remove file" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setFile(null); set('duration', ''); }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                title="Choose video file"
                aria-label="Choose video file"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ''; }}
              />
              <p className="text-[10px] text-muted-foreground">MP4, WebM, or MOV — up to 500MB.</p>
              {uploading && (
                <div className="space-y-1 pt-1">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Uploading… {progress}%</p>
                </div>
              )}
            </div>
          )}

          {(form.duration || isEdit) && (
            <div className="space-y-1.5">
              <Label htmlFor="v-duration">Duration</Label>
              <Input id="v-duration" value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="e.g. 12:34" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="v-order">Sort Order</Label>
            <Input id="v-order" type="number" min={0} value={form.sortOrder} onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:space-x-0">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
              {busy
                ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />{uploading ? `Uploading… ${progress}%` : 'Saving…'}</span>
                : isEdit ? 'Save Changes' : 'Add Video'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Album Form Modal ────────────────────────────────────────────────────────
// Metadata only — videos are added to an album from inside its detail view.

interface AlbumFormProps {
  item?: VideoAlbum;
  onClose: () => void;
  onSaved: (item: VideoAlbum) => void;
}

function AlbumFormModal({ item, onClose, onSaved }: AlbumFormProps) {
  const isEdit = !!item;
  const [form, setForm] = useState<VideoAlbumInput>({
    title: item?.title ?? '',
    description: item?.description ?? '',
    sortOrder: item?.sortOrder ?? 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof VideoAlbumInput>(field: K, value: VideoAlbumInput[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = isEdit ? await updateVideoAlbum(item!.id, form) : await createVideoAlbum(form);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    onSaved(result.album!);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v && !loading) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Album' : 'Add Album'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="va-title">Title</Label>
            <Input id="va-title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Annual Health Summit 2026" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="va-desc">Description</Label>
            <textarea
              id="va-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Short summary shown above the videos…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="va-order">Sort Order</Label>
            <Input id="va-order" type="number" min={0} value={form.sortOrder} onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:space-x-0">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
              {loading
                ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Saving…</span>
                : isEdit ? 'Save Changes' : 'Add Album'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Video Table (shared by the standalone tab and an album's detail view) ──

interface VideoTableProps {
  videos: Video[];
  loading: boolean;
  emptyLabel: string;
  actionLoading: string | null;
  onEdit: (v: Video) => void;
  onDelete: (v: Video) => void;
}

function VideoTable({ videos, loading, emptyLabel, actionLoading, onEdit, onDelete }: VideoTableProps) {
  return (
    <Card className="border-border/60 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[620px]">
          <div className="grid grid-cols-[1fr_7rem_7rem_6.5rem] gap-3 px-5 py-2.5 border-b border-border/60 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            <span>Video</span>
            <span className="text-center">Duration</span>
            <span className="text-center">Size</span>
            <span className="text-right">Actions</span>
          </div>
          <CardContent className="p-0">
            {loading ? (
              <div>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-border/40 last:border-0">
                    <div className="h-9 w-14 rounded bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
                      <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : videos.length === 0 ? (
              <p className="text-sm text-muted-foreground px-5 py-8 text-center">{emptyLabel}</p>
            ) : (
              <div>
                {videos.map((v, idx) => (
                  <div
                    key={v.id}
                    className={`grid grid-cols-[1fr_7rem_7rem_6.5rem] gap-3 items-center px-5 py-3.5 hover:bg-muted/40 transition-colors ${idx < videos.length - 1 ? 'border-b border-border/40' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-14 rounded bg-muted border border-border/60 shrink-0 flex items-center justify-center overflow-hidden">
                        {v.thumbnail
                          ? <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                          : <VideoIcon className="h-4 w-4 text-muted-foreground/40" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{v.title}</p>
                        {v.description && <p className="text-xs text-muted-foreground truncate">{v.description}</p>}
                      </div>
                    </div>

                    <div className="flex justify-center items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />{v.duration || '—'}
                    </div>

                    <div className="text-center text-xs text-muted-foreground">{formatFileSize(v.fileSize)}</div>

                    <div className="flex items-center justify-end gap-1">
                      <Button aria-label="Copy video link" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => copyVideoLink(v)} disabled={actionLoading === `video-${v.id}`}>
                        <LinkIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button aria-label="Edit video" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onEdit(v)} disabled={actionLoading === `video-${v.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button aria-label="Delete video" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(v)} disabled={actionLoading === `video-${v.id}`}>
                        {actionLoading === `video-${v.id}`
                          ? <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function VideoLibraryManagePage() {
  const [albums, setAlbums] = useState<VideoAlbum[]>([]);
  const [standaloneVideos, setStandaloneVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');
  const [tab, setTab] = useState<'albums' | 'standalone'>('albums');
  const [activeAlbumId, setActiveAlbumId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const [videoFormTarget, setVideoFormTarget] = useState<Video | 'new' | null>(null);
  const [albumFormTarget, setAlbumFormTarget] = useState<VideoAlbum | 'new' | null>(null);
  const [deleteVideoTarget, setDeleteVideoTarget] = useState<Video | null>(null);
  const [deleteAlbumTarget, setDeleteAlbumTarget] = useState<VideoAlbum | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const activeAlbum = activeAlbumId ? albums.find((a) => a.id === activeAlbumId) ?? null : null;

  const load = async () => {
    setLoading(true);
    setGlobalError('');
    const [albumsRes, videosRes] = await Promise.all([getVideoAlbums(), getVideos()]);
    if (albumsRes.error) setGlobalError(albumsRes.error);
    else if (videosRes.error) setGlobalError(videosRes.error);
    setAlbums(albumsRes.albums ?? []);
    setStandaloneVideos(videosRes.videos ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredAlbums = albums.filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
  });

  const filteredStandalone = standaloneVideos.filter((v) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q);
  });

  const handleVideoSaved = (saved: Video) => {
    if (saved.albumId) {
      setAlbums((prev) => prev.map((a) => {
        if (a.id !== saved.albumId) return a;
        const idx = a.videos.findIndex((v) => v.id === saved.id);
        const videos = idx >= 0 ? a.videos.map((v) => (v.id === saved.id ? saved : v)) : [saved, ...a.videos];
        return { ...a, videos };
      }));
    } else {
      setStandaloneVideos((prev) => {
        const idx = prev.findIndex((v) => v.id === saved.id);
        return idx >= 0 ? prev.map((v) => (v.id === saved.id ? saved : v)) : [saved, ...prev];
      });
    }
  };

  const handleDeleteVideo = async () => {
    if (!deleteVideoTarget) return;
    const target = deleteVideoTarget;
    setActionLoading(`video-${target.id}`);
    const { error } = await deleteVideo(target.id);
    setActionLoading(null);
    if (error) { setGlobalError(error); setDeleteVideoTarget(null); return; }
    if (target.albumId) {
      setAlbums((prev) => prev.map((a) => (a.id === target.albumId ? { ...a, videos: a.videos.filter((v) => v.id !== target.id) } : a)));
    } else {
      setStandaloneVideos((prev) => prev.filter((v) => v.id !== target.id));
    }
    setDeleteVideoTarget(null);
  };

  const handleAlbumSaved = (saved: VideoAlbum) => {
    setAlbums((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id);
      if (idx >= 0) return prev.map((a) => (a.id === saved.id ? { ...saved, videos: a.videos } : a));
      return [{ ...saved, videos: [] }, ...prev];
    });
  };

  const handleDeleteAlbum = async () => {
    if (!deleteAlbumTarget) return;
    const target = deleteAlbumTarget;
    setActionLoading(`album-${target.id}`);
    const { error } = await deleteVideoAlbum(target.id);
    setActionLoading(null);
    if (error) { setGlobalError(error); setDeleteAlbumTarget(null); return; }
    setAlbums((prev) => prev.filter((a) => a.id !== target.id));
    if (activeAlbumId === target.id) setActiveAlbumId(null);
    setDeleteAlbumTarget(null);
  };

  // ── Album detail view ──
  if (activeAlbum) {
    return (
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveAlbumId(null)} aria-label="Back to albums">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">{activeAlbum.title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{activeAlbum.videos.length} video{activeAlbum.videos.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="gap-2" onClick={() => copyAlbumLink(activeAlbum)}>
            <LinkIcon className="h-3.5 w-3.5" />Copy link
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setAlbumFormTarget(activeAlbum)}>
            <Pencil className="h-3.5 w-3.5" />Edit
          </Button>
          <Button size="sm" onClick={() => setVideoFormTarget('new')} className="gap-2">
            <Plus className="h-4 w-4" />Add Video
          </Button>
        </div>

        {globalError && (
          <div className="flex items-center justify-between rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {globalError}
            <button type="button" aria-label="Dismiss error" onClick={() => setGlobalError('')}><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        <VideoTable
          videos={activeAlbum.videos}
          loading={false}
          emptyLabel='No videos in this album yet. Click "Add Video" to upload one.'
          actionLoading={actionLoading}
          onEdit={setVideoFormTarget}
          onDelete={setDeleteVideoTarget}
        />

        {videoFormTarget !== null && (
          <VideoFormModal
            item={videoFormTarget === 'new' ? undefined : videoFormTarget}
            albumId={activeAlbum.id}
            onClose={() => setVideoFormTarget(null)}
            onSaved={handleVideoSaved}
          />
        )}

        {albumFormTarget !== null && (
          <AlbumFormModal
            item={albumFormTarget === 'new' ? undefined : albumFormTarget}
            onClose={() => setAlbumFormTarget(null)}
            onSaved={handleAlbumSaved}
          />
        )}

        <AlertDialog open={!!deleteVideoTarget} onOpenChange={(v) => { if (!v) setDeleteVideoTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete video?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>"{deleteVideoTarget?.title}"</strong> and remove the file from storage. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteVideo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ── Albums / Standalone tabs ──
  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Video Library</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {albums.length} album{albums.length !== 1 ? 's' : ''} · {standaloneVideos.length} standalone video{standaloneVideos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {tab === 'albums' ? (
            <Button size="sm" onClick={() => setAlbumFormTarget('new')} className="gap-2">
              <Plus className="h-4 w-4" />Add Album
            </Button>
          ) : (
            <Button size="sm" onClick={() => setVideoFormTarget('new')} className="gap-2">
              <Plus className="h-4 w-4" />Add Video
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border/60">
        <button
          type="button"
          onClick={() => setTab('albums')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'albums' ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Albums
        </button>
        <button
          type="button"
          onClick={() => setTab('standalone')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'standalone' ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Standalone Videos
        </button>
      </div>

      <CmsSearchBar value={search} onChange={setSearch} placeholder={tab === 'albums' ? 'Search albums by title or description…' : 'Search videos by title or description…'} />

      {globalError && (
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {globalError}
          <button type="button" aria-label="Dismiss error" onClick={() => setGlobalError('')}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {tab === 'albums' ? (
        <Card className="border-border/60 overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredAlbums.length === 0 ? (
              <p className="text-sm text-muted-foreground px-5 py-8 text-center">
                {albums.length === 0 ? 'No albums yet. Click "Add Album" to get started.' : 'No albums match your search.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
                {filteredAlbums.map((album) => {
                  const cover = album.videos[0]?.thumbnail;
                  return (
                    <button
                      type="button"
                      key={album.id}
                      onClick={() => setActiveAlbumId(album.id)}
                      className="group relative rounded-lg overflow-hidden border border-border/60 bg-muted/30 text-left"
                    >
                      <div className="aspect-square bg-muted flex items-center justify-center">
                        {cover
                          ? <img src={cover} alt={album.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          : <FolderOpen className="h-6 w-6 text-muted-foreground/40" />}
                      </div>
                      <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-black/70 text-white text-[10px] font-semibold px-1.5 py-0.5">
                        <Images className="h-2.5 w-2.5" />{album.videos.length}
                      </span>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end">
                        <div className="w-full p-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-xs font-medium text-white truncate">{album.title}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <span
                              role="button"
                              aria-label="Copy album link"
                              className="h-6 w-6 rounded-md bg-secondary/90 flex items-center justify-center hover:bg-secondary"
                              onClick={(e) => { e.stopPropagation(); copyAlbumLink(album); }}
                            >
                              <LinkIcon className="h-3 w-3" />
                            </span>
                            <span
                              role="button"
                              aria-label="Edit album"
                              className="h-6 w-6 rounded-md bg-secondary/90 flex items-center justify-center hover:bg-secondary"
                              onClick={(e) => { e.stopPropagation(); setAlbumFormTarget(album); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </span>
                            <span
                              role="button"
                              aria-label="Delete album"
                              className="h-6 w-6 rounded-md bg-secondary/90 flex items-center justify-center hover:bg-secondary hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeleteAlbumTarget(album); }}
                            >
                              {actionLoading === `album-${album.id}`
                                ? <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                : <Trash2 className="h-3 w-3" />}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <VideoTable
          videos={filteredStandalone}
          loading={loading}
          emptyLabel={standaloneVideos.length === 0 ? 'No standalone videos yet. Click "Add Video" to upload one.' : 'No videos match your search.'}
          actionLoading={actionLoading}
          onEdit={setVideoFormTarget}
          onDelete={setDeleteVideoTarget}
        />
      )}

      {videoFormTarget !== null && (
        <VideoFormModal
          item={videoFormTarget === 'new' ? undefined : videoFormTarget}
          albumId={null}
          onClose={() => setVideoFormTarget(null)}
          onSaved={handleVideoSaved}
        />
      )}

      {albumFormTarget !== null && (
        <AlbumFormModal
          item={albumFormTarget === 'new' ? undefined : albumFormTarget}
          onClose={() => setAlbumFormTarget(null)}
          onSaved={handleAlbumSaved}
        />
      )}

      <AlertDialog open={!!deleteVideoTarget} onOpenChange={(v) => { if (!v) setDeleteVideoTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete video?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>"{deleteVideoTarget?.title}"</strong> and remove the file from storage. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVideo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAlbumTarget} onOpenChange={(v) => { if (!v) setDeleteAlbumTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete album?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>"{deleteAlbumTarget?.title}"</strong> and all {deleteAlbumTarget?.videos.length ?? 0} video{deleteAlbumTarget?.videos.length !== 1 ? 's' : ''} inside it, removing every file from storage. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAlbum} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
