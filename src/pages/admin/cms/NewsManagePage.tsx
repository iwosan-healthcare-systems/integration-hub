import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, X, ExternalLink, Star, Upload, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getNews, createNews, updateNews, deleteNews, uploadNewsImage,
  type NewsItem, type NewsInput,
} from '@/services/cmsService';

const CATEGORIES = ['Partnership','Milestone','Expansion','Acquisition','Medical Education','Community','Health Advisory','Awards','Infrastructure'];

// ── Image Upload Field ─────────────────────────────────────────────────────

function ImageField({
  value,
  onChange,
  uploading,
  onUpload,
}: {
  value: string;
  onChange: (v: string) => void;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>Image</Label>
      {/* URL input */}
      <Input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://… (paste URL or upload below)"
      />
      {/* Upload button */}
      <div className="flex items-center gap-3">
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
        <span className="text-[10px] text-muted-foreground">JPG, PNG, WebP or GIF · max 7.5 MB</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          title="Upload image"
          aria-label="Upload image"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = '';
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
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <button
            type="button"
            aria-label="Remove image"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── News Form Modal ────────────────────────────────────────────────────────

interface NewsFormProps {
  item?: NewsItem;
  onClose: () => void;
  onSaved: (item: NewsItem) => void;
}

function NewsFormModal({ item, onClose, onSaved }: NewsFormProps) {
  const isEdit = !!item;
  const [form, setForm] = useState<NewsInput>({
    title: item?.title ?? '',
    excerpt: item?.excerpt ?? '',
    content: item?.content ?? '',
    date: item ? toIsoDate(item.date) : '',
    category: item?.category ?? CATEGORIES[0],
    featured: item?.featured ?? false,
    image: item?.image ?? '',
    url: item?.url ?? '',
    sortOrder: item?.sortOrder ?? 0,
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof NewsInput, value: string | boolean | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError('');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const { url, error: uploadError } = await uploadNewsImage(base64);
      setUploading(false);
      if (uploadError) { setError(`Image upload failed: ${uploadError}`); return; }
      if (url) {
        // Server returns a relative path — prepend the API base so the preview works
        const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
        set('image', `${apiBase}${url}`);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = isEdit ? await updateNews(item!.id, form) : await createNews(form);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    onSaved(result.newsItem!);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit News Article' : 'Add News Article'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">

          <div className="space-y-1.5">
            <Label htmlFor="n-title">Title</Label>
            <Input id="n-title" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="n-excerpt">Description</Label>
            <textarea
              id="n-excerpt"
              value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Short summary shown in article cards…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="n-content">
              Article Content
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">optional — for original articles not linking externally</span>
            </Label>
            <textarea
              id="n-content"
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              rows={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              placeholder="Write the full article body here…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="n-date">Date</Label>
              <Input id="n-date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="n-category">Category</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger id="n-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ImageField
            value={form.image}
            onChange={(v) => set('image', v)}
            uploading={uploading}
            onUpload={handleImageUpload}
          />

          <div className="space-y-1.5">
            <Label htmlFor="n-url">Article URL <span className="text-[10px] font-normal text-muted-foreground">optional — leave blank for original content</span></Label>
            <Input id="n-url" value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" />
          </div>

          <div className="flex items-center pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set('featured', e.target.checked)}
                className="h-4 w-4 rounded border-input accent-accent"
              />
              <span className="text-sm font-medium">Featured article</span>
            </label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading
                ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />{isEdit ? 'Saving…' : 'Creating…'}</span>
                : isEdit ? 'Save Changes' : 'Create Article'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toIsoDate(displayDate: string): string {
  const d = new Date(displayDate);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function NewsManagePage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');
  const [formTarget, setFormTarget] = useState<NewsItem | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setGlobalError('');
    const { news: data, error } = await getNews();
    if (error) setGlobalError(error);
    else setNews(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (saved: NewsItem) => {
    setNews((prev) => {
      const idx = prev.findIndex((n) => n.id === saved.id);
      if (idx >= 0) return prev.map((n) => (n.id === saved.id ? saved : n));
      // Insert new item in date-sorted position
      return [saved, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    const { error } = await deleteNews(deleteTarget.id);
    setActionLoading(null);
    if (error) { setGlobalError(error); setDeleteTarget(null); return; }
    setNews((prev) => prev.filter((n) => n.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">News & Announcements</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{news.length} article{news.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setFormTarget('new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Article
          </Button>
        </div>
      </div>

      {globalError && (
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {globalError}
          <button type="button" aria-label="Dismiss error" onClick={() => setGlobalError('')}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <Card className="border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            {/* Header */}
            <div className="grid grid-cols-[2rem_1fr_9rem_6rem_4.5rem] gap-4 px-5 py-2.5 border-b border-border/60 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              <span />
              <span>Article</span>
              <span className="text-center">Category</span>
              <span className="text-center">Date</span>
              <span className="text-right">Actions</span>
            </div>
            <CardContent className="p-0">
              {loading ? (
                <div>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-border/40 last:border-0">
                      <div className="h-8 w-8 rounded bg-muted animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : news.length === 0 ? (
                <p className="text-sm text-muted-foreground px-5 py-8 text-center">No articles yet. Click "Add Article" to get started.</p>
              ) : (
                <div>
                  {news.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`grid grid-cols-[2rem_1fr_9rem_6rem_4.5rem] gap-4 items-center px-5 py-3.5 hover:bg-muted/40 transition-colors ${idx < news.length - 1 ? 'border-b border-border/40' : ''}`}
                    >
                      {/* Thumbnail */}
                      <div className="h-8 w-8 rounded overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                        {item.image
                          ? <img src={item.image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          : <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/40" />}
                      </div>

                      {/* Title */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {item.featured && <Star className="h-3 w-3 text-amber-500 shrink-0" />}
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        </div>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors">
                            <ExternalLink className="h-2.5 w-2.5" /> View article
                          </a>
                        )}
                        {item.content && !item.url && (
                          <span className="text-[10px] text-muted-foreground/60 italic">Original content</span>
                        )}
                      </div>

                      {/* Category */}
                      <div className="flex justify-center">
                        <Badge variant="secondary" className="text-[10px] max-w-full truncate">{item.category}</Badge>
                      </div>

                      {/* Date */}
                      <p className="text-xs text-muted-foreground text-center">{item.date}</p>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1">
                        <Button aria-label="Edit article" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setFormTarget(item)} disabled={actionLoading === item.id}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button aria-label="Delete article" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(item)} disabled={actionLoading === item.id}>
                          {actionLoading === item.id
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

      {formTarget !== null && (
        <NewsFormModal
          item={formTarget === 'new' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete article?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>"{deleteTarget?.title}"</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
